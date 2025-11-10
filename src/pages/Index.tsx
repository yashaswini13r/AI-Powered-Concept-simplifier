import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BookOpen, Brain, MessageSquare, Users, Target, History } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: "Doubt Clarification",
      description: "Get instant answers to your questions based on your uploaded notes",
    },
    {
      icon: BookOpen,
      title: "Smart Summarization",
      description: "Generate summaries in simple, moderate, or complex levels",
    },
    {
      icon: Target,
      title: "Adaptive Quizzes",
      description: "Take quizzes that detect your weak topics and help you improve",
    },
    {
      icon: Users,
      title: "Group Study Mode",
      description: "Collaborate with classmates by combining multiple notes",
    },
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Advanced AI understands your study materials and adapts to your needs",
    },
    {
      icon: History,
      title: "Complete History",
      description: "Track all your interactions and learning progress over time",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block">
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  AI-Powered Learning Platform
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Study Smarter with{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  AI Assistance
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Upload your notes, get instant doubt clarification, adaptive quizzes, and collaborate with your peers - all powered by advanced AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg shadow-glow hover:shadow-lg transition-all"
                  onClick={() => navigate('/auth')}
                >
                  Get Started
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
              <img 
                src={heroImage} 
                alt="Students studying with AI technology" 
                className="relative rounded-2xl shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Excel</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to enhance your learning experience
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-8 bg-card rounded-xl border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 w-14 h-14 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-primary rounded-2xl p-12 text-center text-white shadow-glow">
            <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Study Experience?</h2>
            <p className="text-xl mb-8 opacity-90">Join thousands of students already learning smarter</p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg shadow-md hover:shadow-lg transition-all"
              onClick={() => navigate('/auth')}
            >
              Start Learning Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
