import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare, Brain, Target, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const History = () => {
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load chat sessions
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    setChatSessions(sessions || []);

    // Load summaries
    const { data: summaryData } = await supabase
      .from('summaries')
      .select('*, notes(title, subject)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setSummaries(summaryData || []);

    // Load quizzes
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*, notes(title, subject)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setQuizzes(quizData || []);

    // Load weak topics
    const { data: topicsData } = await supabase
      .from('weak_topics')
      .select('*')
      .eq('user_id', user.id)
      .order('incorrect_count', { ascending: false });

    setWeakTopics(topicsData || []);
  };

  const viewChatSession = (sessionId: string) => {
    navigate(`/chat?session=${sessionId}`);
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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">History</h1>

          <Tabs defaultValue="chats" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chats">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chats
              </TabsTrigger>
              <TabsTrigger value="summaries">
                <Brain className="w-4 h-4 mr-2" />
                Summaries
              </TabsTrigger>
              <TabsTrigger value="quizzes">
                <Target className="w-4 h-4 mr-2" />
                Quizzes
              </TabsTrigger>
              <TabsTrigger value="weak-topics">
                <AlertCircle className="w-4 h-4 mr-2" />
                Weak Topics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="space-y-4">
              {chatSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No chat sessions yet
                  </CardContent>
                </Card>
              ) : (
                chatSessions.map(session => (
                  <Card key={session.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => viewChatSession(session.id)}>
                    <CardHeader>
                      <CardTitle>{session.title || 'Untitled Session'}</CardTitle>
                      <CardDescription>
                        {format(new Date(session.updated_at), 'PPp')}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="summaries" className="space-y-4">
              {summaries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No summaries generated yet
                  </CardContent>
                </Card>
              ) : (
                summaries.map(summary => (
                  <Card key={summary.id}>
                    <CardHeader>
                      <CardTitle>{summary.notes?.title}</CardTitle>
                      <CardDescription>
                        {summary.notes?.subject} • Complexity: {summary.complexity} • {format(new Date(summary.created_at), 'PPp')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-3">{summary.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-4">
              {quizzes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No quizzes taken yet
                  </CardContent>
                </Card>
              ) : (
                quizzes.map(quiz => (
                  <Card key={quiz.id}>
                    <CardHeader>
                      <CardTitle>{quiz.title}</CardTitle>
                      <CardDescription>
                        {quiz.notes?.subject} • {format(new Date(quiz.created_at), 'PPp')}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="weak-topics" className="space-y-4">
              {weakTopics.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No weak topics identified yet
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {weakTopics.map(topic => (
                    <Card key={topic.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{topic.topic}</CardTitle>
                        <CardDescription>
                          Incorrect answers: {topic.incorrect_count} • Last attempted: {format(new Date(topic.last_attempted), 'PP')}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default History;
