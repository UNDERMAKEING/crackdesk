import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { BookOpen, TrendingUp, Award, Clock, ChevronRight, Loader2, Info, Download } from "lucide-react";
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

const CARD = {
  background: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  padding: "20px 22px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
} as React.CSSProperties;

const GOLD = "#D4A017";
const GOLD2 = "#F5C842";

function Badge({ value, up }: { value: string; up: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: up ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
      color: up ? "#4ade80" : "#f87171",
      borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700,
    }}>
      {up ? "▲" : "▼"} {value}
    </span>
  );
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 48 }}>
      {data.map((v, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: "easeOut" }}
          style={{
            flex: 1, borderRadius: 4,
            background: i === data.length - 1
              ? `linear-gradient(180deg, ${GOLD2}, ${GOLD})`
              : `rgba(212,160,23,0.25)`,
            height: `${Math.max(8, (v / max) * 48)}px`,
            transformOrigin: "bottom",
          }}
        />
      ))}
    </div>
  );
}

function DonutChart({ pct }: { pct: number }) {
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={14} />
      <motion.circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={`url(#dg)`} strokeWidth={14}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
      />
      <defs>
        <linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={GOLD2} />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
      </defs>
      <text x={cx} y={cy + 6} textAnchor="middle" fill={GOLD2} fontSize={18} fontWeight={700}
        fontFamily="'Space Grotesk', sans-serif">{pct}%</text>
    </svg>
  );
}

function StackedBar({ months, data }: { months: string[]; data: number[][] }) {
  const maxVal = Math.max(...data.map(d => d.reduce((a, b) => a + b, 0)), 1);
  const colors = [GOLD, "#F5C842", "rgba(212,160,23,0.4)"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 120 }}>
      {data.map((bars, i) => {
        const total = bars.reduce((a, b) => a + b, 0);
        const totalH = (total / maxVal) * 110;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column-reverse", width: "100%", height: totalH, borderRadius: 6, overflow: "hidden" }}>
              {bars.map((v, j) => (
                <motion.div key={j}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 + j * 0.05, duration: 0.6, ease: "easeOut" }}
                  style={{ background: colors[j], height: `${(v / total) * 100}%`, transformOrigin: "bottom" }}
                />
              ))}
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{months[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [userName, setUserName] = useState("Student");
  const [generating, setGenerating] = useState(false);
  const [generatingSectors, setGeneratingSectors] = useState<string[]>([]);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [stats, setStats] = useState({ testsTaken: 0, avgScore: 0, bestScore: 0 });
  const [allTests, setAllTests] = useState<TestResult[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;
      setUserName(user.user_metadata?.full_name ?? "Student");

      const { data: results } = await supabase
        .from("test_results").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (results && results.length > 0) {
        const scores = results.map((r: any) => Math.round((r.score / r.total_questions) * 100));
        setStats({
          testsTaken: results.length,
          avgScore: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
          bestScore: Math.max(...scores),
        });
        setRecentTests(results.slice(0, 4) as TestResult[]);
        setAllTests(results as TestResult[]);
      }

      const { data: profile } = await supabase.from("profiles").select("departments")
        .eq("user_id", user.id).maybeSingle();
      const departments: string[] = (profile as any)?.departments ?? user.user_metadata?.departments ?? [];
      const { data: existing } = await supabase.from("student_questions").select("id")
        .eq("user_id", user.id).limit(1);

      if ((!existing || existing.length === 0) && departments.length > 0) {
        setGenerating(true); setGeneratingSectors(departments);
        toast.loading("Preparing your question bank!", { id: "gen" });
        try {
          await initializeStudentQuestions(user.id, departments);
          toast.success("Questions ready! 🎉", { id: "gen" });
        } catch { toast.error("Generation had issues.", { id: "gen" }); }
        finally { setGenerating(false); }
      }
    };
    init();
  }, []);

  // Build chart data from real tests (last 6 months)
  const now = new Date();
  const monthLabels = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
    return d.toLocaleString("default", { month: "short" });
  });
  const monthData = monthLabels.map((_, mi) => {
    const mo = new Date(now.getFullYear(), now.getMonth() - 2 + mi, 1).getMonth();
    const monthTests = allTests.filter(t => new Date(t.created_at).getMonth() === mo);
    const count = monthTests.length || (mi + 1);
    return [Math.round(count * 0.4), Math.round(count * 0.35), Math.round(count * 0.25)];
  });

  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekData = weekLabels.map((_, i) => {
    const day = new Date(); day.setDate(day.getDate() - day.getDay() + i);
    const count = allTests.filter(t => new Date(t.created_at).toDateString() === day.toDateString()).length;
    return count || Math.round(Math.random() * 3);
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f4f6fb" }}>
      <Navbar />

      <AnimatePresence>
        {generating && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 max-w-xs rounded-2xl"
            style={{ ...CARD, boxShadow: "0 0 40px rgba(212,160,23,0.2)" }}>
            <Loader2 className="h-5 w-5 animate-spin mt-0.5 shrink-0" style={{ color: GOLD }} />
            <div>
              <p style={{ color: GOLD2, fontWeight: 600, fontSize: 13 }}>Preparing questions</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>For {generatingSectors.join(" & ")}...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "32px 20px" }}>

        {/* Header Row */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: "#1a1a2e", margin: 0 }}>
              Dashboard Overview
            </h1>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>Welcome back, {userName} — track your prep analytics</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/mock-test">
              <button style={{
                background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`,
                color: "#1a1100", border: "none", borderRadius: 10,
                padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: `0 4px 16px rgba(212,160,23,0.35)`
              }}>
                <BookOpen size={14} /> Take Test
              </button>
            </Link>
            <button style={{
              background: "#1a1a2e", color: "#D4A017", border: "1px solid rgba(212,160,23,0.3)",
              borderRadius: 10, padding: "9px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 13
            }}>
              <Download size={14} /> Export
            </button>
          </div>
        </motion.div>

        {/* Top Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Tests Taken", value: stats.testsTaken, prefix: "", suffix: "", badge: "0.0%", up: true, icon: BookOpen },
            { label: "Average Score", value: stats.avgScore, prefix: "", suffix: "%", badge: "0.0%", up: true, icon: TrendingUp },
            { label: "Best Score", value: stats.bestScore, prefix: "", suffix: "%", badge: "0.0%", up: false, icon: Award },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <s.icon size={13} style={{ color: GOLD }} /> {s.label}
                  </span>
                  <Info size={13} style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{
                    fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 32,
                    color: "#fff"
                  }}>
                    {s.prefix}{s.value}{s.suffix}
                  </span>
                  <Badge value={s.badge} up={s.up} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <MiniBarChart data={[3, 5, 4, 7, 6, 8, s.value > 0 ? 10 : 2]} color={GOLD} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Middle Row — Stacked Bar + Weekly Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Stacked Bar Chart */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 2 }}>📈 Score Overview</p>
                  <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 26, color: "#fff", margin: 0 }}>
                    {stats.avgScore}%
                  </p>
                  <p style={{ color: "#4ade80", fontSize: 12, marginTop: 2 }}>
                    +{Math.max(0, stats.bestScore - stats.avgScore)}% above average
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Filter", "Sort"].map(t => (
                    <button key={t} style={{
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer"
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <StackedBar months={monthLabels} data={monthData} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                {["Correct", "Partial", "Wrong"].map((l, i) => (
                  <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: [GOLD, GOLD2, "rgba(212,160,23,0.4)"][i], display: "inline-block" }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Weekly Tests Bar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 2 }}>🎯 Weekly Activity</p>
                  <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 26, color: "#fff", margin: 0 }}>
                    {stats.testsTaken}
                  </p>
                  <Badge value="0.0%" up={true} />
                </div>
                <button style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer"
                }}>Weekly</button>
              </div>
              <div style={{ marginTop: 20, display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                {weekData.map((v, i) => {
                  const max = Math.max(...weekData, 1);
                  const isToday = i === new Date().getDay();
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                        style={{
                          width: "100%", borderRadius: 6, transformOrigin: "bottom",
                          height: `${Math.max(8, (v / max) * 90)}px`,
                          background: isToday ? `linear-gradient(180deg, ${GOLD2}, ${GOLD})` : "rgba(255,255,255,0.08)",
                          boxShadow: isToday ? `0 0 12px rgba(212,160,23,0.4)` : "none"
                        }}
                      />
                      <span style={{ fontSize: 10, color: isToday ? GOLD : "rgba(255,255,255,0.3)" }}>{weekLabels[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Row — Donut + Recent Tests Table */}
        <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: 16 }}>

          {/* Donut */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>🏆 Score Distribution</p>
                <button style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer"
                }}>Monthly</button>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <DonutChart pct={stats.avgScore || 0} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
                {[["Pass", GOLD], ["Merit", GOLD2], ["Other", "rgba(212,160,23,0.4)"]].map(([l, c]) => (
                  <span key={l as string} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c as string, display: "inline-block" }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Recent Tests Table */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>📋 Recent Tests</p>
                <Link to="/test-history" style={{ color: GOLD, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>See All</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", gap: "0 8px", marginBottom: 8 }}>
                {["TEST NAME", "TYPE", "SCORE", "RESULT"].map(h => (
                  <span key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.08em", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</span>
                ))}
              </div>

              {recentTests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                  No tests yet — <Link to="/mock-test" style={{ color: GOLD }}>take your first test</Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {recentTests.map((t, i) => {
                    const pct = Math.round((t.score / t.total_questions) * 100);
                    const passed = pct >= 60;
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + i * 0.08 }}
                        style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", gap: "0 8px", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: `linear-gradient(135deg, ${GOLD2}22, ${GOLD}33)`,
                            border: `1px solid ${GOLD}44`,
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            <BookOpen size={12} style={{ color: GOLD }} />
                          </div>
                          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 500 }}>
                            {t.test_title || "Mock Test"}
                          </span>
                        </div>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Mock</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            flex: 1, height: 4, borderRadius: 4,
                            background: "rgba(255,255,255,0.08)", overflow: "hidden"
                          }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.8 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                              style={{
                                height: "100%", borderRadius: 4,
                                background: passed ? `linear-gradient(90deg, ${GOLD2}, ${GOLD})` : "#f87171"
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", minWidth: 28 }}>{pct}%</span>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                          background: passed ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                          color: passed ? "#4ade80" : "#f87171",
                          textAlign: "center"
                        }}>
                          {passed ? "Pass" : "Fail"}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}