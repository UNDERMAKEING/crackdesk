import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, PhoneOff, Video, VideoOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { callInterviewAI } from "@/lib/interviewAI";

type Phase = "prep" | "live" | "done";
interface Violation { time: string; qNum: number; }
interface AnswerRecord { questionId: number; question: string; answer: string; }
interface Plan {
  role: string; level: string; focus_areas: string[];
  questions: { id: number; text: string; type: string; hint: string; }[];
}

/* ── Cream+Gold Palette from image ── */
const C = {
  cream:      "#F5EAD0",
  creamLight: "#FDF6E3",
  creamDeep:  "#EDD9AA",
  gold:       "#D4A843",
  goldLight:  "#F0C85A",
  goldDark:   "#B8891E",
  goldGlow:   "rgba(212,168,67,0.35)",
  white:      "#FFFFFF",
  text:       "#3D2B00",
  textMid:    "#7A5A1A",
  textLight:  "#A07830",
  border:     "rgba(212,168,67,0.45)",
  borderHot:  "#D4A843",
};

/* ── Flowing SVG background (matches the image curves) ── */
function CreamBg() {
  return (
    <svg
      style={{ position:"fixed", inset:0, width:"100%", height:"100%", zIndex:0, pointerEvents:"none" }}
      viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="800" height="600" fill="#F5EAD0"/>
      {/* Large cream base curve */}
      <path d="M-100 600 Q200 200 800 300 L800 600 Z" fill="#EDD9AA" opacity="0.6"/>
      {/* White flowing arc */}
      <path d="M-100 500 Q300 100 900 250" stroke="#FFFFFF" strokeWidth="60" fill="none" opacity="0.55"/>
      {/* Gold main curve */}
      <path d="M-100 520 Q300 120 900 270" stroke="#D4A843" strokeWidth="18" fill="none" opacity="0.7"/>
      {/* Gold thin accent */}
      <path d="M-100 545 Q300 145 900 295" stroke="#F0C85A" strokeWidth="6" fill="none" opacity="0.5"/>
      {/* Bottom fill */}
      <path d="M0 600 Q400 350 800 500 L800 600 Z" fill="#EDD9AA" opacity="0.4"/>
      {/* Top right soft glow */}
      <ellipse cx="750" cy="80" rx="300" ry="200" fill="#FDF6E3" opacity="0.4"/>
    </svg>
  );
}

/* ── AI Avatar — cream/gold style ── */
function AIAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center"
      style={{ background:"linear-gradient(160deg, #FDF6E3 0%, #EDD9AA 60%, #D4A843 100%)" }}>
      {/* Subtle curve overlay */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.25 }}
        viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <path d="M-50 300 Q150 80 450 150" stroke="#D4A843" strokeWidth="40" fill="none" opacity="0.5"/>
        <path d="M-50 280 Q150 60 450 130" stroke="#ffffff" strokeWidth="20" fill="none" opacity="0.6"/>
      </svg>

      <div className="flex flex-col items-center gap-3 relative z-10">
        <div className="relative">
          {speaking && (
            <>
              <motion.div className="absolute rounded-full"
                style={{ inset:"-14px", border:`2px solid ${C.gold}` }}
                animate={{ scale:[1,1.15,1], opacity:[0.9,0.1,0.9] }}
                transition={{ repeat:Infinity, duration:1.0 }} />
              <motion.div className="absolute rounded-full"
                style={{ inset:"-26px", border:`1px solid ${C.goldLight}` }}
                animate={{ scale:[1,1.2,1], opacity:[0.5,0.05,0.5] }}
                transition={{ repeat:Infinity, duration:1.4, delay:0.2 }} />
            </>
          )}
          <motion.div className="rounded-full overflow-hidden"
            style={{
              width:140, height:140,
              border: speaking ? `3px solid ${C.gold}` : `3px solid ${C.goldDark}`,
              boxShadow: speaking
                ? `0 0 28px ${C.goldGlow}, 0 0 56px ${C.goldGlow}`
                : `0 4px 20px rgba(212,168,67,0.3)`,
            }}
            animate={{ scale: speaking ? [1,1.02,1] : 1 }}
            transition={{ repeat: speaking ? Infinity : 0, duration:1.5 }}>
            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Aria"
              style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </motion.div>
        </div>

        <div className="text-center">
          <p style={{ fontFamily:"'Georgia',serif", fontWeight:700, color:C.text, fontSize:17, letterSpacing:3 }}>ARIA</p>
          <p style={{ color:C.textMid, fontSize:10, fontWeight:600, letterSpacing:4, textTransform:"uppercase" }}>AI Interviewer</p>
        </div>

        {/* Sound bars */}
        {speaking ? (
          <div className="flex items-end gap-1" style={{ height:20 }}>
            {[4,7,10,13,10,7,4,7,10,7,4].map((h,i) => (
              <motion.div key={i} style={{ width:3, borderRadius:2, background:C.gold }}
                animate={{ height:[`${h}px`,`${h*2}px`,`${h}px`] }}
                transition={{ repeat:Infinity, duration:0.45+i*0.04, delay:i*0.06 }} />
            ))}
          </div>
        ) : (
          <div className="flex items-end gap-1" style={{ height:20 }}>
            {[3,4,3,4,3,4,3,4,3,4,3].map((h,i) => (
              <div key={i} style={{ width:3, height:h, borderRadius:2, background:"rgba(212,168,67,0.3)" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ── */
export default function InterviewRoom() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [phase, setPhase] = useState<Phase>("prep");
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [tabBanner, setTabBanner] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [camError, setCamError] = useState("");

  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current; node.muted = true; node.playsInline = true;
      node.play().catch(() => {});
    }
  }, []);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const trySpeak = () => {
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred = ["Google UK English Female","Samantha","Karen","Victoria","Zira","Fiona"];
      let voice: SpeechSynthesisVoice | undefined;
      for (const name of preferred) { voice = voices.find(v => v.name.includes(name)); if (voice) break; }
      if (!voice) voice = voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (voice) utter.voice = voice;
      utter.pitch = 1.15; utter.rate = 0.92; utter.volume = 1;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length === 0) window.speechSynthesis.onvoiceschanged = trySpeak;
    else trySpeak();
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("iv_plan");
    if (!raw) { navigate("/ai-interview"); return; }
    try { setPlan(JSON.parse(raw)); } catch { navigate("/ai-interview"); }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Camera requires HTTPS or localhost."); setCamOn(false); setMicOn(false); return;
    }
    navigator.mediaDevices.getUserMedia({ video:true, audio:true })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) { v.srcObject = stream; v.muted = true; v.playsInline = true; v.play().catch(() => {}); }
      })
      .catch(err => {
        if (!active) return;
        setCamOn(false); setMicOn(false);
        setCamError(err.name === "NotAllowedError" ? "Camera blocked. Allow in browser settings." : `Camera error: ${err.message}`);
      });
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    const v = videoRef.current, s = streamRef.current;
    if (v && s && v.srcObject !== s) { v.srcObject = s; v.play().catch(() => {}); }
  });
  useEffect(() => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; }); }, [micOn]);
  useEffect(() => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOn; }); }, [camOn]);

  useEffect(() => {
    const handler = () => {
      if (document.hidden && phase === "live") {
        setViolations(prev => [...prev, { time: new Date().toLocaleTimeString(), qNum: currentQ+1 }]);
        setTabBanner(true); setTimeout(() => setTabBanner(false), 5000);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [phase, currentQ]);

  useEffect(() => {
    if (phase === "live") timerRef.current = setInterval(() => setElapsed(e => e+1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase === "live" && plan && !aiLoading) {
      const q = plan.questions[currentQ];
      if (q) setTimeout(() => speak(q.text), 400);
    }
  }, [currentQ, phase, aiLoading]);

  const toggleSpeech = useCallback(() => {
    if (listeningRef.current) {
      listeningRef.current = false; recognitionRef.current?.stop(); setListening(false); return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Please use Chrome."); return; }
    const startRec = () => {
      const rec = new SR();
      rec.continuous = false; rec.interimResults = true; rec.lang = "en-IN";
      rec.onresult = (e: any) => {
        let final = "", interim = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
          else interim += e.results[i][0].transcript;
        }
        setAnswer(prev => {
          const base = prev.trimEnd();
          if (final.trim()) return base ? base + " " + final.trim() : final.trim();
          return base ? base + " " + interim : interim;
        });
      };
      rec.onerror = (e: any) => {
        if (e.error === "no-speech" && listeningRef.current) startRec();
        else { listeningRef.current = false; setListening(false); }
      };
      rec.onend = () => { if (listeningRef.current) startRec(); else setListening(false); };
      rec.start(); recognitionRef.current = rec;
    };
    listeningRef.current = true; setListening(true); startRec();
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  const beginInterview = () => {
    if (!plan) return;
    speak(`Welcome! I'm Aria. Let's begin your ${plan.role} interview. Here's your first question.`);
    setPhase("live");
  };

  const submitAnswer = async () => {
    if (!plan || !answer.trim() || aiLoading) return;
    listeningRef.current = false; recognitionRef.current?.stop(); setListening(false);
    window.speechSynthesis.cancel();
    const q = plan.questions[currentQ];
    const record: AnswerRecord = { questionId:q.id, question:q.text, answer };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers); setAnswer("");
    if (currentQ === plan.questions.length - 1) {
      setPhase("done"); setAiLoading(true);
      try {
        const analysis = await callInterviewAI({
          action:"analyze",
          systemPrompt:`You are an expert interviewer. Analyze all answers and return ONLY a valid JSON object with no markdown: {"overallScore":75,"summary":"brief summary","strengths":["s1","s2","s3"],"improvements":["i1","i2"],"questionScores":[{"id":1,"score":80,"feedback":"brief"}]}`,
          userMessage:`Role: ${plan.role} (${plan.level})\n\n${newAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`,
          maxTokens:1500,
        });
        sessionStorage.setItem("iv_analysis", analysis);
      } catch {}
      sessionStorage.setItem("iv_answers", JSON.stringify(newAnswers));
      sessionStorage.setItem("iv_violations", JSON.stringify(violations));
      sessionStorage.setItem("iv_duration", String(elapsed));
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
      navigate("/ai-interview/analysis");
    } else {
      setAiLoading(true);
      setTimeout(() => { setCurrentQ(c => c+1); setAiLoading(false); }, 600);
    }
  };

  if (!plan) return null;
  const q = plan.questions[currentQ];
  const progress = (currentQ / plan.questions.length) * 100;

  /* Shared card style — cream glass */
  const card: React.CSSProperties = {
    background:"rgba(253,246,227,0.15)",
    backdropFilter:"blur(4px)",
    border:`1.5px solid rgba(212,168,67,0.4)`,
    borderRadius:16,
    boxShadow:`0 4px 24px rgba(212,168,67,0.15)`,
  };

  return (
    <div className="min-h-screen flex flex-col relative" style={{ fontFamily:"'Georgia',serif" }}>
      {/* Flowing cream+gold background */}
      <CreamBg />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col flex-1">

        {/* Violation banner */}
        <AnimatePresence>
          {tabBanner && (
            <motion.div initial={{ y:-56 }} animate={{ y:0 }} exit={{ y:-56 }}
              className="fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-bold"
              style={{ background:"#dc2626", color:"#fff", letterSpacing:1 }}>
              ⚠️ Tab switch detected! ({violations.length} violation{violations.length !== 1 ? "s" : ""})
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ PREP ═══ */}
        {phase === "prep" && (
          <div className="flex-1 flex items-center justify-center p-6">
            <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
              className="rounded-3xl p-10 text-center max-w-sm w-full relative"
              style={{
                background:"rgba(253,246,227,0.85)",
                backdropFilter:"blur(12px)",
                border:`2px solid ${C.gold}`,
                boxShadow:`0 8px 48px ${C.goldGlow}, 0 2px 0 ${C.white} inset`,
              }}>
              {/* Corner brackets */}
              {(["tl","tr","bl","br"] as const).map(corner => (
                <div key={corner} style={{
                  position:"absolute",
                  top: corner.startsWith("t") ? 12 : undefined,
                  bottom: corner.startsWith("b") ? 12 : undefined,
                  left: corner.endsWith("l") ? 12 : undefined,
                  right: corner.endsWith("r") ? 12 : undefined,
                  width:28, height:28,
                  borderTop: corner.startsWith("t") ? `2px solid ${C.gold}` : undefined,
                  borderBottom: corner.startsWith("b") ? `2px solid ${C.gold}` : undefined,
                  borderLeft: corner.endsWith("l") ? `2px solid ${C.gold}` : undefined,
                  borderRight: corner.endsWith("r") ? `2px solid ${C.gold}` : undefined,
                  borderRadius: corner==="tl"?"4px 0 0 0":corner==="tr"?"0 4px 0 0":corner==="bl"?"0 0 0 4px":"0 0 4px 0",
                }}/>
              ))}
              <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-5"
                style={{ border:`3px solid ${C.gold}`, boxShadow:`0 0 24px ${C.goldGlow}` }}>
                <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Aria"
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              </div>
              <h2 style={{ color:C.text, fontSize:26, fontWeight:700, letterSpacing:3, marginBottom:2 }}>ARIA</h2>
              <p style={{ color:C.textMid, fontSize:11, letterSpacing:5, textTransform:"uppercase", marginBottom:16 }}>
                Your AI Interviewer
              </p>
              <p style={{ color:C.textMid, fontSize:14, lineHeight:1.7, marginBottom:24 }}>
                Aria will interview you for{" "}
                <strong style={{ color:C.text }}>{plan.role}</strong> ({plan.level}),
                ask {plan.questions.length} tailored questions, and generate a full performance report.
              </p>
              {camError && (
                <div className="mb-4 rounded-xl p-3 text-xs text-left"
                  style={{ background:"#fef2f2", color:"#dc2626", border:"1px solid #fca5a5" }}>
                  ⚠️ {camError}
                </div>
              )}
              <button onClick={beginInterview}
                className="w-full h-12 rounded-xl text-base font-bold"
                style={{
                  background:`linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldLight})`,
                  color:C.white, letterSpacing:2, border:"none", cursor:"pointer",
                  boxShadow:`0 4px 20px ${C.goldGlow}`,
                }}>
                🎙️ BEGIN INTERVIEW
              </button>
            </motion.div>
          </div>
        )}

        {/* ═══ LIVE ═══ */}
        {phase === "live" && q && (
          <div className="flex-1 flex flex-col" style={{ minHeight:0 }}>

            {/* ── TOP BAR: Question + Timer — REFERENCE HEIGHT ── */}
            <div className="flex items-center gap-3 px-4 shrink-0"
              style={{
                height:56, /* ← exact height both bars will share */
                background:"rgba(253,246,227,0.85)",
                backdropFilter:"blur(8px)",
                borderBottom:`1.5px solid ${C.border}`,
                boxShadow:`0 2px 12px rgba(212,168,67,0.12)`,
              }}>

              {/* Question pill */}
              <div className="flex-1 flex items-center gap-3 overflow-hidden rounded-xl px-3 py-1.5"
                style={{ background:"rgba(212,168,67,0.12)", border:`1px solid ${C.border}`, height:38 }}>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ background:C.gold, color:C.white, letterSpacing:1 }}>
                  Q{currentQ+1}/{plan.questions.length}
                </span>
                <p className="truncate text-sm font-semibold" style={{ color:C.text }}>
                  {q.text}
                </p>
                <span className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium"
                  style={{ background:"rgba(212,168,67,0.18)", color:C.goldDark, border:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>
                  {q.type}
                </span>
              </div>

              {/* Timer — same height as question pill */}
              <div className="shrink-0 flex items-center gap-2 rounded-xl px-3"
                style={{
                  height:38,
                  background:"rgba(212,168,67,0.15)",
                  border:`1.5px solid ${C.border}`,
                  minWidth:110,
                }}>
                <span style={{ color:C.textLight, fontSize:9, letterSpacing:2, textTransform:"uppercase" }}>TIME</span>
                <span style={{
                  fontFamily:"'Courier New',monospace", fontSize:19, fontWeight:700,
                  color:C.goldDark, letterSpacing:2,
                }}>
                  {formatTime(elapsed)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ background:"#ef4444" }}/>
                  <span style={{ color:"#ef4444", fontSize:9, fontWeight:700, letterSpacing:2 }}>LIVE</span>
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 shrink-0" style={{ background:"rgba(212,168,67,0.2)" }}>
              <motion.div style={{ height:"100%", background:`linear-gradient(90deg,${C.goldDark},${C.gold})` }}
                animate={{ width:`${progress}%` }} transition={{ duration:0.5 }}/>
            </div>

            {/* ── VIDEO PANELS ── */}
            <div className="flex gap-3 p-3 flex-1 overflow-hidden" style={{ minHeight:0 }}>

              {/* Aria */}
              <div className="flex-1 rounded-2xl overflow-hidden relative" style={card}>
                <AIAvatar speaking={speaking}/>
                <div className="absolute bottom-3 left-3 rounded-xl px-3 py-1.5 flex items-center gap-2"
                  style={{ background:"rgba(253,246,227,0.88)", border:`1px solid ${C.border}`, backdropFilter:"blur(4px)" }}>
                  <div className="h-2 w-2 rounded-full" style={{ background:C.gold }}/>
                  <span style={{ color:C.textMid, fontSize:11, fontWeight:700, letterSpacing:2 }}>AI INTERVIEWER</span>
                </div>
              </div>

              {/* Candidate */}
              <div className="flex-1 rounded-2xl overflow-hidden relative"
                style={{ ...card, background:"rgba(237,217,170,0.25)" }}>
                <video ref={videoCallbackRef} autoPlay playsInline muted
                  style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)", display:camOn?"block":"none" }}/>
                {!camOn && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background:"rgba(212,168,67,0.15)", border:`1px solid ${C.border}` }}>
                      <VideoOff className="h-7 w-7" style={{ color:C.gold }}/>
                    </div>
                    {camError && <p className="text-xs text-center px-4" style={{ color:"#dc2626" }}>{camError}</p>}
                  </div>
                )}
                <div className="absolute bottom-3 left-3 rounded-xl px-3 py-1.5 flex items-center gap-2"
                  style={{ background:"rgba(253,246,227,0.88)", border:`1px solid ${C.border}`, backdropFilter:"blur(4px)" }}>
                  <div className="h-2 w-2 rounded-full" style={{ background:C.textMid }}/>
                  <span style={{ color:C.textMid, fontSize:11, fontWeight:700, letterSpacing:2 }}>CANDIDATE</span>
                </div>
                {listening && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{ background:"rgba(220,38,38,0.88)", border:"1px solid #ef4444" }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"/>
                    <span style={{ fontSize:10, fontWeight:700, color:"#fff", letterSpacing:2 }}>REC</span>
                  </div>
                )}
                {/* Cam + mic toggles */}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button onClick={() => setCamOn(c => !c)}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: camOn?"rgba(212,168,67,0.85)":"rgba(220,38,38,0.85)", border:"none", cursor:"pointer" }}>
                    {camOn ? <Video className="h-4 w-4 text-white"/> : <VideoOff className="h-4 w-4 text-white"/>}
                  </button>
                  <button onClick={() => setMicOn(m => !m)}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: micOn?"rgba(212,168,67,0.85)":"rgba(220,38,38,0.85)", border:"none", cursor:"pointer" }}>
                    {micOn ? <Mic className="h-4 w-4 text-white"/> : <MicOff className="h-4 w-4 text-white"/>}
                  </button>
                </div>
              </div>
            </div>

            {/* ── ANSWER BAR — EXACT SAME HEIGHT AS QUESTION BAR (56px) ── */}
            <div className="flex items-center gap-3 px-4 shrink-0"
              style={{
                height:56, /* ← matches top bar exactly */
                background:"rgba(253,246,227,0.92)",
                backdropFilter:"blur(8px)",
                borderTop:`1.5px solid ${C.border}`,
                boxShadow:`0 -2px 12px rgba(212,168,67,0.12)`,
              }}>

              {/* Answer input — same height as question pill */}
              <div className="flex-1 flex items-center rounded-xl overflow-hidden"
                style={{
                  height:38,
                  background:"#ffffff",
                  border:`1.5px solid ${listening ? C.gold : C.border}`,
                  boxShadow: listening ? `0 0 10px ${C.goldGlow}` : "0 1px 4px rgba(212,168,67,0.15)",
                  transition:"border-color 0.2s, box-shadow 0.2s",
                }}>
                <input
                  type="text"
                  className="flex-1 h-full px-4 text-sm outline-none bg-transparent"
                  style={{ color:C.text, fontFamily:"'Georgia',serif" }}
                  placeholder={listening ? "Listening... speak now" : "Type your answer or use mic..."}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(); }}}
                />
              </div>

              {/* Mic button */}
              <button onClick={toggleSpeech}
                className="flex items-center gap-1.5 rounded-xl px-3 text-xs font-bold shrink-0"
                style={{
                  height:38,
                  background: listening ? "rgba(220,38,38,0.12)" : "rgba(212,168,67,0.15)",
                  border:`1.5px solid ${listening ? "#ef4444" : C.border}`,
                  color: listening ? "#dc2626" : C.goldDark,
                  cursor:"pointer", letterSpacing:1, whiteSpace:"nowrap",
                }}>
                {listening
                  ? <><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>&nbsp;Stop</>
                  : <><Mic className="h-3.5 w-3.5"/>Mic</>}
              </button>

              {/* Submit */}
              <button onClick={submitAnswer} disabled={aiLoading || !answer.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 font-bold text-xs shrink-0"
                style={{
                  height:38,
                  background: aiLoading || !answer.trim()
                    ? "rgba(212,168,67,0.15)"
                    : `linear-gradient(90deg,${C.goldDark},${C.gold})`,
                  color: aiLoading || !answer.trim() ? C.textLight : C.white,
                  border:`1.5px solid ${aiLoading || !answer.trim() ? C.border : C.gold}`,
                  cursor: aiLoading || !answer.trim() ? "not-allowed" : "pointer",
                  letterSpacing:1, whiteSpace:"nowrap",
                  boxShadow: !aiLoading && answer.trim() ? `0 2px 12px ${C.goldGlow}` : "none",
                  transition:"all 0.2s",
                }}>
                {aiLoading
                  ? <Loader2 className="h-4 w-4 animate-spin"/>
                  : currentQ === plan.questions.length - 1
                    ? "✓ Finish"
                    : "Next →"}
              </button>

              {/* End call */}
              <button
                onClick={() => {
                  listeningRef.current = false; recognitionRef.current?.stop();
                  streamRef.current?.getTracks().forEach(t => t.stop());
                  window.speechSynthesis.cancel(); navigate("/ai-interview");
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:"rgba(220,38,38,0.12)", border:"1.5px solid rgba(220,38,38,0.35)", cursor:"pointer" }}>
                <PhoneOff className="h-4 w-4 text-red-400"/>
              </button>
            </div>
          </div>
        )}

        {/* ═══ DONE ═══ */}
        {phase === "done" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 rounded-3xl p-12"
              style={{
                background:"rgba(253,246,227,0.85)", backdropFilter:"blur(12px)",
                border:`2px solid ${C.gold}`, boxShadow:`0 8px 48px ${C.goldGlow}`,
              }}>
              <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1.2, ease:"linear" }}
                style={{ width:48, height:48, margin:"0 auto" }}>
                <Loader2 className="h-12 w-12" style={{ color:C.gold }}/>
              </motion.div>
              <p style={{ fontSize:20, fontWeight:700, color:C.text, letterSpacing:2 }}>INTERVIEW COMPLETE</p>
              <p style={{ color:C.textMid, fontSize:13, letterSpacing:1 }}>Generating your performance report...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}