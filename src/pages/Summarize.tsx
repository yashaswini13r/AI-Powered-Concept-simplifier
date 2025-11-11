import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Loader2, ArrowLeft } from "lucide-react";

const Summarize = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState("");
  const [complexity, setComplexity] = useState<"simple" | "moderate" | "complex">("moderate");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading notes",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNotes(data || []);
  };

  const generateSummary = async () => {
    if (!selectedNote) {
      toast({
        title: "No note selected",
        description: "Please select a note to summarize",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSummary("");

    try {
      const note = notes.find(n => n.id === selectedNote);
      const { data, error } = await supabase.functions.invoke('summarize', {
        body: { 
          noteContent: note.content,
          complexity 
        }
      });

      if (error) throw error;

      setSummary(data.summary);

      // Save summary
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('summaries').insert({
        user_id: user?.id,
        note_id: selectedNote,
        content: data.summary,
        complexity
      });

      toast({
        title: "Summary generated",
        description: "Your summary has been created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error generating summary",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Summarize Notes</h1>
              <p className="text-muted-foreground">Generate summaries at different complexity levels</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Note & Complexity</CardTitle>
              <CardDescription>Choose a note and the complexity level for the summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Note</label>
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
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Complexity Level</label>
                <Select value={complexity} onValueChange={(value: any) => setComplexity(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple - Easy to understand, basic concepts</SelectItem>
                    <SelectItem value="moderate">Moderate - Balanced detail and clarity</SelectItem>
                    <SelectItem value="complex">Complex - Detailed, technical explanation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={generateSummary} disabled={loading || !selectedNote} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Summary'
                )}
              </Button>
            </CardContent>
          </Card>

          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Complexity: {complexity}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-foreground">{summary}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Summarize;
