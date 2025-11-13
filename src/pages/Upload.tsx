import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Upload as UploadIcon, FileText } from "lucide-react";
import { Session, User } from "@supabase/supabase-js";
import { extractTextFromFile } from "@/utils/textExtractor";

const Upload = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  
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
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        if (!title) {
          setTitle(selectedFile.name.split('.')[0]);
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, DOC, or TXT file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setExtractingText(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file first
      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Extract text from file using client-side extractor
      let extractedText = '';
      
      try {
        extractedText = await extractTextFromFile(file);
        console.log('Text extracted successfully, length:', extractedText.length);
      } catch (extractError) {
        console.error('Text extraction failed:', extractError);
        toast({
          title: "Text extraction issue",
          description: "Couldn't extract text from file. You can still upload, but AI features may not work.",
        });
      }
      
      setExtractingText(false);

      // Save to database with extracted text
      const { error: dbError } = await supabase
        .from('notes')
        .insert([{
          user_id: user.id,
          title: title || file.name,
          file_path: fileName,
          file_type: file.type,
          subject: subject || null,
          content: extractedText || null,
        }]);

      if (dbError) throw dbError;

      const successMessage = extractedText 
        ? "Your notes have been uploaded and text extracted successfully"
        : "Your notes have been uploaded (text extraction pending)";

      toast({
        title: "Success!",
        description: successMessage,
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setExtractingText(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <UploadIcon className="w-6 h-6 text-primary" />
              Upload Study Notes
            </CardTitle>
            <CardDescription>
              Upload your notes in PDF, DOC, or TXT format. Text will be automatically extracted for AI features like summarization and quizzes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">Select File *</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {file ? (
                    <p className="text-sm font-medium">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">Click to upload</p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, or TXT</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter a title for your notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics, Physics, Computer Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={!file || !title || uploading}
              className="w-full"
              size="lg"
            >
              {extractingText ? "Extracting text..." : uploading ? "Uploading..." : "Upload Notes"}
            </Button>
            
            {extractingText && (
              <p className="text-sm text-muted-foreground text-center">
                Extracting text from your file for AI features...
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Upload;
