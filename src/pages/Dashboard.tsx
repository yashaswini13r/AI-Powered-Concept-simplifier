import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { 
  BookOpen, 
  MessageSquare, 
  FileUp, 
  Target, 
  Users, 
  LogOut,
  Brain,
  History as HistoryIcon
} from "lucide-react";
import { Session, User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
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
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      const { count } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setNotesCount(count || 0);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
  };

  const features = [
    {
      icon: FileUp,
      title: "Upload Notes",
      description: "Upload your study materials in PDF, DOC, or TXT format",
      action: () => navigate('/upload'),
      color: "bg-primary",
    },
    {
      icon: MessageSquare,
      title: "Ask Questions",
      description: "Get instant answers based on your uploaded notes",
      action: () => navigate('/chat'),
      color: "bg-secondary",
    },
    {
      icon: Brain,
      title: "Summarize",
      description: "Generate smart summaries at different complexity levels",
      action: () => navigate('/summarize'),
      color: "bg-accent",
    },
    {
      icon: Target,
      title: "Take Quiz",
      description: "Test your knowledge and identify weak topics",
      action: () => navigate('/quiz'),
      color: "bg-primary",
    },
    {
      icon: Users,
      title: "Group Study",
      description: "Collaborate with classmates on shared materials",
      action: () => navigate('/group-study'),
      color: "bg-secondary",
    },
    {
      icon: HistoryIcon,
      title: "History",
      description: "View all your past interactions and progress",
      action: () => navigate('/history'),
      color: "bg-accent",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Smart Study Partner</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {profile?.username || 'Student'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {profile?.username}!
          </h1>
          <p className="text-xl text-muted-foreground">
            {profile?.branch?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} • 
            {' '}Semester {profile?.semester?.replace('semester_', '')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{notesCount}</CardTitle>
              <CardDescription>Uploaded Notes</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">0</CardTitle>
              <CardDescription>Quizzes Taken</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">0</CardTitle>
              <CardDescription>Study Sessions</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">What would you like to do?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                onClick={feature.action}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
