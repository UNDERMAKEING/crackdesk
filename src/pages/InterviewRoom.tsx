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

const G = {
  gold:      "#F5C518",
  goldLight: "#FFD740",
  goldDark:  "#C9A000",
  goldGlow:  "rgba(245,197,24,0.35)",
  white:     "#FFFFFF",
  offWhite:  "#FFF8E7",
  dark:      "#0D0D0D",
  border:    "rgba(245,197,24,0.4)",
};

/* ─── AI Avatar ─── */
function AIAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #1a1200 0%, #0D0D0D 70%)" }}>
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.07 }}
        viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        {[0,1,2,3,4].map(i => <line key={i} x1={i*100} y1="0" x2={i*100} y2="300" stroke="#F5C518" strokeWidth="1"/>)}
        {[0,1,2,3].map(i => <line key={i} x1="0" y1={i*100} x2="400" y2={i*100} stroke="#F5C518" strokeWidth="1"/>)}
      </svg>
      <div className="flex flex-col items-center gap-3 relative z-10">
        <div className="relative">
          {speaking && (
            <>
              <motion.div className="absolute rounded-full"
                style={{ inset:"-16px", border:`2px solid ${G.goldLight}` }}
                animate={{ scale:[1,1.15,1], opacity:[0.9,0.1,0.9] }}
                transition={{ repeat:Infinity, duration:1.0 }} />
              <motion.div className="absolute rounded-full"
                style={{ inset:"-28px", border:`1px solid ${G.gold}` }}
                animate={{ scale:[1,1.2,1], opacity:[0.6,0.05,0.6] }}
                transition={{ repeat:Infinity, duration:1.4, delay:0.2 }} />
            </>
          )}
          <motion.div className="rounded-full overflow-hidden"
            style={{
              width:150, height:150,
              border: speaking ? `3px solid ${G.goldLight}` : `3px solid ${G.goldDark}`,
              boxShadow: speaking ? `0 0 30px ${G.goldGlow}, 0 0 60px ${G.goldGlow}` : `0 0 12px rgba(245,197,24,0.15)`,
            }}
            animate={{ scale: speaking ? [1,1.02,1] : 1 }}
            transition={{ repeat: speaking ? Infinity : 0, duration:1.5 }}>
            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Aria"
              style={{ width:"100%", height:"100%", objectFit:"cover",
                filter: speaking ? "brightness(1.1)" : "brightness(0.9)" }} />
          </motion.div>
        </div>
        <div className="text-center">
          <p style={{ fontFamily:"'Georgia',serif", fontWeight:700, color:G.gold, fontSize:18, letterSpacing:2 }}>ARIA</p>
          <p style={{ color:"rgba(245,197,24,0.6)", fontSize:10, fontWeight:600, letterSpacing:4, textTransform:"uppercase" }}>AI Interviewer</p>
        </div>
        {speaking ? (
          <div className="flex items-end gap-1" style={{ height:22 }}>
            {[4,7,11,14,11,7,4,7,11,7,4].map((h,i) => (
              <motion.div key={i} style={{ width:3, borderRadius:2, background:G.goldLight }}
                animate={{ height:[`${h}px`,`${h*2.2}px`,`${h}px`] }}
                transition={{ repeat:Infinity, duration:0.45+i*0.04, delay:i*0.06 }} />
            ))}
          </div>
        ) : (
          <div className="flex items-end gap-1" style={{ height:22 }}>
            {[3,4,3,4,3,4,3,4,3,4,3].map((h,i) => (
              <div key={i} style={{ width:3, height:h, borderRadius:2, background:"rgba(245,197,24,0.2)" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function InterviewRoom() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false); // ← tracks listening for mic restart

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
      node.srcObject = streamRef.current;
      node.muted = true; node.playsInline = true;
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
      setCamError("Camera requires HTTPS or localhost.");
      setCamOn(false); setMicOn(false); return;
    }
    navigator.mediaDevices.getUserMedia({ video:true, audio:true })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) { video.srcObject = stream; video.muted = true; video.playsInline = true; video.play().catch(() => {}); }
      })
      .catch(err => {
        if (!active) return;
        setCamOn(false); setMicOn(false);
        setCamError(err.name === "NotAllowedError" ? "Camera blocked. Allow in browser settings." : `Camera error: ${err.message}`);
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current, stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) { video.srcObject = stream; video.play().catch(() => {}); }
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

  /* ── Fixed mic: proper final/interim split + auto-restart on silence ── */
  const toggleSpeech = useCallback(() => {
    if (listeningRef.current) {
      listeningRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Please use Chrome."); return; }

    const startRec = () => {
      const rec = new SR();
      rec.continuous = false;       // ← false + auto-restart gives better results
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onresult = (e: any) => {
        let finalText = "";
        let interimText = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalText += e.results[i][0].transcript + " ";
          } else {
            interimText += e.results[i][0].transcript;
          }
        }
        // Append final text to existing answer, show interim live
        setAnswer(prev => {
          const base = prev.trimEnd();
          if (finalText.trim()) return base ? base + " " + finalText.trim() : finalText.trim();
          return base ? base + " " + interimText : interimText;
        });
      };

      rec.onerror = (e: any) => {
        if (e.error === "no-speech") {
          // auto-restart on silence if still listening
          if (listeningRef.current) startRec();
        } else {
          listeningRef.current = false;
          setListening(false);
        }
      };

      rec.onend = () => {
        // auto-restart if still supposed to be listening
        if (listeningRef.current) startRec();
        else setListening(false);
      };

      rec.start();
      recognitionRef.current = rec;
    };

    listeningRef.current = true;
    setListening(true);
    startRec();
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
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    window.speechSynthesis.cancel();
    const q = plan.questions[currentQ];
    const record: AnswerRecord = { questionId: q.id, question: q.text, answer };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers); setAnswer("");
    if (currentQ === plan.questions.length - 1) {
      setPhase("done"); setAiLoading(true);
      try {
        const analysis = await callInterviewAI({
          action: "analyze",
          systemPrompt: `You are an expert interviewer. Analyze all answers and return ONLY a valid JSON object with no markdown: {"overallScore":75,"summary":"brief summary","strengths":["s1","s2","s3"],"improvements":["i1","i2"],"questionScores":[{"id":1,"score":80,"feedback":"brief"}]}`,
          userMessage: `Role: ${plan.role} (${plan.level})\n\n${newAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`,
          maxTokens: 1500,
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

  const card: React.CSSProperties = {
    background: "linear-gradient(145deg, #1a1200 0%, #0D0D0D 100%)",
    border: `1.5px solid ${G.border}`,
    borderRadius: 16,
    boxShadow: `0 0 20px rgba(245,197,24,0.08), inset 0 1px 0 rgba(245,197,24,0.12)`,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: `
        radial-gradient(ellipse at 20% 10%, rgba(245,197,24,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 90%, rgba(245,197,24,0.08) 0%, transparent 50%),
        linear-gradient(160deg, #0D0900 0%, #0D0D0D 50%, #090900 100%)
      `,
      color: G.white,
      fontFamily: "'Georgia', serif",
    }}>

      {/* Violation banner */}
      <AnimatePresence>
        {tabBanner && (
          <motion.div initial={{ y:-56 }} animate={{ y:0 }} exit={{ y:-56 }}
            className="fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-bold"
            style={{ background:"#dc2626", letterSpacing:1 }}>
            ⚠️ Tab switch detected! ({violations.length} violation{violations.length !== 1 ? "s" : ""})
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PREP ═══ */}
      {phase === "prep" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
            className="rounded-3xl p-10 text-center max-w-sm w-full relative overflow-hidden"
            style={{
              background:"linear-gradient(160deg, #1a1200 0%, #0D0D0D 100%)",
              border:`2px solid ${G.gold}`,
              boxShadow:`0 0 60px ${G.goldGlow}, 0 0 120px rgba(245,197,24,0.1)`,
            }}>
            {/* Corner brackets */}
            {[["top-4 left-4","borderTop borderLeft","4px 0 0 0"],["top-4 right-4","borderTop borderRight","0 4px 0 0"],
              ["bottom-4 left-4","borderBottom borderLeft","0 0 0 4px"],["bottom-4 right-4","borderBottom borderRight","0 0 4px 0"]
            ].map(([pos,_,radius],i) => (
              <div key={i} className={`absolute ${pos}`} style={{
                width:32, height:32,
                borderTop: pos.includes("top") ? `2px solid ${G.gold}` : undefined,
                borderBottom: pos.includes("bottom") ? `2px solid ${G.gold}` : undefined,
                borderLeft: pos.includes("left") ? `2px solid ${G.gold}` : undefined,
                borderRight: pos.includes("right") ? `2px solid ${G.gold}` : undefined,
                borderRadius: radius,
              }} />
            ))}
            <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-5"
              style={{ border:`3px solid ${G.gold}`, boxShadow:`0 0 30px ${G.goldGlow}` }}>
              <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Aria"
                style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
            <h2 style={{ color:G.gold, fontSize:28, fontWeight:700, letterSpacing:3, marginBottom:2 }}>ARIA</h2>
            <p style={{ color:"rgba(245,197,24,0.6)", fontSize:11, letterSpacing:5, textTransform:"uppercase", marginBottom:16 }}>
              Your AI Interviewer
            </p>
            <p style={{ color:"rgba(255,255,255,0.65)", fontSize:14, lineHeight:1.7, marginBottom:24 }}>
              Aria will interview you for <strong style={{ color:G.white }}>{plan.role}</strong> ({plan.level}),
              ask {plan.questions.length} tailored questions, and generate a full performance report.
            </p>
            {camError && (
              <div className="mb-5 rounded-xl p-3 text-xs text-left"
                style={{ background:"#450a0a", color:"#fca5a5", border:"1px solid #991b1b" }}>
                ⚠️ {camError}
              </div>
            )}
            <button onClick={beginInterview}
              className="w-full h-12 rounded-xl text-base font-bold"
              style={{
                background:`linear-gradient(90deg, ${G.goldDark}, ${G.gold}, ${G.goldLight})`,
                color:G.dark, letterSpacing:2, border:"none", cursor:"pointer",
                boxShadow:`0 4px 24px ${G.goldGlow}`,
              }}>
              🎙️ BEGIN INTERVIEW
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══ LIVE ═══ */}
      {phase === "live" && q && (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight:0 }}>

          {/* ── TOP BAR: Question + Timer ── */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{
              background:"linear-gradient(90deg, #0D0900, #1a1200 50%, #0D0900)",
              borderBottom:`1.5px solid ${G.border}`,
            }}>
            {/* Question pill */}
            <div className="flex-1 rounded-xl px-4 py-2 flex items-center gap-3 overflow-hidden"
              style={{ background:"linear-gradient(90deg, #1a1200, #0D0D0D)", border:`1px solid ${G.border}` }}>
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ background:G.goldDark, color:G.dark, letterSpacing:1 }}>
                Q{currentQ+1}/{plan.questions.length}
              </span>
              <p className="truncate text-sm font-medium" style={{ color:G.offWhite }}>{q.text}</p>
              <span className="shrink-0 rounded-lg px-2 py-0.5 text-xs"
                style={{ background:"rgba(245,197,24,0.12)", color:G.gold, border:`1px solid ${G.border}` }}>
                {q.type}
              </span>
            </div>

            {/* Timer */}
            <div className="shrink-0 rounded-xl px-4 py-2 flex items-center gap-2"
              style={{
                background:"linear-gradient(135deg, #1a1200, #0D0D0D)",
                border:`1.5px solid ${G.border}`,
                boxShadow:`0 0 16px rgba(245,197,24,0.15)`,
                minWidth:110,
              }}>
              <span style={{ color:G.gold, fontSize:10, letterSpacing:2 }}>TIME</span>
              <span style={{
                fontFamily:"'Courier New',monospace", fontSize:20, fontWeight:700,
                color:G.goldLight, letterSpacing:2, textShadow:`0 0 12px ${G.goldGlow}`,
              }}>{formatTime(elapsed)}</span>
              <span className="flex items-center gap-1 ml-1">
                <span className="h-2 w-2 rounded-full animate-pulse" style={{ background:"#ef4444" }} />
                <span style={{ color:"#ef4444", fontSize:9, fontWeight:700, letterSpacing:2 }}>LIVE</span>
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 shrink-0" style={{ background:"rgba(245,197,24,0.1)" }}>
            <motion.div style={{ height:"100%", background:`linear-gradient(90deg, ${G.goldDark}, ${G.gold})` }}
              animate={{ width:`${progress}%` }} transition={{ duration:0.5 }} />
          </div>

          {/* ── VIDEO PANELS ── */}
          <div className="flex gap-3 p-3 flex-1 overflow-hidden" style={{ minHeight:0 }}>

            {/* Aria */}
            <div className="flex-1 rounded-2xl overflow-hidden relative" style={card}>
              <AIAvatar speaking={speaking} />
              <div className="absolute bottom-3 left-3 rounded-xl px-3 py-1.5 flex items-center gap-2"
                style={{ background:"rgba(13,9,0,0.85)", border:`1px solid ${G.border}` }}>
                <div className="h-2 w-2 rounded-full" style={{ background:G.gold }} />
                <span style={{ color:G.gold, fontSize:11, fontWeight:700, letterSpacing:2 }}>AI INTERVIEWER</span>
              </div>
            </div>

            {/* Candidate */}
            <div className="flex-1 rounded-2xl overflow-hidden relative" style={{ ...card, background:"#080808" }}>
              <video ref={videoCallbackRef} autoPlay playsInline muted
                style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)", display: camOn ? "block" : "none" }} />
              {!camOn && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background:"rgba(245,197,24,0.08)", border:`1px solid ${G.border}` }}>
                    <VideoOff className="h-7 w-7" style={{ color:G.goldDark }} />
                  </div>
                  {camError && <p className="text-xs text-red-400 text-center px-4">{camError}</p>}
                </div>
              )}
              <div className="absolute bottom-3 left-3 rounded-xl px-3 py-1.5 flex items-center gap-2"
                style={{ background:"rgba(13,9,0,0.85)", border:`1px solid ${G.border}` }}>
                <div className="h-2 w-2 rounded-full bg-white" />
                <span style={{ color:G.white, fontSize:11, fontWeight:700, letterSpacing:2 }}>CANDIDATE</span>
              </div>
              {listening && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1"
                  style={{ background:"rgba(220,38,38,0.9)", border:"1px solid #ef4444" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span style={{ fontSize:10, fontWeight:700, color:"#fff", letterSpacing:2 }}>REC</span>
                </div>
              )}
              {/* Cam + mic toggles */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button onClick={() => setCamOn(c => !c)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: camOn ? "rgba(245,197,24,0.85)" : "rgba(220,38,38,0.85)", border:"none", cursor:"pointer" }}>
                  {camOn ? <Video className="h-4 w-4" style={{ color:G.dark }} /> : <VideoOff className="h-4 w-4 text-white" />}
                </button>
                <button onClick={() => setMicOn(m => !m)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: micOn ? "rgba(245,197,24,0.85)" : "rgba(220,38,38,0.85)", border:"none", cursor:"pointer" }}>
                  {micOn ? <Mic className="h-4 w-4" style={{ color:G.dark }} /> : <MicOff className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── ANSWER BAND — compact white ── */}
          <div className="shrink-0 flex flex-col gap-2 px-3 py-3"
            style={{
              background:"linear-gradient(180deg, #fffde0 0%, #ffffff 100%)",
              borderTop:`2px solid ${G.gold}`,
              boxShadow:`0 -4px 24px rgba(245,197,24,0.18)`,
            }}>
            {/* Hint */}
            {q.hint && (
              <p style={{ color:"#8a6f00", fontSize:11, fontStyle:"italic", paddingLeft:2 }}>
                💡 {q.hint}
              </p>
            )}

            {/* Textarea — same compact height as question bar */}
            <textarea
              rows={2}
              className="w-full rounded-xl px-4 py-2.5 text-sm resize-none outline-none"
              style={{
                background:"#ffffff",
                border:`1.5px solid ${listening ? G.gold : "rgba(201,160,0,0.4)"}`,
                color:"#1a1200",
                height:60,
                fontFamily:"'Georgia', serif",
                boxShadow: listening ? `0 0 12px ${G.goldGlow}` : "0 1px 4px rgba(0,0,0,0.08)",
                transition:"border-color 0.2s, box-shadow 0.2s",
              }}
              placeholder="Type your answer here or use the mic..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
            />

            {/* Buttons */}
            <div className="flex gap-2">
              {/* Mic */}
              <button onClick={toggleSpeech}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold shrink-0"
                style={{
                  background: listening ? "rgba(220,38,38,0.1)" : "rgba(245,197,24,0.15)",
                  border:`1.5px solid ${listening ? "#ef4444" : G.goldDark}`,
                  color: listening ? "#dc2626" : G.goldDark,
                  cursor:"pointer", letterSpacing:1,
                }}>
                {listening
                  ? <><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />Listening...</>
                  : <><Mic className="h-3.5 w-3.5" />Use Mic</>}
              </button>

              {/* Submit */}
              <button onClick={submitAnswer} disabled={aiLoading || !answer.trim()}
                className="flex-1 rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background: aiLoading || !answer.trim()
                    ? "rgba(245,197,24,0.12)"
                    : `linear-gradient(90deg, ${G.goldDark}, ${G.gold}, ${G.goldLight})`,
                  color: aiLoading || !answer.trim() ? "rgba(201,160,0,0.4)" : G.dark,
                  border:`1.5px solid ${aiLoading || !answer.trim() ? "rgba(245,197,24,0.2)" : G.gold}`,
                  cursor: aiLoading || !answer.trim() ? "not-allowed" : "pointer",
                  letterSpacing:1,
                  boxShadow: !aiLoading && answer.trim() ? `0 4px 20px ${G.goldGlow}` : "none",
                  transition:"all 0.2s",
                }}>
                {aiLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : currentQ === plan.questions.length - 1
                    ? "✓ FINISH INTERVIEW"
                    : "NEXT QUESTION →"}
              </button>

              {/* End call */}
              <button
                onClick={() => {
                  listeningRef.current = false;
                  recognitionRef.current?.stop();
                  streamRef.current?.getTracks().forEach(t => t.stop());
                  window.speechSynthesis.cancel();
                  navigate("/ai-interview");
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:"rgba(220,38,38,0.15)", border:"1.5px solid rgba(220,38,38,0.4)", cursor:"pointer" }}>
                <PhoneOff className="h-4 w-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DONE ═══ */}
      {phase === "done" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1.2, ease:"linear" }}
              style={{ width:48, height:48, margin:"0 auto" }}>
              <Loader2 className="h-12 w-12" style={{ color:G.gold, filter:`drop-shadow(0 0 12px ${G.goldGlow})` }} />
            </motion.div>
            <p style={{ fontSize:20, fontWeight:700, color:G.gold, letterSpacing:2 }}>INTERVIEW COMPLETE</p>
            <p style={{ color:"rgba(245,197,24,0.5)", fontSize:13, letterSpacing:1 }}>Generating your performance report...</p>
          </div>
        </div>
      )}
    </div>
  );
}