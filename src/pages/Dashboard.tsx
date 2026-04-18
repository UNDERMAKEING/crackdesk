import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, TrendingUp, Award, Clock, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeStudentQuestions } from "@/lib/studentQuestions";
import { toast } from "sonner";

interface TestResult {
  test_title: string;
  score: number;
  total_questions: number;
  created_at: string;
}

export default function Dashboard() {
  const [userName, setUserName] = useState("Student");
  const [generating, setGenerating] = useState(false);
  const [generatingSectors, setGeneratingSectors] = useState<string[]>([]);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [stats, setStats] = useState({ testsTaken: 0, avgScore: 0, bestScore: 0 });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;
      setUserName(user.user_metadata?.full_name ?? "Student");

      const { data: results } = await supabase
        .from("test_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (results && results.length > 0) {
        const scores = results.map((r: any) => Math.round((r.score / r.total_questions) * 100));
        setStats({
          testsTaken: results.length,
          avgScore: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
          bestScore: Math.max(...scores),
        });
        setRecentTests(results.slice(0, 3) as TestResult[]);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("departments")
        .eq("user_id", user.id)
        .maybeSingle();

      const departments: string[] = (profile as any)?.departments ?? user.user_metadata?.departments ?? [];

      const { data: existing } = await supabase
        .from("student_questions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if ((!existing || existing.length === 0) && departments.length > 0) {
        setGenerating(true);
        setGeneratingSectors(departments);
        toast.loading("Your personal question bank is being prepared!", { id: "generating" });
        try {
          await initializeStudentQuestions(user.id, departments);
          toast.success("Your questions are ready! 🎉", { id: "generating" });
        } catch (err) {
          toast.error("Question generation had issues.", { id: "generating" });
        } finally {
          setGenerating(false);
        }
      }
    };
    init();
  }, []);

  const statCards = [
    { label: "Tests Taken", value: stats.testsTaken.toString(), icon: BookOpen, suffix: "exams" },
    { label: "Average Score", value: `${stats.avgScore}`, suffix: "%", icon: TrendingUp },
    { label: "Best Score", value: `${stats.bestScore}`, suffix: "%", icon: Award },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #111008 50%, #0d0c05 100%)" }}>
      <Navbar />

      {/* Elite background texture */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(ellipse at 20% 20%, rgba(184,148,10,0.06) 0%, transparent 60%),
                          radial-gradient(ellipse at 80% 80%, rgba(184,148,10,0.04) 0%, transparent 60%)`,
        zIndex: 0
      }} />

      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 max-w-xs rounded-2xl"
            style={{ background: "linear-gradient(135deg, #1a1500, #231c00)", border: "1px solid rgba(184,148,10,0.4)", boxShadow: "0 0 40px rgba(184,148,10,0.15)" }}
          >
            <Loader2 className="h-5 w-5 animate-spin mt-0.5 shrink-0" style={{ color: "#D4A017" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#F0C040" }}>Preparing your questions</p>
              <p className="text-xs mt-0.5" style={{ color: "#8a7a40" }}>
                Generating for {generatingSectors.join(" & ")}...
              </p>
              <p className="text-xs" style={{ color: "#8a7a40" }}>This takes ~2 minutes. You can browse freely!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 container mx-auto px-4 py-10 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2 mb-1">
            <div style={{ width: 32, height: 2, background: "linear-gradient(90deg, #D4A017, transparent)" }} />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: "#D4A017" }}>
              Elite Dashboard
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-2" style={{
            fontFamily: "'Space Grotesk', sans-serif",
            background: "linear-gradient(135deg, #F5E070 0%, #D4A017 40%, #A07010 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Welcome back, {userName}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#5a5030" }}>Your elite preparation command center</p>
        </motion.div>

        {/* Stat Cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <div
                className="rounded-2xl p-6 relative overflow-hidden group cursor-default"
                style={{
                  background: "linear-gradient(145deg, #161200, #1e1800)",
                  border: "1px solid rgba(184,148,10,0.2)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,160,23,0.1)",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(212,160,23,0.5)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(212,160,23,0.1), inset 0 1px 0 rgba(212,160,23,0.2)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(184,148,10,0.2)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,160,23,0.1)";
                }}
              >
                {/* Corner accent */}
                <div style={{
                  position: "absolute", top: 0, right: 0, width: 60, height: 60,
                  background: "radial-gradient(circle at top right, rgba(212,160,23,0.12), transparent 70%)"
                }} />

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{
                    background: "linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.05))",
                    border: "1px solid rgba(212,160,23,0.3)"
                  }}>
                    <s.icon className="h-5 w-5" style={{ color: "#D4A017" }} />
                  </div>
                  <span className="text-xs font-medium tracking-wider uppercase" style={{ color: "#6b5c20" }}>
                    {s.label}
                  </span>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold" style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    background: "linear-gradient(135deg, #F5E070, #D4A017)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}>
                    {s.value}
                  </span>
                  {s.suffix && (
                    <span className="text-lg mb-1 font-medium" style={{ color: "#8a7020" }}>{s.suffix}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <Link to="/mock-test">
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #D4A017, #A07010)",
                color: "#0a0800",
                boxShadow: "0 4px 20px rgba(212,160,23,0.3)",
                border: "none"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(212,160,23,0.5)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(212,160,23,0.3)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              <BookOpen className="h-4 w-4" />
              Take a Mock Test
            </button>
          </Link>
          <Link to="/test-library">
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
              style={{
                background: "transparent",
                color: "#D4A017",
                border: "1px solid rgba(212,160,23,0.35)",
                boxShadow: "none"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,160,23,0.08)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,160,23,0.6)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,160,23,0.35)";
              }}
            >
              Browse Test Library
            </button>
          </Link>
        </motion.div>

        {/* Recent Tests */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div style={{ width: 3, height: 20, background: "linear-gradient(180deg, #F5E070, #A07010)", borderRadius: 2 }} />
              <h2 className="font-bold text-lg" style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: "#E8C840"
              }}>
                Recent Tests
              </h2>
            </div>
            <Link to="/test-history">
              <span className="text-xs flex items-center gap-1 font-medium transition-colors" style={{ color: "#8a6820" }}
                onMouseEnter={e => (e.currentTarget as HTMLSpanElement).style.color = "#D4A017"}
                onMouseLeave={e => (e.currentTarget as HTMLSpanElement).style.color = "#8a6820"}
              >
                View all <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>

          {recentTests.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{
              background: "linear-gradient(145deg, #0f0e00, #161200)",
              border: "1px dashed rgba(184,148,10,0.2)"
            }}>
              <div className="flex justify-center mb-3">
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(212,160,23,0.1)",
                  border: "1px solid rgba(212,160,23,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <BookOpen style={{ width: 20, height: 20, color: "#D4A017" }} />
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: "#6b5c20" }}>No tests taken yet</p>
              <p className="text-xs mt-1" style={{ color: "#3d3010" }}>Start your first mock test to track your progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTests.map((t, i) => {
                const pct = Math.round((t.score / t.total_questions) * 100);
                const scoreColor = pct >= 70 ? "#4ade80" : pct >= 50 ? "#facc15" : "#f87171";
                const scoreBg = pct >= 70 ? "rgba(74,222,128,0.1)" : pct >= 50 ? "rgba(250,204,21,0.1)" : "rgba(248,113,113,0.1)";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <div
                      className="rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-300"
                      style={{
                        background: "linear-gradient(145deg, #111000, #191500)",
                        border: "1px solid rgba(184,148,10,0.15)",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.3)"
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,160,23,0.35)";
                        (e.currentTarget as HTMLDivElement).style.background = "linear-gradient(145deg, #161300, #1e1800)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(184,148,10,0.15)";
                        (e.currentTarget as HTMLDivElement).style.background = "linear-gradient(145deg, #111000, #191500)";
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl font-bold text-sm" style={{
                          background: scoreBg,
                          border: `1px solid ${scoreColor}30`,
                          color: scoreColor,
                          fontFamily: "'Space Grotesk', sans-serif"
                        }}>
                          {pct}%
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "#D4B840" }}>
                            {t.test_title || "Mock Test"}
                          </p>
                          <p className="text-xs flex items-center gap-2 mt-0.5" style={{ color: "#4a3e18" }}>
                            <Clock className="h-3 w-3" />
                            {new Date(t.created_at).toLocaleDateString()} · {t.total_questions} questions
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4" style={{ color: "#4a3e18" }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}