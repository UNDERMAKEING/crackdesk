import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Users, CreditCard, UserX, Activity, Database,
  Key, LogIn, TrendingUp, RefreshCw, LogOut, ShieldAlert, Zap, Calendar,
  Upload, CheckCircle2, XCircle, FileText, AlertTriangle
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  todayLogins: number;
  totalQuestionsAllTime: number;
  totalApiTokensUsedAllTime: number;
  totalDatabaseRowsAllTime: number;
  apiTokensUsedToday: number;
  apiTokensLimit: number;
  databaseRowsUsed: number;
  databaseRowsLimit: number;
  recentUsers: any[];
  dailyLoginHistory: any[];
}

interface ParsedQuestion {
  department: string;
  level: string;
  question: string;
  options: string[];
  correct: number;
  skill: string;
}

interface UploadResult {
  total: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

// ─────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, history }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; history?: boolean;
}) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "#0f172a", borderColor: "#1e293b" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400 font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      {history && <p className="text-xs text-amber-500 mt-1">📊 Historical Total</p>}
    </div>
  );
}

function ProgressBar({ label, used, total, color, isHistorical }: {
  label: string; used: number; total: number; color: string; isHistorical?: boolean;
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="rounded-xl p-5 border" style={{ background: "#0f172a", borderColor: "#1e293b" }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="text-sm font-bold text-white">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-600">{used.toLocaleString()} used</span>
        <span className="text-xs text-gray-600">{total.toLocaleString()} limit</span>
      </div>
      {isHistorical && <p className="text-xs text-amber-400 mt-1 font-semibold">📊 All-Time Total</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// CSV parser
// ─────────────────────────────────────────────
function parseCSV(text: string): { questions: ParsedQuestion[]; errors: string[] } {
  const lines = text.trim().split("\n").filter(Boolean);
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];

  if (lines.length < 2) {
    errors.push("CSV must have a header row and at least one data row.");
    return { questions, errors };
  }

  // Parse header — support both comma and semicolon separators
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  const col = (row: string[], name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? (row[idx] ?? "").replace(/^"|"$/g, "").trim() : "";
  };

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    // Handle quoted commas inside fields
    const row: string[] = [];
    let cur = "", inQ = false;
    for (let c = 0; c < raw.length; c++) {
      if (raw[c] === '"') { inQ = !inQ; continue; }
      if (raw[c] === sep && !inQ) { row.push(cur); cur = ""; continue; }
      cur += raw[c];
    }
    row.push(cur);

    const dept     = col(row, "department").toUpperCase();
    const level    = col(row, "level").toLowerCase();
    const question = col(row, "question");
    const optA     = col(row, "option_a");
    const optB     = col(row, "option_b");
    const optC     = col(row, "option_c");
    const optD     = col(row, "option_d");
    const correctRaw = col(row, "correct");
    const skill    = col(row, "skill") || dept;

    // Validate
    if (!dept || !level || !question) {
      errors.push(`Row ${i + 1}: Missing department, level, or question.`);
      continue;
    }
    if (!["easy", "medium", "hard"].includes(level)) {
      errors.push(`Row ${i + 1}: Level must be easy, medium, or hard. Got "${level}".`);
      continue;
    }
    if (!optA || !optB || !optC || !optD) {
      errors.push(`Row ${i + 1}: All 4 options (option_a to option_d) are required.`);
      continue;
    }

    // correct can be 0/1/2/3 or A/B/C/D
    let correct: number;
    const cLower = correctRaw.trim().toUpperCase();
    if (["A", "B", "C", "D"].includes(cLower)) {
      correct = ["A", "B", "C", "D"].indexOf(cLower);
    } else {
      correct = parseInt(correctRaw);
    }

    if (isNaN(correct) || correct < 0 || correct > 3) {
      errors.push(`Row ${i + 1}: "correct" must be 0-3 or A-D. Got "${correctRaw}".`);
      continue;
    }

    questions.push({
      department: dept,
      level,
      question,
      options: [optA, optB, optC, optD],
      correct,
      skill,
    });
  }

  return { questions, errors };
}

// ─────────────────────────────────────────────
// CSV Upload Section Component
// ─────────────────────────────────────────────
function CSVUploadSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("library_questions")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setLibraryCount(count ?? 0));
  }, [result]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { questions, errors } = parseCSV(text);
      setPreview(questions);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0) return;
    setUploading(true);

    const BATCH = 100; // insert 100 rows at a time
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < preview.length; i += BATCH) {
      const chunk = preview.slice(i, i + BATCH);
      const { error } = await supabase.from("library_questions").insert(
        chunk.map((q) => ({
          department: q.department,
          level: q.level,
          question: q.question,
          options: q.options,
          correct: q.correct,
          skill: q.skill,
        }))
      );
      if (error) {
        skipped += chunk.length;
        errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      } else {
        inserted += chunk.length;
      }
    }

    setResult({ total: preview.length, inserted, skipped, errors });
    setPreview([]);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
  };

  const downloadTemplate = () => {
    const header = "department,level,question,option_a,option_b,option_c,option_d,correct,skill";
    const sample = [
      "CSE,easy,What is an array?,A data structure,A loop,A function,A class,0,Arrays",
      "CSE,easy,What does OOP stand for?,Object-Oriented Programming,Open Online Processing,Output Oriented Protocol,Object Order Protocol,0,OOP",
      "CSE,medium,What is the time complexity of binary search?,O(n),O(log n),O(n²),O(1),1,Algorithms",
      "IT,hard,Which protocol is used for secure web communication?,HTTP,FTP,HTTPS,SMTP,2,Networking",
    ].join("\n");
    const blob = new Blob([header + "\n" + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "questions_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Group preview by dept+level
  const previewSummary = preview.reduce<Record<string, number>>((acc, q) => {
    const k = `${q.department} / ${q.level}`;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#0f172a", borderColor: "#1e293b" }}>

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#1e293b" }}>
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Upload Questions via CSV
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {libraryCount !== null && (
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#1e293b", color: "#94a3b8" }}>
              {libraryCount.toLocaleString()} questions in library
            </span>
          )}
          <button
            onClick={downloadTemplate}
            className="text-xs px-3 py-1.5 rounded-lg border border-indigo-800 text-indigo-400 hover:border-indigo-600 transition-colors flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" /> Download Template
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* CSV format guide */}
        <div className="rounded-lg p-4 text-xs" style={{ background: "#0a0a1a", border: "1px solid #1e293b" }}>
          <p className="text-gray-400 font-semibold mb-2">Required CSV columns:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1 gap-x-4">
            {[
              ["department", "CSE, AI, ML, IT, ECE..."],
              ["level", "easy / medium / hard"],
              ["question", "The question text"],
              ["option_a", "First option"],
              ["option_b", "Second option"],
              ["option_c", "Third option"],
              ["option_d", "Fourth option"],
              ["correct", "0=A, 1=B, 2=C, 3=D"],
              ["skill", "Arrays, OOP, Networks..."],
            ].map(([col, desc]) => (
              <div key={col} className="flex gap-2">
                <code className="text-indigo-400 shrink-0">{col}</code>
                <span className="text-gray-600">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <label
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
          style={{
            borderColor: fileName ? "#6366f1" : "#2d3748",
            background: fileName ? "#1e1b4b22" : "#0a0a1a",
            padding: "2rem",
          }}
        >
          <Upload className="h-8 w-8" style={{ color: fileName ? "#6366f1" : "#4a5568" }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: fileName ? "#a5b4fc" : "#718096" }}>
              {fileName ? `✓ ${fileName}` : "Click to select CSV file"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {fileName
                ? `${preview.length} valid questions found`
                : "Supports .csv files — comma or semicolon separated"}
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </label>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="rounded-lg p-3 border" style={{ background: "#1a0a0a", borderColor: "#7f1d1d" }}>
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-3.5 w-3.5" /> {parseErrors.length} row(s) skipped due to errors:
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {parseErrors.map((e, i) => (
                <p key={i} className="text-xs text-red-400 font-mono">{e}</p>
              ))}
            </div>
          </div>
        )}

        {/* Preview summary */}
        {preview.length > 0 && (
          <div className="rounded-lg p-4 border" style={{ background: "#0a0f1a", borderColor: "#1e3a5f" }}>
            <p className="text-xs font-semibold text-blue-400 mb-3">
              Preview — {preview.length} questions ready to upload:
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(previewSummary).map(([key, count]) => (
                <span key={key} className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: "#1e3a5f", color: "#93c5fd" }}>
                  {key}: {count}
                </span>
              ))}
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              style={{
                background: uploading ? "#3730a3" : "#4f46e5",
                color: "#fff",
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4" /> Upload {preview.length} Questions to Supabase</>
              )}
            </button>
          </div>
        )}

        {/* Upload result */}
        {result && (
          <div className="rounded-lg p-4 border" style={{
            background: result.errors.length === 0 ? "#0a1a0a" : "#1a0f0a",
            borderColor: result.errors.length === 0 ? "#14532d" : "#7c2d12",
          }}>
            <div className="flex items-center gap-2 mb-3">
              {result.errors.length === 0
                ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                : <AlertTriangle className="h-4 w-4 text-amber-400" />
              }
              <p className="text-sm font-semibold" style={{ color: result.errors.length === 0 ? "#4ade80" : "#fb923c" }}>
                Upload Complete
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Total", value: result.total, color: "#94a3b8" },
                { label: "Inserted", value: result.inserted, color: "#4ade80" },
                { label: "Failed", value: result.skipped, color: "#f87171" },
              ].map((s) => (
                <div key={s.label} className="text-center rounded-lg p-2" style={{ background: "#0a0a1a" }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-gray-600">{s.label}</p>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400 font-mono">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Admin Dashboard
// ─────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, paidUsers: 0, freeUsers: 0, todayLogins: 0,
    totalQuestionsAllTime: 0, totalApiTokensUsedAllTime: 0, totalDatabaseRowsAllTime: 0,
    apiTokensUsedToday: 0, apiTokensLimit: 100000,
    databaseRowsUsed: 0, databaseRowsLimit: 500000,
    recentUsers: [], dailyLoginHistory: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [nextRefresh, setNextRefresh] = useState<number>(30);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact" });
      const { count: paidUsers } = await supabase.from("profiles").select("*", { count: "exact" }).eq("plan_type", "premium");

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { count: todayLogins } = await supabase.from("profiles").select("*", { count: "exact" }).gte("created_at", todayStart.toISOString());
      const { count: totalQuestions } = await supabase.from("student_questions").select("*", { count: "exact" });
      const { count: libraryQuestions } = await supabase.from("library_questions").select("*", { count: "exact" });

      const { data: apiUsageHistory } = await supabase.from("api_usage_logs").select("tokens_used").limit(1000);
      const totalApiTokensUsed = apiUsageHistory?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0;
      const estimatedApiTokens = totalApiTokensUsed > 0 ? totalApiTokensUsed : ((totalUsers || 0) * 500) + ((totalQuestions || 0) * 2);

      const { data: recentUsers } = await supabase.from("profiles").select("full_name, email, plan_type, created_at, departments").order("created_at", { ascending: false }).limit(10);
      const { data: todayUsage } = await supabase.from("api_usage_logs").select("tokens_used").gte("created_at", todayStart.toISOString());
      const apiTokensUsedToday = todayUsage?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0;

      const total = totalUsers || 0;
      const paid = paidUsers || 0;
      const dbRows = ((totalQuestions || 0) + (libraryQuestions || 0) + total);

      setStats({
        totalUsers: total, paidUsers: paid, freeUsers: total - paid, todayLogins: todayLogins || 0,
        totalQuestionsAllTime: (totalQuestions || 0) + (libraryQuestions || 0),
        totalApiTokensUsedAllTime: estimatedApiTokens,
        totalDatabaseRowsAllTime: dbRows,
        apiTokensUsedToday, apiTokensLimit: 100000,
        databaseRowsUsed: dbRows, databaseRowsLimit: 500000,
        recentUsers: recentUsers || [], dailyLoginHistory: [],
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
    setLoading(false);
    setLastUpdated(new Date());
    setNextRefresh(30);
  };

  useEffect(() => {
    fetchStats();
    const ri = setInterval(fetchStats, 30000);
    const ci = setInterval(() => setNextRefresh((p) => p <= 1 ? 30 : p - 1), 1000);
    return () => { clearInterval(ri); clearInterval(ci); };
  }, []);

  const handleLogout = () => { sessionStorage.removeItem("admin_auth"); navigate("/login"); };
  const paidPct = stats.totalUsers > 0 ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen" style={{ background: "#060612", color: "#fff" }}>

      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "#1e293b", background: "#0a0a1a" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-900/40 border border-red-800 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h1 className="font-bold text-white">📊 CrackDesk Admin Dashboard</h1>
            <p className="text-xs text-gray-500">Historical Data • Real-Time Updates</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 px-3 py-1.5 rounded-lg" style={{ background: "#0f172a" }}>
            <Zap className="h-3 w-3 text-amber-400" />
            <span>Refresh in: <span className="font-bold text-amber-400">{nextRefresh}s</span></span>
          </div>
          <span className="text-xs text-gray-500">Last: {lastUpdated.toLocaleTimeString()}</span>
          <button onClick={fetchStats} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-gray-700 hover:border-gray-500 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-900 hover:border-red-700 transition-colors">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* User Metrics */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Current User Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub="All registered" color="bg-blue-900/40 text-blue-400" />
            <StatCard icon={CreditCard} label="Paid Users" value={stats.paidUsers} sub={`${paidPct}% conversion`} color="bg-green-900/40 text-green-400" />
            <StatCard icon={UserX} label="Free Users" value={stats.freeUsers} sub="On free plan" color="bg-orange-900/40 text-orange-400" />
            <StatCard icon={LogIn} label="Signups Today" value={stats.todayLogins} sub="New accounts" color="bg-purple-900/40 text-purple-400" />
          </div>
        </div>

        {/* Historical Data */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" /> 📊 Historical Data (All-Time)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={Database} label="Total Questions in Library" value={stats.totalQuestionsAllTime.toLocaleString()} sub="All-time total" color="bg-cyan-900/40 text-cyan-400" history />
            <StatCard icon={Zap} label="API Tokens Used" value={stats.totalApiTokensUsedAllTime.toLocaleString()} sub="From start to now" color="bg-violet-900/40 text-violet-400" history />
            <StatCard icon={Database} label="Database Rows Used" value={stats.totalDatabaseRowsAllTime.toLocaleString()} sub="Questions + Users" color="bg-indigo-900/40 text-indigo-400" history />
          </div>
        </div>

        {/* Resource Usage */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" /> Resource Usage & Limits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProgressBar label="Database Rows (All-Time)" used={stats.databaseRowsUsed} total={stats.databaseRowsLimit} color="bg-blue-500" isHistorical />
            <ProgressBar label="API Tokens (All-Time)" used={stats.totalApiTokensUsedAllTime} total={stats.apiTokensLimit} color="bg-violet-500" isHistorical />
          </div>
        </div>

        {/* ✅ CSV UPLOAD SECTION */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-400" /> Question Library Management
          </h2>
          <CSVUploadSection />
        </div>

        {/* Plan Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-5 border" style={{ background: "#0f172a", borderColor: "#1e293b" }}>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Subscription Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: "Premium Users", value: stats.paidUsers, total: stats.totalUsers, color: "bg-green-500", textColor: "text-green-400" },
                { label: "Free Users", value: stats.freeUsers, total: stats.totalUsers, color: "bg-orange-500", textColor: "text-orange-400" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${item.color} inline-block`} /> {item.label}
                    </span>
                    <span className={`font-bold ${item.textColor}`}>{item.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-800">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-700`}
                      style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: "#0a0a1a" }}>
                  <p className="text-2xl font-bold text-green-400">{stats.paidUsers}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Paying</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "#0a0a1a" }}>
                  <p className="text-2xl font-bold text-orange-400">{stats.freeUsers}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Free</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-5 border" style={{ background: "#0f172a", borderColor: "#1e293b" }}>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">📊 All-Time Summary</h3>
            <div className="space-y-3">
              {[
                { icon: Users, label: "Total Registered Users", value: stats.totalUsers, color: "text-blue-400" },
                { icon: Database, label: "Questions in Library", value: stats.totalQuestionsAllTime.toLocaleString(), color: "text-cyan-400" },
                { icon: Zap, label: "API Tokens Used", value: stats.totalApiTokensUsedAllTime.toLocaleString(), color: "text-violet-400" },
                { icon: TrendingUp, label: "Database Rows Used", value: stats.totalDatabaseRowsAllTime.toLocaleString(), color: "text-indigo-400" },
                { icon: Activity, label: "Conversion Rate", value: `${paidPct}%`, color: "text-green-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#1e293b" }}>
                  <div className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm text-gray-400">{item.label}</span>
                  </div>
                  <span className={`font-bold text-sm ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "#0f172a", borderColor: "#1e293b" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#1e293b" }}>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent User Signups</h3>
            <span className="text-xs text-gray-600">Last 10 registrations</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#0a0a1a" }}>
                  {["Name", "Email", "Plan", "Departments", "Joined"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">Loading...</td></tr>
                ) : stats.recentUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No users yet</td></tr>
                ) : stats.recentUsers.map((user, i) => (
                  <tr key={i} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: "#1e293b" }}>
                    <td className="px-4 py-3 text-white font-medium">{user.full_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{user.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${user.plan_type === "premium" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                        {user.plan_type === "premium" ? "Premium" : "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {Array.isArray(user.departments) ? user.departments.slice(0, 3).join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="rounded-lg p-4 border text-xs text-gray-400" style={{ background: "#0a0a1a", borderColor: "#1e293b" }}>
          <p className="flex items-center gap-2 mb-1">
            <Zap className="h-3 w-3 text-amber-500" />
            <strong>Auto-refresh:</strong> All data updates every 30 seconds.
          </p>
          <p className="text-gray-500 ml-5">📊 Upload CSV to add questions • 20 random questions served per user per test</p>
        </div>

      </div>
    </div>
  );
}

