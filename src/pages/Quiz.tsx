import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Target, Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

const Quiz = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id);

    setNotes(data || []);
  };

  const generateQuiz = async () => {
    if (!selectedNote) {
      toast({
        title: "No note selected",
        description: "Please select a note to generate quiz",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const note = notes.find(n => n.id === selectedNote);
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { noteContent: note.content }
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      
      // Create quiz record
      const { data: quizData } = await supabase
        .from('quizzes')
        .insert({
          user_id: user?.id,
          note_id: selectedNote,
          title: `${note.title} Quiz`
        })
        .select()
        .single();

      // Create question records
      const questionsWithQuizId = data.questions.map((q: any) => ({
        ...q,
        quiz_id: quizData.id
      }));

      await supabase.from('quiz_questions').insert(questionsWithQuizId);

      setQuestions(data.questions);
      setQuizStarted(true);
      setCurrentQuestion(0);
      setScore(0);
      setWeakTopics([]);
    } catch (error: any) {
      toast({
        title: "Error generating quiz",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedAnswer) return;

    const question = questions[currentQuestion];
    const isCorrect = selectedAnswer === question.correct_answer;

    if (!isCorrect) {
      setWeakTopics(prev => [...prev, question.topic]);
    } else {
      setScore(prev => prev + 1);
    }

    // Save attempt
    const { data: { user } } = await supabase.auth.getUser();
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('id')
      .eq('note_id', selectedNote)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    await supabase.from('quiz_attempts').insert({
      quiz_id: quizData.id,
      question_id: question.id,
      user_id: user?.id,
      user_answer: selectedAnswer,
      is_correct: isCorrect
    });

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer("");
    } else {
      setQuizCompleted(true);
      
      // Save weak topics
      if (weakTopics.length > 0) {
        const uniqueTopics = [...new Set(weakTopics)];
        for (const topic of uniqueTopics) {
          await supabase.from('weak_topics').upsert({
            user_id: user?.id,
            topic,
            incorrect_count: 1
          }, {
            onConflict: 'user_id,topic'
          });
        }

        toast({
          title: "Weak topics detected",
          description: `We identified topics you should review: ${uniqueTopics.join(', ')}`,
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Take Quiz</h1>
              <p className="text-muted-foreground">Test your knowledge and identify weak topics</p>
            </div>
          </div>

          {!quizStarted ? (
            <Card>
              <CardHeader>
                <CardTitle>Start Quiz</CardTitle>
                <CardDescription>Select a note to generate questions from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedNote} onValueChange={setSelectedNote}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a note" />
                  </SelectTrigger>
                  <SelectContent>
                    {notes.map(note => (
                      <SelectItem key={note.id} value={note.id}>
                        {note.title} - {note.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={generateQuiz} disabled={loading || !selectedNote} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    'Generate Quiz'
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : quizCompleted ? (
            <Card>
              <CardHeader>
                <CardTitle>Quiz Completed!</CardTitle>
                <CardDescription>Here are your results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {score}/{questions.length}
                  </div>
                  <p className="text-muted-foreground">Correct Answers</p>
                </div>

                {weakTopics.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-destructive" />
                      Topics to Review
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set(weakTopics)].map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={() => {
                  setQuizStarted(false);
                  setQuizCompleted(false);
                  setQuestions([]);
                  setSelectedNote("");
                }} className="w-full">
                  Take Another Quiz
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Question {currentQuestion + 1} of {questions.length}</CardTitle>
                <CardDescription>Topic: {questions[currentQuestion]?.topic}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg font-medium">{questions[currentQuestion]?.question}</p>

                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                  {questions[currentQuestion]?.options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent/50">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <Button onClick={submitAnswer} disabled={!selectedAnswer} className="w-full">
                  {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Quiz;
