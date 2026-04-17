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
import { supabase } from "@/lib/supabase"; // ✅ CHANGE 1: import supabase

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

  // ✅ CHANGE 2: save result to Supabase inside finishTest
  const finishTest = useCallback(async () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    setTimeTaken(elapsed);
    setPhase("results");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return; // not logged in, skip saving

      // Calculate score at the moment of finishing
      const finalScore = answers.reduce(
        (acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0),
        0
      );

      // Use first 80 chars of JD as the test title
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

      if (error) {
        console.error("[MockTest] Failed to save result:", error.message);
      } else {
        console.log("[MockTest] ✅ Result saved to history");
      }
    } catch (e: any) {
      console.error("[MockTest] Save error:", e.message);
    }
  }, [startTime, answers, questions, jd]);
  // ✅ CHANGE 2 END

  useEffect(() => {
    if (phase !== "quiz") return;
    if (timeLeft <= 0) { finishTest(); return; }

    if (timeLeft === 60 && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning("Only 1 minute remaining! Wrap up your answers.", {
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
      skill,
      correct,
      total,
      pct: Math.round((correct / total) * 100),
    }));
  };

  const strongAreas = () => skillBreakdown().filter((s) => s.pct >= 70).map((s) => s.skill);
  const weakAreas = () => skillBreakdown().filter((s) => s.pct < 70).map((s) => s.skill);

  const formatTimeTaken = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297;
    const H = 210;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 28, H, "F");
    doc.setDrawColor(197, 160, 80);
    doc.setLineWidth(5);
    doc.ellipse(14, H / 2, 20, 55, "S");
    doc.setDrawColor(197, 160, 80);
    doc.setLineWidth(2.5);
    doc.rect(4, 4, W - 8, H - 8, "S");
    doc.setDrawColor(197, 160, 80);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, W - 16, H - 16, "S");

    const sealX = 52, sealY = 38, sealR = 13;
    doc.setFillColor(197, 160, 80);
    for (let i = 0; i < 16; i++) {
      const a1 = (i * 22.5 * Math.PI) / 180;
      const a2 = ((i + 0.5) * 22.5 * Math.PI) / 180;
      doc.triangle(
        sealX, sealY,
        sealX + (sealR + 5) * Math.cos(a1), sealY + (sealR + 5) * Math.sin(a1),
        sealX + sealR * Math.cos(a2), sealY + sealR * Math.sin(a2),
        "F"
      );
    }
    doc.setFillColor(218, 185, 100);
    doc.circle(sealX, sealY, sealR, "F");
    doc.setFillColor(197, 160, 80);
    doc.circle(sealX, sealY, sealR - 3, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.5);
    doc.line(sealX - 4, sealY + 1, sealX - 1, sealY + 5);
    doc.line(sealX - 1, sealY + 5, sealX + 5, sealY - 4);
    doc.setFillColor(197, 160, 80);
    doc.rect(sealX - 5, sealY + sealR - 1, 4, 11, "F");
    doc.rect(sealX + 1, sealY + sealR - 1, 4, 11, "F");

    doc.setFillColor(197, 160, 80);
    doc.roundedRect(W - 52, 12, 42, 18, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("CrackDesk", W - 48, 22);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Assessment", W - 48, 27);

    doc.setFontSize(38);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("CERTIFICATE", W / 2, 50, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text("OF ACHIEVEMENT", W / 2, 59, { align: "center" });
    doc.setDrawColor(197, 160, 80);
    doc.setLineWidth(0.7);
    doc.line(W / 2 - 55, 64, W / 2 + 55, 64);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(90, 90, 90);
    doc.text("THIS CERTIFICATE IS PRESENTED TO", W / 2, 74, { align: "center" });
    doc.setFontSize(28);
    doc.setFont("times", "bolditalic");
    doc.setTextColor(197, 160, 80);
    doc.text("CrackDesk Student", W / 2, 90, { align: "center" });
    doc.setDrawColor(197, 160, 80);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 65, 94, W / 2 + 65, 94);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(
      `In recognition of successfully completing an AI-powered mock test with a score of`,
      W / 2, 103, { align: "center" }
    );
    doc.text(
      `${percentage}% (${score}/${questions.length} correct) on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`,
      W / 2, 110, { align: "center" }
    );

    doc.setFillColor(197, 160, 80);
    doc.roundedRect(W / 2 - 24, 116, 48, 14, 3, 3, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(`${percentage}%  |  ${score}/${questions.length}`, W / 2, 125, { align: "center" });

    const strong = strongAreas();
    const weak = weakAreas();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (strong.length > 0) {
      doc.setTextColor(22, 101, 52);
      doc.text(`Strong: ${strong.slice(0, 5).join("  •  ")}`, W / 2, 137, { align: "center" });
    }
    if (weak.length > 0) {
      doc.setTextColor(153, 27, 27);
      doc.text(`Focus on: ${weak.slice(0, 5).join("  •  ")}`, W / 2, 143, { align: "center" });
    }

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Time taken: ${formatTimeTaken(timeTaken)}`, W / 2, 150, { align: "center" });

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(W / 2 - 30, 168, W / 2 + 30, 168);
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.9);
    doc.lines([[7, -5], [7, 6], [7, -4], [5, 4], [4, -3]], W / 2 - 12, 166);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("CrackDesk Platform", W / 2, 174, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text("Certified AI Assessment", W / 2, 179, { align: "center" });

    doc.setFillColor(197, 160, 80);
    doc.rect(0, H - 11, W, 11, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(
      `Generated by CrackDesk  •  ${new Date().toLocaleDateString()}  •  CrackDesk.com`,
      W / 2, H - 3.5, { align: "center" }
    );

    doc.save("crackdesk_Certificate.pdf");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const isWarningTime = timeLeft <= 60;

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
                Paste a job description below and our AI will generate a personalised 20-question assessment based on the exact skills required.
              </p>
              <Card className="mt-6 shadow-card border-border">
                <CardContent className="p-6 space-y-4">
                  <Textarea
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="Paste the full job description here...&#10;&#10;Example: We are looking for a Full Stack Developer with experience in React.js, Node.js, SQL, REST APIs..."
                    className="min-h-[200px] resize-none"
                  />
                  <Button variant="hero" onClick={handleGenerate} disabled={!jd.trim() || isGenerating} className="w-full gap-2">
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> AI is generating your test...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Generate Mock Test with AI</>
                    )}
                  </Button>
                  {isGenerating && (
                    <p className="text-xs text-center text-muted-foreground">
                      This may take 10–15 seconds. Gemini AI is reading your JD and crafting questions.
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
                <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${isWarningTime ? "text-destructive" : "text-muted-foreground"}`}>
                  {isWarningTime
                    ? <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                    : <Clock className="h-4 w-4" />
                  }
                  <span className={isWarningTime ? "font-bold animate-pulse" : ""}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {current + 1} / {questions.length}
                </span>
              </div>

              {isWarningTime && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Less than 1 minute remaining!</span>
                </motion.div>
              )}

              <div className="h-2 rounded-full bg-secondary mb-8">
                <div
                  className="h-2 rounded-full gradient-primary transition-all duration-300"
                  style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                />
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
                      <button
                        key={oi}
                        onClick={() => selectAnswer(oi)}
                        className={`w-full rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                          answers[current] === oi
                            ? "border-primary bg-secondary text-primary"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-between">
                    <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((p) => p - 1)}>
                      Previous
                    </Button>
                    {current < questions.length - 1 ? (
                      <Button variant="hero" onClick={() => setCurrent((p) => p + 1)}>Next</Button>
                    ) : (
                      <Button variant="hero" onClick={finishTest}>Submit Test</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-2xl">
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Test Complete!</h1>
                <p className="mt-1 text-muted-foreground">Here's your detailed AI-powered score report</p>
              </div>

              <Card className="shadow-elevated border-border">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-secondary">
                    <span className="font-display text-4xl font-bold text-primary">{percentage}%</span>
                  </div>
                  <p className="mt-3 text-lg font-medium text-foreground">{score} / {questions.length} Correct</p>
                  <p className="text-sm text-muted-foreground">
                    {percentage >= 80
                      ? "Excellent work! You're well prepared."
                      : percentage >= 60
                      ? "Good effort! Focus on weak areas."
                      : "Keep practising. You'll get there!"}
                  </p>
                </CardContent>
              </Card>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-foreground">Strong Areas</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {strongAreas().length > 0
                        ? strongAreas().map((s) => (
                            <span key={s} className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">{s}</span>
                          ))
                        : <span className="text-xs text-muted-foreground">None identified</span>}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-foreground">Weak Areas</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {weakAreas().length > 0
                        ? weakAreas().map((s) => (
                            <span key={s} className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">{s}</span>
                          ))
                        : <span className="text-xs text-muted-foreground">None identified</span>}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="font-display font-semibold text-foreground">Skill Breakdown</h3>
                {skillBreakdown().map((s) => (
                  <div key={s.skill} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{s.skill}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{s.correct}/{s.total}</span>
                        {s.pct >= 70
                          ? <CheckCircle2 className="h-4 w-4 text-success" />
                          : <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div
                        className={`h-2 rounded-full transition-all ${s.pct >= 70 ? "bg-success" : "bg-destructive"}`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                <h3 className="font-display font-semibold text-foreground">Answer Review</h3>
                <p className="text-xs text-muted-foreground -mt-1">See exactly what you got right, wrong, or skipped.</p>

                {questions.map((q, i) => {
                  const userAns = answers[i];
                  const isCorrect = userAns === q.correct;
                  const isSkipped = userAns === null;

                  return (
                    <div key={i} className={`rounded-xl border bg-card p-4 shadow-card ${
                      isCorrect ? "border-success/40" : isSkipped ? "border-border" : "border-destructive/40"
                    }`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="mt-0.5 text-xs font-semibold text-muted-foreground shrink-0">Q{i + 1}</span>
                          <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
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

                      <span className="text-xs font-semibold text-primary bg-secondary px-2 py-0.5 rounded mb-3 inline-block">
                        {q.skill}
                      </span>

                      {!isCorrect && (
                        <div className="mt-2 space-y-2">
                          {!isSkipped && (
                            <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                              <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-destructive font-medium">Your answer</p>
                                <p className="text-sm text-foreground mt-0.5">
                                  <span className="font-semibold mr-1">{String.fromCharCode(65 + userAns!)}.</span>
                                  {q.options[userAns!]}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-success font-medium">Correct answer</p>
                              <p className="text-sm text-foreground mt-0.5">
                                <span className="font-semibold mr-1">{String.fromCharCode(65 + q.correct)}.</span>
                                {q.options[q.correct]}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {isCorrect && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                          <p className="text-sm text-foreground">
                            <span className="font-semibold mr-1">{String.fromCharCode(65 + q.correct)}.</span>
                            {q.options[q.correct]}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

