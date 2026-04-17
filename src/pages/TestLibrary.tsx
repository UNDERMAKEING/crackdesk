import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronRight, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStudentQuestions, getDepartmentMeta } from "@/lib/studentQuestions";

const levels = ["easy", "medium", "hard"] as const;
const levelColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800",
};

export default function TestLibrary() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setPageLoading(false); return; }
      setUserId(session.user.id);

      const { data: profile } = await (supabase
        .from("profiles")
        .select("departments")
        .eq("user_id", session.user.id)
        .maybeSingle() as any);

      const depts = profile?.departments ?? session.user.user_metadata?.departments ?? [];
      setDepartments(Array.isArray(depts) ? depts : []);
      setPageLoading(false);
    };
    load();
  }, []);

  const handleStartTest = async (sector: string, level: string) => {
    if (!userId) return;
    setLoading(true);
    const questions = await getStudentQuestions(userId, sector, level);
    if (questions && questions.length > 0) {
      localStorage.setItem("testQuestions", JSON.stringify(questions));
      localStorage.setItem("testTitle", `${getDepartmentMeta(sector).label} — ${level.charAt(0).toUpperCase() + level.slice(1)}`);
      navigate("/mock-test");
    } else {
      const { toast } = await import("sonner");
      toast.error("Questions for this level haven't been generated yet. Please check back soon!");
    }
    setLoading(false);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Test Library</h1>
            <p className="mt-1 text-muted-foreground">
              {departments.length > 0
                ? "Practice tests for your selected departments"
                : "Select departments during signup to see your tests"}
            </p>
          </div>
          <Link to="/mock-test">
            <Button variant="hero" size="sm" className="gap-2">
              <BookOpen className="h-4 w-4" /> Custom JD Test
            </Button>
          </Link>
        </div>

        {departments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground">No departments selected</h3>
              <p className="text-sm text-muted-foreground mt-1">Update your profile to select departments.</p>
            </CardContent>
          </Card>
        ) : !selectedDept ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((key, i) => {
              const meta = getDepartmentMeta(key);
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card
                    className="group cursor-pointer border-border hover:shadow-md transition-all"
                    onClick={() => setSelectedDept(key)}
                  >
                    <div className="h-2 w-full gradient-primary rounded-t-lg" />
                    <CardContent className="p-5">
                      <div className="text-3xl mb-3">{meta.icon}</div>
                      <h3 className="font-display text-lg font-semibold text-foreground">{meta.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{key}</p>
                      <p className="text-xs text-muted-foreground mt-2">3 levels • 20 questions each</p>
                      <Button
                        variant="outline"
                        className="mt-4 w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        Select <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <>
            <Button variant="ghost" className="mb-6" onClick={() => setSelectedDept(null)}>
              ← Back to departments
            </Button>
            {(() => {
              const meta = getDepartmentMeta(selectedDept);
              return (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-4xl">{meta.icon}</span>
                    <div>
                      <h2 className="font-display text-2xl font-bold text-foreground">{meta.label}</h2>
                      <p className="text-muted-foreground text-sm">Choose your difficulty level</p>
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-3">
                    {levels.map((level, i) => (
                      <motion.div key={level} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <Card className="group cursor-pointer border-border hover:shadow-md transition-all">
                          <div className="h-2 w-full gradient-primary rounded-t-lg" />
                          <CardContent className="p-6">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${levelColors[level]}`}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </span>
                            <h3 className="font-display text-xl font-semibold text-foreground mt-4">
                              {level.charAt(0).toUpperCase() + level.slice(1)} Test
                            </h3>
                            <p className="text-sm text-muted-foreground mt-2">
                              20 questions for {meta.label}
                            </p>
                            <ul className="mt-3 space-y-1">
                              <li className="text-xs text-muted-foreground">✅ Pre-generated questions</li>
                              <li className="text-xs text-muted-foreground">✅ Instant score and feedback</li>
                              <li className="text-xs text-muted-foreground">✅ Skill breakdown analysis</li>
                            </ul>
                            <Button
                              variant="outline"
                              className="mt-5 w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                              onClick={() => handleStartTest(selectedDept, level)}
                              disabled={loading}
                            >
                              {loading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                              ) : (
                                <>Start Test <ChevronRight className="h-4 w-4" /></>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

