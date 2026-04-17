import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, TrendingUp, Award, Clock, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
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

      // Fetch real stats from test_results
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

      // Check if questions already exist
      const { data: existing } = await supabase
        .from("student_questions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if ((!existing || existing.length === 0) && departments.length > 0) {
        setGenerating(true);
        setGeneratingSectors(departments);
        toast.loading("Your personal question bank is being prepared! This may take a few minutes.", {
          id: "generating",
        });

        try {
          await initializeStudentQuestions(user.id, departments);
          toast.success("Your questions are ready! 🎉 Head to the Test Library.", {
            id: "generating",
          });
        } catch (err) {
          console.error("Generation failed:", err);
          toast.error("Question generation had issues. Some may still work.", {
            id: "generating",
          });
        } finally {
          setGenerating(false);
        }
      }
    };

    init();
  }, []);

  const statCards = [
    { label: "Tests Taken", value: stats.testsTaken.toString(), icon: BookOpen, color: "text-primary" },
    { label: "Average Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "text-success" },
    { label: "Best Score", value: `${stats.bestScore}%`, icon: Award, color: "text-warning" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />

      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border border-border bg-background shadow-xl px-4 py-3 max-w-xs"
          >
            <Loader2 className="h-5 w-5 text-primary animate-spin mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Preparing your questions</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generating for {generatingSectors.join(" & ")}...
              </p>
              <p className="text-xs text-muted-foreground">This takes ~2 minutes. You can browse freely!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Welcome back, {userName}! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Here's your preparation overview.</p>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="shadow-card border-border hover:shadow-card-hover transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/mock-test">
            <Button variant="hero" className="gap-2">
              <BookOpen className="h-4 w-4" /> Take a Mock Test
            </Button>
          </Link>
          <Link to="/test-library">
            <Button variant="outline" className="gap-2">
              Browse Test Library
            </Button>
          </Link>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Recent Tests</h2>
            <Link to="/test-history" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {recentTests.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No tests taken yet. Start your first mock test!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentTests.map((t, i) => {
                const pct = Math.round((t.score / t.total_questions) * 100);
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                    <Card className="shadow-card border-border hover:shadow-card-hover transition-shadow">
                      <CardContent className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-display font-bold text-sm ${
                            pct >= 70 ? "bg-success/10 text-success" : pct >= 50 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                          }`}>
                            {pct}%
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{t.test_title || "Mock Test"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Clock className="h-3 w-3" /> {new Date(t.created_at).toLocaleDateString()} · {t.total_questions} questions
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
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

