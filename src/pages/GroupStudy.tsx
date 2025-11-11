import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Users, ArrowLeft, Plus, MessageSquare, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GroupStudy = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionSubject, setNewSessionSubject] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
    loadNotes();
  }, []);

  const loadSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('group_study_sessions')
      .select('*')
      .or(`created_by.eq.${user.id}`);

    setSessions(data || []);
  };

  const loadNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id);

    setNotes(data || []);
  };

  const createSession = async () => {
    if (!newSessionTitle || !newSessionSubject) {
      toast({
        title: "Missing information",
        description: "Please provide title and subject",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('group_study_sessions')
      .insert({
        title: newSessionTitle,
        subject: newSessionSubject,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating session",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Session created",
      description: "Your group study session has been created",
    });

    setNewSessionTitle("");
    setNewSessionSubject("");
    loadSessions();
  };

  const addNoteToSession = async () => {
    if (!selectedNote || !selectedSession) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('group_study_notes')
      .insert({
        session_id: selectedSession.id,
        note_id: selectedNote,
        added_by: user?.id
      });

    if (error) {
      toast({
        title: "Error adding note",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Note added",
      description: "Note has been added to the group session",
    });
    setSelectedNote("");
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedSession) return;

    setLoading(true);
    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Get all notes for this session
      const { data: sessionNotes } = await supabase
        .from('group_study_notes')
        .select('note_id')
        .eq('session_id', selectedSession.id);

      const noteIds = sessionNotes?.map(sn => sn.note_id) || [];
      
      const { data: notesData } = await supabase
        .from('notes')
        .select('content')
        .in('id', noteIds);

      const combinedContext = notesData?.map(n => n.content).filter(c => c).join('\n\n') || '';

      // Use fetch for streaming instead of invoke
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userMessage }],
            noteContext: combinedContext
          })
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                // Update the last message in real-time
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      // Remove the failed messages
      setMessages(prev => prev.slice(0, -2));
      setInput(userMessage);
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
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Group Study</h1>
              <p className="text-muted-foreground">Collaborate with classmates on shared materials</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create Session</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Session Title"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                  />
                  <Input
                    placeholder="Subject"
                    value={newSessionSubject}
                    onChange={(e) => setNewSessionSubject(e.target.value)}
                  />
                  <Button onClick={createSession} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sessions.map(session => (
                    <Button
                      key={session.id}
                      variant={selectedSession?.id === session.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedSession(session);
                        setMessages([]);
                      }}
                    >
                      {session.title}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              {selectedSession ? (
                <>
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle>Add Notes to Session</CardTitle>
                      <CardDescription>{selectedSession.title} - {selectedSession.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Select value={selectedNote} onValueChange={setSelectedNote}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a note" />
                        </SelectTrigger>
                        <SelectContent>
                          {notes.map(note => (
                            <SelectItem key={note.id} value={note.id}>
                              {note.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addNoteToSession} disabled={!selectedNote}>
                        Add Note
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Chat</CardTitle>
                      <CardDescription>Ask questions based on all shared notes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96 overflow-y-auto mb-4 space-y-4">
                        {messages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Ask a question..."
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <Button onClick={sendMessage} disabled={loading}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select or create a session to start collaborating
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GroupStudy;
