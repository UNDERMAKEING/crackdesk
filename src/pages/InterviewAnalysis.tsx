import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { callInterviewAI, parseAIJson } from "@/lib/interviewAI";

interface QuestionScore { id: number; score: number; feedback: string; keyword_hits: string[]; }
interface AnalysisResult {
  overall_score: number; overall_grade: string; summary: string;
  hire_recommendation: string; strengths: string[]; improvements: string[];
  question_scores: QuestionScore[]; integrity_note: string;
}

const ANALYSIS_PROMPT = `You are an expert interview evaluator. Analyze the interview and return ONLY valid JSON with zero markdown: { "overall_score": number 0-100, "overall_grade": "A+ or A or B+ or B or C or D", "summary": "2-3 sentence assessment", "hire_recommendation": "Strong Hire or Hire or Maybe or No Hire", "strengths": ["s1","s2","s3"], "improvements": ["i1","i2"], "question_scores": [ {"id":1,"score":0-10,"feedback":"specific feedback on this answer","keyword_hits":["word1","word2"]} ], "integrity_note": "comment on tab violations if any, or empty string if none" }`;

export default function InterviewAnalysis() {
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const planRaw = sessionStorage.getItem("iv_plan");
    const answersRaw = sessionStorage.getItem("iv_answers");
    const violationsRaw = sessionStorage.getItem("iv_violations");
    const durationRaw = sessionStorage.getItem("iv_duration");

    if (!planRaw || !answersRaw) { navigate("/ai-interview"); return; }

    const plan = JSON.parse(planRaw);
    const ans = JSON.parse(answersRaw);
    const viols = violationsRaw ? JSON.parse(violationsRaw) : [];
    const dur = Number(durationRaw) || 0;
    setAnswers(ans);
    setViolations(viols);
    setDuration(dur);

    const qaText = ans.map((a: any, i: number) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join("\n\n");
    const userMsg = `Role: ${plan.role} (${plan.level})\nFocus areas: ${plan.focus_areas.join(", ")}\nTab violations: ${viols.length}\nDuration: ${dur} seconds\nQ&A:\n${qaText}`;

    callInterviewAI({ action: "analyze", systemPrompt: ANALYSIS_PROMPT, userMessage: userMsg, maxTokens: 2000 })
      .then((raw) => { setResult(parseAIJson(raw)); setLoading(false); })
      .catch(() => {
        setResult({ overall_score: 0, overall_grade: "N/A", summary: "Analysis failed. Please try again.", hire_recommendation: "N/A", strengths: [], improvements: [], question_scores: [], integrity_note: "" });
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium text-foreground">Generating your performance report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const scoreBg = result.overall_score >= 75 ? "from-green-500 to-emerald-600" : result.overall_score >= 50 ? "from-amber-500 to-orange-600" : "from-red-500 to-rose-600";
  const scoreBarColor = (s: number) => s >= 7 ? "bg-green-500" : s >= 5 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-4xl space-y-8">
        {/* HERO BANNER */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`bg-gradient-to-br ${scoreBg} border-0 text-white overflow-hidden`}>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <motion.div
                  className="text-6xl md:text-7xl font-display font-bold"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {result.overall_score}%
                </motion.div>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-3">
                    <span className="rounded-full bg-white/20 px-4 py-1 text-sm font-bold">{result.overall_grade}</span>
                    <span className="rounded-full bg-white/20 px-4 py-1 text-sm font-bold">{result.hire_recommendation}</span>
                  </div>
                  <p className="text-white/90 text-sm">{result.summary}</p>
                  <div className="flex gap-4 mt-3 text-xs text-white/70">
                    <span>⏱ {Math.floor(duration / 60)}m {duration % 60}s</span>
                    <span>⚠️ {violations.length} violation{violations.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Overall Score", value: `${result.overall_score}%` },
            { label: "Grade", value: result.overall_grade },
            { label: "Questions Done", value: `${answers.length}/8` },
            { label: "Tab Violations", value: String(violations.length), alert: violations.length > 0 },
          ].map((s) => (
            <Card key={s.label} className={s.alert ? "border-destructive/30 bg-destructive/5" : ""}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* STRENGTHS & IMPROVEMENTS */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader><CardTitle className="text-base text-green-800">💪 Strengths</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <span>✓</span><span>{s}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader><CardTitle className="text-base text-amber-800">📈 Areas to Improve</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.improvements.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <span>→</span><span>{s}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* QUESTION BREAKDOWN */}
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Question Breakdown</h2>
          <div className="space-y-4">
            {result.question_scores.map((qs, i) => {
              const a = answers[i];
              return (
                <Card key={qs.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <p className="text-sm font-medium text-foreground flex-1">{a?.question}</p>
                    </div>
                    {a?.answer && (
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground italic">"{a.answer}"</p>
                      </div>
                    )}
                    <p className="text-sm text-foreground">{qs.feedback}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBarColor(qs.score)}`} style={{ width: `${qs.score * 10}%` }} />
                      </div>
                      <span className="text-sm font-bold text-foreground">{qs.score}/10</span>
                    </div>
                    {qs.keyword_hits?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {qs.keyword_hits.map((kw, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* INTEGRITY REPORT */}
        {violations.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader><CardTitle className="text-base text-destructive">⚠️ Integrity Report</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{violations.length} tab violation{violations.length !== 1 ? "s" : ""} detected:</p>
              <ul className="space-y-1">
                {violations.map((v: any, i: number) => (
                  <li key={i} className="text-sm text-foreground">Question {v.qNum} at {v.time}</li>
                ))}
              </ul>
              {result.integrity_note && <p className="text-sm text-muted-foreground italic mt-2">{result.integrity_note}</p>}
            </CardContent>
          </Card>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate("/ai-interview")} variant="hero" className="flex-1">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

