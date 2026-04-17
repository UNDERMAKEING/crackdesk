import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Upload, X, Loader2, Target, Camera, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { callInterviewAI, parseAIJson } from "@/lib/interviewAI";

const SYSTEM_PROMPT = `You are an expert technical interviewer. Analyze the job description and resume provided and return ONLY a valid JSON object with zero markdown, zero explanation, zero extra text. The JSON must follow this exact structure: { "role": "job role title", "level": "Junior or Mid or Senior", "focus_areas": ["area1","area2","area3"], "questions": [ {"id":1,"text":"question text","type":"behavioral or technical or situational","hint":"what a good answer should cover"} ] } — generate exactly 8 questions tailored specifically to the candidate's resume against the JD requirements, mixing all three types.`;

const chips = [
  { icon: Target, text: "8 tailored questions" },
  { icon: Camera, text: "Camera + mic proctored" },
  { icon: BarChart3, text: "Full AI score report" },
];

// Extract text from PDF using pdf.js CDN
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    // Dynamically load pdf.js if not already loaded
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load pdf.js"));
      document.head.appendChild(script);
    });
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText.trim();
}

export default function InterviewSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jd, setJd] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = async (file: File) => {
    setFileLoading(true);
    setError("");
    try {
      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(file);
        if (!text || text.length < 20) {
          setError("Could not extract text from this PDF. Please paste your resume as text instead.");
          return;
        }
        setResumeText(text);
        setFileName(file.name);
      } else {
        // For .txt, .doc files — read as plain text
        const reader = new FileReader();
        reader.onload = (e) => {
          setResumeText(e.target?.result as string);
          setFileName(file.name);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setError("Failed to read file. Please paste your resume as text instead.");
    } finally {
      setFileLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const removeFile = () => {
    setFileName("");
    setResumeText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStart = async () => {
    setError("");
    if (jd.trim().length < 20) {
      setError("Please paste a complete job description (at least 20 characters).");
      return;
    }
    if (resumeText.trim().length < 20) {
      setError("Please upload or paste your resume (at least 20 characters).");
      return;
    }

    setLoading(true);
    try {
      const raw = await callInterviewAI({
        action: "generate_plan",
        systemPrompt: SYSTEM_PROMPT,
        userMessage: `JD:\n${jd}\n\nResume:\n${resumeText}`,
        maxTokens: 1500,
      });

      const plan = parseAIJson(raw);
      sessionStorage.setItem("iv_plan", JSON.stringify(plan));
      sessionStorage.setItem("iv_jd", jd);
      sessionStorage.setItem("iv_resume", resumeText);
      navigate("/ai-interview/room");
    } catch (err: any) {
      setError(err.message || "Failed to generate interview plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Badge className="gradient-primary text-primary-foreground mb-4 text-sm px-4 py-1.5">
            🤖 AI Interview Simulator
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Your Personal Interview Coach
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Paste the JD and your resume. AI builds a custom interview, asks 8 questions live, then gives a full performance report.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {chips.map((c) => (
              <div key={c.text} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
                <c.icon className="h-4 w-4" />
                {c.text}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Job Description
                {jd.length > 50 && <CheckCircle className="h-5 w-5 text-green-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={6}
                placeholder="Paste the full job description here..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                className="resize-none"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Your Resume
                {resumeText.length > 50 && <CheckCircle className="h-5 w-5 text-green-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {fileLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Reading PDF...</span>
                  </div>
                ) : fileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-medium text-foreground">{fileName}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
                      className="p-1 rounded-full hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop your resume here or <span className="text-primary font-medium">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground">.txt, .pdf supported</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or paste text</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Textarea
                rows={6}
                placeholder="Paste your resume text here..."
                value={resumeText}
                onChange={(e) => { setResumeText(e.target.value); setFileName(""); }}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          <Button
            onClick={handleStart}
            disabled={loading || fileLoading}
            variant="hero"
            className="w-full h-14 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                AI is building your interview...
              </>
            ) : (
              "🚀 Start AI Interview"
            )}
          </Button>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

