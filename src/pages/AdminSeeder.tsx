import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { DEPARTMENTS, seedDepartmentLevel, getLibraryStatus } from "@/lib/studentQuestions";

const LEVELS = ["easy", "medium", "hard"] as const;
const TARGET = 50;

type StatusMap = Record<string, Record<string, number>>;

export default function AdminSeeder() {
  const [status, setStatus] = useState<StatusMap>({});
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState("");

  const log = (msg: string) => setLogs((p) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p]);

  const refreshStatus = async () => {
    setLoadingStatus(true);
    const s = await getLibraryStatus();
    setStatus(s);
    setLoadingStatus(false);
  };

  useEffect(() => { refreshStatus(); }, []);

  const seedOne = async (dept: string, level: string) => {
    if (running) return;
    setRunning(true);
    setCurrentJob(`${dept} / ${level}`);
    log(`Starting ${dept} ${level}...`);

    const result = await seedDepartmentLevel(dept, level, (msg) => log(msg));

    if (result.success) {
      log(`✅ ${dept} ${level} — ${result.inserted} questions inserted`);
    } else {
      log(`❌ ${dept} ${level} failed — ${result.error}`);
    }

    await refreshStatus();
    setRunning(false);
    setCurrentJob("");
  };

  const seedAll = async () => {
    if (running) return;
    setRunning(true);
    log("🚀 Starting full seed for all departments and levels...");

    for (const dept of DEPARTMENTS) {
      for (const level of LEVELS) {
        const existing = status[dept.key]?.[level] ?? 0;
        if (existing >= TARGET) {
          log(`⏭️ Skipping ${dept.key} ${level} — already has ${existing} questions`);
          continue;
        }
        setCurrentJob(`${dept.key} / ${level}`);
        const result = await seedDepartmentLevel(dept.key, level, (msg) => log(msg));
        if (result.success) {
          log(`✅ ${dept.key} ${level} — ${result.inserted} inserted`);
        } else {
          log(`❌ ${dept.key} ${level} — ${result.error}`);
        }
        await refreshStatus();
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setRunning(false);
    setCurrentJob("");
    log("🎉 Full seed complete!");
  };

  const getColor = (count: number) => {
    if (count >= TARGET) return { bg: "#dcfce7", text: "#15803d", label: `${count} ✓` };
    if (count > 0) return { bg: "#fef9c3", text: "#a16207", label: `${count}` };
    return { bg: "#fee2e2", text: "#b91c1c", label: "0" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Library Question Seeder</h1>
          <p style={{ color: "#64748b", marginTop: 4, fontSize: 14 }}>
            Generate and store 50 questions per department per level. Run once — users read instantly.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <button
            onClick={seedAll}
            disabled={running}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: running ? "#94a3b8" : "#6366f1", color: "#fff",
              fontWeight: 600, cursor: running ? "not-allowed" : "pointer", fontSize: 14,
            }}
          >
            {running ? `⏳ Running: ${currentJob}` : "🚀 Seed All Missing"}
          </button>
          <button
            onClick={refreshStatus}
            disabled={loadingStatus}
            style={{
              padding: "10px 20px", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#fff",
              fontWeight: 500, cursor: "pointer", fontSize: 14,
            }}
          >
            🔄 Refresh Status
          </button>
          <span style={{ alignSelf: "center", fontSize: 13, color: "#64748b" }}>
            Target: {TARGET} questions per cell
          </span>
        </div>

        {/* Status grid */}
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 12, overflow: "hidden", marginBottom: 24,
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: "#64748b", fontWeight: 600 }}>Department</th>
                {LEVELS.map((l) => (
                  <th key={l} style={{ padding: "10px 14px", textAlign: "center", fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "capitalize" }}>
                    {l}
                  </th>
                ))}
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 12, color: "#64748b", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((dept, i) => (
                <tr key={dept.key} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>
                    <span style={{ marginRight: 6 }}>{dept.icon}</span>
                    <strong>{dept.key}</strong>
                    <span style={{ color: "#94a3b8", marginLeft: 6, fontSize: 12 }}>{dept.label}</span>
                  </td>
                  {LEVELS.map((level) => {
                    const count = status[dept.key]?.[level] ?? 0;
                    const { bg, text, label } = getColor(count);
                    return (
                      <td key={level} style={{ padding: "10px 14px", textAlign: "center" }}>
                        {loadingStatus ? (
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>...</span>
                        ) : (
                          <span style={{
                            background: bg, color: text,
                            borderRadius: 6, padding: "2px 10px",
                            fontSize: 12, fontWeight: 600,
                          }}>{label}</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      {LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => seedOne(dept.key, level)}
                          disabled={running}
                          title={`Seed ${dept.key} ${level}`}
                          style={{
                            padding: "3px 8px", borderRadius: 5, fontSize: 11,
                            border: "1px solid #e2e8f0", background: "#fff",
                            cursor: running ? "not-allowed" : "pointer",
                            color: "#475569", fontWeight: 500,
                          }}
                        >
                          {level[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, fontSize: 12 }}>
          {[
            { bg: "#dcfce7", text: "#15803d", label: `≥${TARGET} questions — ready` },
            { bg: "#fef9c3", text: "#a16207", label: "Partial — needs more" },
            { bg: "#fee2e2", text: "#b91c1c", label: "Empty — not generated" },
          ].map((c) => (
            <span key={c.label} style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>
              {c.label}
            </span>
          ))}
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 16, maxHeight: 280, overflowY: "auto" }}>
            <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8, fontWeight: 600 }}>LOGS</p>
            {logs.map((l, i) => (
              <div key={i} style={{
                fontSize: 12, fontFamily: "monospace", padding: "2px 0",
                color: l.includes("✅") ? "#86efac" : l.includes("❌") ? "#fca5a5" : "#e2e8f0",
              }}>
                {l}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

