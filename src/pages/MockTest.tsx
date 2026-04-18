import { useState, useEffect, useCallback, useRef } from "react";
import jsPDF from "jspdf";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock, CheckCircle2, XCircle, Download, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { generateQuestionsFromJD, type GeneratedQuestion } from "@/lib/gemini";
import { supabase } from "@/integrations/supabase/client";

type Phase = "input" | "quiz" | "results";

export default function MockTest() {
  const [phase, setPhase] = useState<Phase>("input");
  const [jd, setJd] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(1200);
  const [isGenerating, setIsGenerating] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const warnedRef = useRef(false);

  const handleGenerate = async () => {
    if (!jd.trim()) return;
    setIsGenerating(true);
    try {
      const qs = await generateQuestionsFromJD(jd);
      setQuestions(qs);
      setAnswers(Array.from({ length: qs.length }, () => null));
      setCurrent(0);
      setTimeLeft(1200);
      warnedRef.current = false;
      setStartTime(Date.now());
      setPhase("quiz");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const finishTest = useCallback(async () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    setTimeTaken(elapsed);
    setPhase("results");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const finalScore = answers.reduce((acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0), 0);
      const title = jd.trim().slice(0, 80) + (jd.length > 80 ? "…" : "");
      const { error } = await supabase.from("test_results").insert({
        user_id: session.user.id,
        test_title: title,
        sector: "AI Mock Test",
        level: finalScore / questions.length >= 0.8 ? "Advanced" : finalScore / questions.length >= 0.5 ? "Intermediate" : "Beginner",
        score: finalScore,
        total_questions: questions.length,
        time_taken: elapsed,
      });
      if (error) console.error("[MockTest] Failed to save:", error.message);
    } catch (e: any) {
      console.error("[MockTest] Save error:", e.message);
    }
  }, [startTime, answers, questions, jd]);

  useEffect(() => {
    if (phase !== "quiz") return;
    if (timeLeft <= 0) { finishTest(); return; }
    if (timeLeft === 60 && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning("Only 1 minute remaining!", {
        icon: <AlertTriangle className="h-4 w-4 text-warning" />,
        duration: 5000,
      });
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, finishTest]);

  const selectAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[current] = optionIndex;
    setAnswers(newAnswers);
  };

  const score = answers.reduce((acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0), 0);
  const wrongCount = answers.reduce((acc, a, i) => acc + (a !== null && a !== questions[i]?.correct ? 1 : 0), 0);
  const unanswered = answers.filter((a) => a === null).length;
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;

  const skillBreakdown = () => {
    const map: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, i) => {
      if (!map[q.skill]) map[q.skill] = { correct: 0, total: 0 };
      map[q.skill].total++;
      if (answers[i] === q.correct) map[q.skill].correct++;
    });
    return Object.entries(map).map(([skill, { correct, total }]) => ({
      skill, correct, total,
      pct: Math.round((correct / total) * 100),
    }));
  };

  const strongAreas = () => skillBreakdown().filter((s) => s.pct >= 70).map((s) => s.skill);
  const weakAreas = () => skillBreakdown().filter((s) => s.pct < 70).map((s) => s.skill);
  const formatTimeTaken = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const isWarningTime = timeLeft <= 60;

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210;
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, "F");
    doc.setFillColor(20, 20, 20); doc.rect(0, 0, 28, H, "F");
    doc.setDrawColor(197, 160, 80); doc.setLineWidth(5);
    doc.ellipse(14, H / 2, 20, 55, "S");
    doc.setDrawColor(197, 160, 80); doc.setLineWidth(2.5);
    doc.rect(4, 4, W - 8, H - 8, "S");
    doc.setLineWidth(0.5); doc.rect(8, 8, W - 16, H - 16, "S");
    const sealX = 52, sealY = 38, sealR = 13;
    doc.setFillColor(197, 160, 80);
    for (let i = 0; i < 16; i++) {
      const a1 = (i * 22.5 * Math.PI) / 180;
      const a2 = ((i + 0.5) * 22.5 * Math.PI) / 180;
      doc.triangle(sealX, sealY, sealX + (sealR + 5) * Math.cos(a1), sealY + (sealR + 5) * Math.sin(a1), sealX + sealR * Math.cos(a2), sealY + sealR * Math.sin(a2), "F");
    }
    doc.setFillColor(218, 185, 100); doc.circle(sealX, sealY, sealR, "F");
    doc.setFillColor(197, 160, 80); doc.circle(sealX, sealY, sealR - 3, "F");
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(1.5);
    doc.line(sealX - 4, sealY + 1, sealX - 1, sealY + 5);
    doc.line(sealX - 1, sealY + 5, sealX + 5, sealY - 4);
    doc.setFillColor(197, 160, 80);
    doc.rect(sealX - 5, sealY + sealR - 1, 4, 11, "F");
    doc.rect(sealX + 1, sealY + sealR - 1, 4, 11, "F");
    doc.setFillColor(197, 160, 80); doc.roundedRect(W - 52, 12, 42, 18, 2, 2, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text("CrackDesk", W - 48, 22);
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Assessment", W - 48, 27);
    doc.setFontSize(38); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text("CERTIFICATE", W / 2, 50, { align: "center" });
    doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(110, 110, 110);
    doc.text("OF ACHIEVEMENT", W / 2, 59, { align: "center" });
    doc.setDrawColor(197, 160, 80); doc.setLineWidth(0.7);
    doc.line(W / 2 - 55, 64, W / 2 + 55, 64);
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(90, 90, 90);
    doc.text("THIS CERTIFICATE IS PRESENTED TO", W / 2, 74, { align: "center" });
    doc.setFontSize(28); doc.setFont("times", "bolditalic"); doc.setTextColor(197, 160, 80);
    doc.text("CrackDesk Student", W / 2, 90, { align: "center" });
    doc.setDrawColor(197, 160, 80); doc.setLineWidth(0.5);
    doc.line(W / 2 - 65, 94, W / 2 + 65, 94);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
    doc.text(`In recognition of successfully completing an AI-powered mock test with a score of`, W / 2, 103, { align: "center" });
    doc.text(`${percentage}% (${score}/${questions.length} correct) on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`, W / 2, 110, { align: "center" });
    doc.setFillColor(197, 160, 80); doc.roundedRect(W / 2 - 24, 116, 48, 14, 3, 3, "F");
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text(`${percentage}%  |  ${score}/${questions.length}`, W / 2, 125, { align: "center" });
    const strong = strongAreas(); const weak = weakAreas();
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    if (strong.length > 0) { doc.setTextColor(22, 101, 52); doc.text(`Strong: ${strong.slice(0, 5).join("  •  ")}`, W / 2, 137, { align: "center" }); }
    if (weak.length > 0) { doc.setTextColor(153, 27, 27); doc.text(`Focus on: ${weak.slice(0, 5).join("  •  ")}`, W / 2, 143, { align: "center" }); }
    doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    doc.text(`Time taken: ${formatTimeTaken(timeTaken)}`, W / 2, 150, { align: "center" });
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.4);
    doc.line(W / 2 - 30, 168, W / 2 + 30, 168);
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text("CrackDesk Platform", W / 2, 174, { align: "center" });
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(110, 110, 110);
    doc.text("Certified AI Assessment", W / 2, 179, { align: "center" });
    doc.setFillColor(197, 160, 80); doc.rect(0, H - 11, W, 11, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20);
    doc.text(`Generated by CrackDesk  •  ${new Date().toLocaleDateString()}  •  CrackDesk.com`, W / 2, H - 3.5, { align: "center" });
    doc.save("crackdesk_Certificate.pdf");
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ── INPUT PHASE ── */}
          {phase === "input" && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-2xl">
              <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">AI Mock Test Generator</h1>
              <p className="mt-2 text-muted-foreground">
                Paste a job description below and our AI will generate a personalised 20-question assessment.
              </p>
              <Card className="mt-6 shadow-card border-border">
                <CardContent className="p-6 space-y-4">
                  <Textarea
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="Paste the full job description here..."
                    className="min-h-[200px] resize-none"
                  />
                  <Button variant="hero" onClick={handleGenerate} disabled={!jd.trim() || isGenerating} className="w-full gap-2">
                    {isGenerating
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> AI is generating your test...</>
                      : <><Sparkles className="h-4 w-4" /> Generate Mock Test with AI</>}
                  </Button>
                  {isGenerating && (
                    <p className="text-xs text-center text-muted-foreground">
                      This may take 10–15 seconds. AI is reading your JD and crafting questions.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── QUIZ PHASE ── */}
          {phase === "quiz" && questions[current] && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className={`flex items-center gap-2 text-sm font-medium ${isWarningTime ? "text-destructive" : "text-muted-foreground"}`}>
                  {isWarningTime
                    ? <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                    : <Clock className="h-4 w-4" />}
                  <span className={isWarningTime ? "font-bold animate-pulse" : ""}>{formatTime(timeLeft)}</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{current + 1} / {questions.length}</span>
              </div>
              {isWarningTime && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Less than 1 minute remaining!</span>
                </motion.div>
              )}
              <div className="h-2 rounded-full bg-secondary mb-8">
                <div className="h-2 rounded-full gradient-primary transition-all duration-300"
                  style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
              </div>
              <Card className="shadow-card border-border">
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-primary bg-secondary px-2 py-1 rounded">
                    {questions[current].skill}
                  </span>
                  <h2 className="mt-3 font-display text-lg font-semibold text-foreground">
                    {questions[current].question}
                  </h2>
                  <div className="mt-6 space-y-3">
                    {questions[current].options.map((opt, oi) => (
                      <button key={oi} onClick={() => selectAnswer(oi)}
                        className={`w-full rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                          answers[current] === oi
                            ? "border-primary bg-secondary text-primary"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}>
                        <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-between">
                    <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((p) => p - 1)}>Previous</Button>
                    {current < questions.length - 1
                      ? <Button variant="hero" onClick={() => setCurrent((p) => p + 1)}>Next</Button>
                      : <Button variant="hero" onClick={finishTest}>Submit Test</Button>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-6xl">

              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Test Complete!</h1>
                <p className="mt-1 text-muted-foreground">Here's your detailed AI-powered score report</p>
              </div>

              {/* Score Circle */}
              <Card className="shadow-elevated border-border mb-6">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-secondary">
                    <span className="font-display text-4xl font-bold text-primary">{percentage}%</span>
                  </div>
                  <p className="mt-3 text-lg font-medium text-foreground">{score} / {questions.length} Correct</p>
                  <p className="text-sm text-muted-foreground">
                    {percentage >= 80 ? "Excellent work! You're well prepared."
                      : percentage >= 60 ? "Good effort! Focus on weak areas."
                      : "Keep practising. You'll get there!"}
                  </p>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
                {[
                  { label: "Correct", value: score, color: "text-success" },
                  { label: "Wrong", value: wrongCount, color: "text-destructive" },
                  { label: "Unanswered", value: unanswered, color: "text-muted-foreground" },
                  { label: "Time Taken", value: formatTimeTaken(timeTaken), color: "text-primary" },
                ].map((stat) => (
                  <Card key={stat.label} className="border-border">
                    <CardContent className="p-4 text-center">
                      <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Strong / Weak Areas */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-foreground">Strong Areas</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {strongAreas().length > 0
                        ? strongAreas().map((s) => <span key={s} className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">{s}</span>)
                        : <span className="text-xs text-muted-foreground">None identified</span>}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-foreground">Weak Areas</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {weakAreas().length > 0
                        ? weakAreas().map((s) => <span key={s} className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">{s}</span>)
                        : <span className="text-xs text-muted-foreground">None identified</span>}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ✅ SIDE BY SIDE — Skill Breakdown LEFT, Answer Review RIGHT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* ── LEFT: Skill Breakdown ── */}
                <div className="sticky top-20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-1 rounded-full bg-primary" />
                    <h3 className="font-display font-semibold text-foreground">Skill Breakdown</h3>
                    <span className="text-xs text-muted-foreground ml-auto">{skillBreakdown().length} skills</span>
                  </div>

                  <Card className="border-border overflow-hidden">
                    {/* Header row */}
                    <div className="grid grid-cols-2 px-4 py-2.5 bg-muted/50 border-b border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill</span>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Score</span>
                    </div>

                    <div className="divide-y divide-border">
                      {skillBreakdown().map((s, i) => (
                        <motion.div
                          key={s.skill}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="grid grid-cols-2 items-center px-4 py-3 hover:bg-muted/30 transition-colors"
                        >
                          {/* Left: skill name + bar */}
                          <div className="flex flex-col gap-1.5 pr-4">
                            <div className="flex items-center gap-2">
                              {s.pct >= 70
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                              <span className="text-sm font-medium text-foreground truncate">{s.skill}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${s.pct}%` }}
                                transition={{ delay: 0.3 + i * 0.04, duration: 0.6, ease: "easeOut" }}
                                className={`h-1.5 rounded-full ${s.pct >= 70 ? "bg-success" : "bg-destructive"}`}
                              />
                            </div>
                          </div>

                          {/* Right: score */}
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              s.pct >= 70 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            }`}>
                              {s.pct}%
                            </span>
                            <span className="text-sm font-bold text-foreground tabular-nums">
                              {s.correct}<span className="text-muted-foreground font-normal">/{s.total}</span>
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* ── RIGHT: Answer Review ── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-1 rounded-full bg-primary" />
                    <h3 className="font-display font-semibold text-foreground">Answer Review</h3>
                    <span className="text-xs text-muted-foreground ml-auto">{questions.length} questions</span>
                  </div>

                  <div className="space-y-3">
                    {questions.map((q, i) => {
                      const userAns = answers[i];
                      const isCorrect = userAns === q.correct;
                      const isSkipped = userAns === null;

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`rounded-xl border bg-card shadow-card overflow-hidden ${
                            isCorrect ? "border-success/30"
                              : isSkipped ? "border-border"
                              : "border-destructive/30"
                          }`}
                        >
                          {/* Question header */}
                          <div className="flex items-start gap-3 px-4 pt-3 pb-2.5 border-b border-border/50">
                            <span className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              isCorrect ? "bg-success/10 text-success"
                                : isSkipped ? "bg-muted text-muted-foreground"
                                : "bg-destructive/10 text-destructive"
                            }`}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
                              <span className="mt-1 inline-block text-xs font-semibold text-primary bg-secondary px-2 py-0.5 rounded">
                                {q.skill}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {isCorrect ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-full">
                                  <CheckCircle2 className="h-3 w-3" /> Correct
                                </span>
                              ) : isSkipped ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                  — Skipped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                                  <XCircle className="h-3 w-3" /> Wrong
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Two column: Your answer | Correct answer */}
                          <div className="grid grid-cols-2 divide-x divide-border/50">

                            {/* LEFT col — Your answer */}
                            <div className={`px-3 py-2.5 ${
                              isSkipped ? "bg-muted/20"
                                : isCorrect ? "bg-success/5"
                                : "bg-destructive/5"
                            }`}>
                              <p className={`text-xs font-semibold mb-1.5 ${
                                isSkipped ? "text-muted-foreground"
                                  : isCorrect ? "text-success"
                                  : "text-destructive"
                              }`}>
                                {isSkipped ? "Not answered" : isCorrect ? "Your answer ✓" : "Your answer ✗"}
                              </p>
                              {isSkipped ? (
                                <p className="text-xs text-muted-foreground italic">Skipped</p>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <span className={`shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                                    isCorrect ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                                  }`}>
                                    {String.fromCharCode(65 + userAns!)}
                                  </span>
                                  <p className="text-xs text-foreground leading-relaxed">{q.options[userAns!]}</p>
                                </div>
                              )}
                            </div>

                            {/* RIGHT col — Correct answer */}
                            <div className="px-3 py-2.5 bg-success/5">
                              <p className="text-xs font-semibold text-success mb-1.5">Correct answer</p>
                              <div className="flex items-start gap-2">
                                <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold bg-success/20 text-success">
                                  {String.fromCharCode(65 + q.correct)}
                                </span>
                                <p className="text-xs text-foreground leading-relaxed">{q.options[q.correct]}</p>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

              </div>
              {/* END side by side */}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row mt-10">
                <Button variant="hero" className="flex-1 gap-2" onClick={downloadPDF}>
                  <Download className="h-4 w-4" /> Download Certificate
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setPhase("input"); setJd(""); }}>
                  <RotateCcw className="h-4 w-4" /> Take Another Test
                </Button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}