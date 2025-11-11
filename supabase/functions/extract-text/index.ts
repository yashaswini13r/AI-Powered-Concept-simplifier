import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('notes')
      .download(filePath);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw downloadError;
    }

    // Get file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    let extractedText = '';

    if (extension === 'txt') {
      // Extract text from TXT
      extractedText = await fileData.text();
    } else if (extension === 'pdf') {
      // For PDFs, use a simple extraction or return a message
      // Note: Full PDF parsing would require additional libraries
      // For now, we'll return a placeholder and recommend users use TXT or DOC
      extractedText = 'PDF text extraction requires additional setup. Please convert your PDF to TXT or upload as DOC format for best results.';
    } else if (extension === 'doc' || extension === 'docx') {
      // For DOC files, similar limitation
      extractedText = 'DOC text extraction requires additional setup. Please convert your document to TXT format for best results.';
    } else {
      extractedText = 'Unsupported file format. Please upload TXT files for automatic text extraction.';
    }

    return new Response(JSON.stringify({ text: extractedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Text extraction error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
