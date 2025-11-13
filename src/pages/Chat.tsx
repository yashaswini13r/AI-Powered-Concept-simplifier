import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Send, BookOpen } from "lucide-react";
import { Session, User } from "@supabase/supabase-js";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
}

const Chat = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate('/auth');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/auth');
      } else {
        createNewSession(session.user.id);
        loadNotes(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadNotes = async (userId: string) => {
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, content, subject')
      .eq('user_id', userId);

    if (data) {
      setNotes(data);
    }
  };

  const createNewSession = async (userId: string) => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([{ user_id: userId, title: 'New Chat' }])
      .select()
      .single();

    if (data) {
      setSessionId(data.id);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user || !sessionId) return;

    await supabase
      .from('chat_messages')
      .insert([{
        session_id: sessionId,
        user_id: user.id,
        role,
        content,
      }]);
  };

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    
    const selectedNote = notes.find(n => n.id === selectedNoteId);
    const noteContext = selectedNote ? selectedNote.content : '';
    
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: [...messages, { role: 'user', content: userMessage }],
        noteContext,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to start stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantMessage = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantMessage += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantMessage } : m
                );
              }
              return [...prev, { role: 'assistant', content: assistantMessage }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    await saveMessage('assistant', assistantMessage);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    if (!selectedNoteId) {
      toast({
        title: "Select a note",
        description: "Please select a note to ask questions about.",
        variant: "destructive",
      });
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    await saveMessage('user', userMessage);

    try {
      await streamChat(userMessage);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">AI Tutor Chat</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl">
        <div className="mb-4">
          <Select value={selectedNoteId} onValueChange={setSelectedNoteId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a note to discuss" />
            </SelectTrigger>
            <SelectContent>
              {notes.map((note) => (
                <SelectItem key={note.id} value={note.id}>
                  {note.title} - {note.subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 && (
            <Card className="p-8 text-center bg-gradient-card">
              <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Start a Conversation</h2>
              <p className="text-muted-foreground">
                Select a note above and ask questions about your study materials.
              </p>
            </Card>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border rounded-2xl px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
