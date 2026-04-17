import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { callInterviewAI } from "@/lib/interviewAI";

type Phase = "prep" | "live" | "done";
interface Violation { time: string; qNum: number; }
interface AnswerRecord { questionId: number; question: string; answer: string; }
interface Plan { role: string; level: string; focus_areas: string[]; questions: { id: number; text: string; type: string; hint: string; }[]; }

function AIAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {speaking && (
            <motion.div
              className="absolute rounded-full border-2 border-indigo-400"
              style={{ inset: "-10px" }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.8, 0.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.2 }} />
          )}
          <motion.div
            className="rounded-full overflow-hidden"
            style={{ width: 180, height: 180, border: speaking ? "3px solid #818cf8" : "3px solid #4f46e5" }}
            animate={{ scale: speaking ? [1, 1.02, 1] : 1 }}
            transition={{ repeat: speaking ? Infinity : 0, duration: 1.5 }}>
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="Aria"
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: speaking ? "brightness(1.05)" : "brightness(0.95)" }}
            />
          </motion.div>
        </div>
        <div className="text-center">
          <p className="font-bold text-white text-lg">Aria</p>
          <p className="text-indigo-300 text-xs font-medium tracking-widest uppercase">AI Interviewer</p>
        </div>
        {speaking ? (
          <div className="flex items-end gap-1" style={{ height: 24 }}>
            {[3, 5, 8, 11, 8, 5, 3, 5, 8, 5, 3].map((h, i) => (
              <motion.div key={i} className="w-1 rounded-full bg-indigo-400"
                animate={{ height: [`${h}px`, `${h * 2.5}px`, `${h}px`] }}
                transition={{ repeat: Infinity, duration: 0.5 + i * 0.04, delay: i * 0.07 }} />
            ))}
          </div>
        ) : (
          <div className="flex items-end gap-1" style={{ height: 24 }}>
            {[3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-indigo-900" style={{ height: `${h}px` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InterviewRoom() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);

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

  // Callback ref — attaches stream the instant video element exists in DOM
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.muted = true;
      node.playsInline = true;
      node.play().catch(() => {});
    }
  }, []);

  // Female voice
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const trySpeak = () => {
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred = ["Google UK English Female", "Samantha", "Karen", "Victoria", "Zira", "Fiona"];
      let voice: SpeechSynthesisVoice | undefined;
      for (const name of preferred) {
        voice = voices.find(v => v.name.includes(name));
        if (voice) break;
      }
      if (!voice) voice = voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (voice) utter.voice = voice;
      utter.pitch = 1.15;
      utter.rate = 0.92;
      utter.volume = 1;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = trySpeak;
    } else {
      trySpeak();
    }
  }, []);

  // Load plan
  useEffect(() => {
    const raw = sessionStorage.getItem("iv_plan");
    if (!raw) { navigate("/ai-interview"); return; }
    try { setPlan(JSON.parse(raw)); } catch { navigate("/ai-interview"); }
  }, [navigate]);

  // Camera init
useEffect(() => {
  let active = true;

  // mediaDevices is undefined on HTTP (non-localhost)
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCamError("Camera requires HTTPS or localhost. You're on HTTP.");
    setCamOn(false);
    setMicOn(false);
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.play().catch(() => {});
      }
    })
    .catch(err => {
      if (!active) return;
      setCamOn(false);
      setMicOn(false);
      setCamError(
        err.name === "NotAllowedError"
          ? "Camera blocked. Allow camera in browser settings."
          : `Camera error: ${err.message}`
      );
    });

  return () => {
    active = false;
    streamRef.current?.getTracks().forEach(t => t.stop());
    window.speechSynthesis.cancel();
  };
}, []);

  // Sync stream to video whenever either becomes available
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  });

  // Mic toggle
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; });
  }, [micOn]);

  // Cam toggle
  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOn; });
  }, [camOn]);

  // Tab violation
  useEffect(() => {
    const handler = () => {
      if (document.hidden && phase === "live") {
        setViolations(prev => [...prev, { time: new Date().toLocaleTimeString(), qNum: currentQ + 1 }]);
        setTabBanner(true);
        setTimeout(() => setTabBanner(false), 5000);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [phase, currentQ]);

  // Timer
  useEffect(() => {
    if (phase === "live") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Speak question when it changes
  useEffect(() => {
    if (phase === "live" && plan && !aiLoading) {
      const q = plan.questions[currentQ];
      if (q) setTimeout(() => speak(q.text), 400);
    }
  }, [currentQ, phase, aiLoading]);

  const toggleSpeech = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Please use Chrome."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setAnswer(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }, [listening]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const beginInterview = () => {
    if (!plan) return;
    speak(`Welcome! I'm Aria. Let's begin your ${plan.role} interview. Here's your first question.`);
    setPhase("live");
  };

  const submitAnswer = async () => {
    if (!plan || !answer.trim() || aiLoading) return;
    recognitionRef.current?.stop();
    setListening(false);
    window.speechSynthesis.cancel();

    const q = plan.questions[currentQ];
    const record: AnswerRecord = { questionId: q.id, question: q.text, answer };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);
    setAnswer("");

    if (currentQ === plan.questions.length - 1) {
      setPhase("done");
      setAiLoading(true);
      try {
        const analysis = await callInterviewAI({
          action: "analyze",
          systemPrompt: `You are an expert interviewer. Analyze all answers and return ONLY a valid JSON object with no markdown: {"overallScore":75,"summary":"brief summary","strengths":["s1","s2","s3"],"improvements":["i1","i2"],"questionScores":[{"id":1,"score":80,"feedback":"brief"}]}`,
          userMessage: `Role: ${plan.role} (${plan.level})\n\n${newAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`,
          maxTokens: 1500,
        });
        sessionStorage.setItem("iv_analysis", analysis);
      } catch { /* handled on analysis page */ }
      sessionStorage.setItem("iv_answers", JSON.stringify(newAnswers));
      sessionStorage.setItem("iv_violations", JSON.stringify(violations));
      sessionStorage.setItem("iv_duration", String(elapsed));
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
      navigate("/ai-interview/analysis");
    } else {
      setAiLoading(true);
      setTimeout(() => {
        setCurrentQ(c => c + 1);
        setAiLoading(false);
      }, 600);
    }
  };

  if (!plan) return null;
  const q = plan.questions[currentQ];
  const progress = (currentQ / plan.questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#060612", color: "#fff" }}>

      {/* Violation banner */}
      <AnimatePresence>
        {tabBanner && (
          <motion.div initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }}
            className="fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium"
            style={{ background: "#dc2626" }}>
            ⚠️ Tab switch detected! ({violations.length} violation{violations.length !== 1 ? "s" : ""})
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: "#1e293b", background: "#0a0a1a" }}>
        <div className="flex items-center gap-3">
          <span className="font-bold">{plan.role}</span>
          <span className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: "#4f46e5" }}>
            {plan.level}
          </span>
          {phase === "live" && (
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ background: "#dc2626" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
        </div>
        {phase === "live" && (
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-gray-300">{formatTime(elapsed)}</span>
            <span className="text-sm text-gray-400">Q {currentQ + 1}/{plan.questions.length}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 shrink-0" style={{ background: "#1e293b" }}>
        <motion.div className="h-full"
          style={{ background: "linear-gradient(90deg,#4f46e5,#818cf8)" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }} />
      </div>

      {/* PREP */}
      {phase === "prep" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-8 text-center max-w-sm w-full"
            style={{ background: "#0f172a", border: "1px solid #1e293b" }}>
            <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 border-4 border-indigo-500">
              <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Aria"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h2 className="font-bold text-2xl mb-1 text-white">Meet Aria</h2>
            <p className="text-indigo-300 text-sm mb-1 font-medium">Your AI Interviewer</p>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Aria will interview you for <strong className="text-white">{plan.role}</strong> ({plan.level}),
              ask {plan.questions.length} tailored questions, and generate a full performance report.
            </p>
            {camError && (
              <div className="mb-4 rounded-lg p-3 text-xs text-left"
                style={{ background: "#450a0a", color: "#fca5a5" }}>
                ⚠️ {camError}
              </div>
            )}
            <Button onClick={beginInterview}
              className="w-full h-12 text-base font-semibold text-white"
              style={{ background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }}>
              🎙️ Begin Interview
            </Button>
          </motion.div>
        </div>
      )}

      {/* LIVE */}
      {phase === "live" && q && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Two video panels */}
          <div className="flex gap-3 p-3 shrink-0" style={{ height: "48vh" }}>

            {/* Aria */}
            <div className="flex-1 rounded-2xl overflow-hidden relative"
              style={{ border: "1px solid #1e293b" }}>
              <AIAvatar speaking={speaking} />
              <div className="absolute bottom-3 left-3 rounded-lg px-3 py-1 text-xs font-semibold"
                style={{ background: "rgba(0,0,0,0.75)" }}>
                Aria · AI Interviewer
              </div>
            </div>

            {/* User camera */}
            <div className="flex-1 rounded-2xl overflow-hidden relative"
              style={{ border: "1px solid #1e293b", background: "#0f172a" }}>

              <video
                ref={videoCallbackRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  display: camOn ? "block" : "none",
                }}
              />

              {!camOn && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "#1e293b" }}>
                    <VideoOff className="h-7 w-7 text-gray-500" />
                  </div>
                  {camError && (
                    <p className="text-xs text-red-400 text-center px-4">{camError}</p>
                  )}
                </div>
              )}

              <div className="absolute bottom-3 left-3 rounded-lg px-3 py-1 text-xs font-semibold"
                style={{ background: "rgba(0,0,0,0.75)" }}>
                You · Candidate
              </div>

              {listening && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: "#dc2626" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> REC
                </div>
              )}

              {/* Cam + mic toggles */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button onClick={() => setCamOn(c => !c)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: camOn ? "rgba(79,70,229,0.85)" : "rgba(220,38,38,0.85)" }}>
                  {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </button>
                <button onClick={() => setMicOn(m => !m)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: micOn ? "rgba(79,70,229,0.85)" : "rgba(220,38,38,0.85)" }}>
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom — question + answer */}
          <div className="flex-1 flex flex-col gap-2 p-3 pt-0 overflow-auto">

            {/* Question */}
            <div className="rounded-xl p-4" style={{ background: "#0f172a", border: "1px solid #1e293b" }}>
              <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold mb-2"
                style={{ background: "#1e1b4b", color: "#a5b4fc" }}>
                {q.type}
              </span>
              <p className="font-semibold text-white leading-snug">{q.text}</p>
              <p className="text-xs text-gray-500 mt-1">{q.hint}</p>
            </div>

            {/* Answer */}
            <textarea
              rows={3}
              className="w-full rounded-xl p-3 text-sm resize-none outline-none"
              style={{ background: "#0f172a", border: "1px solid #334155", color: "#fff", minHeight: 80 }}
              placeholder="Type your answer here or use the mic..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
            />

            {/* Controls */}
            <div className="flex gap-2 pb-2">
              <Button variant="outline" size="sm" onClick={toggleSpeech}
                className={`border-gray-700 text-white shrink-0 ${listening ? "border-red-500 bg-red-900/20" : ""}`}>
                {listening
                  ? <><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1.5" />Listening</>
                  : <><Mic className="h-3.5 w-3.5 mr-1.5" />Use Mic</>}
              </Button>

              <Button onClick={submitAnswer}
                disabled={aiLoading || !answer.trim()}
                className="flex-1 text-white font-semibold"
                style={{ background: aiLoading || !answer.trim() ? "#1e293b" : "linear-gradient(90deg,#4f46e5,#7c3aed)" }}>
                {aiLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : currentQ === plan.questions.length - 1
                  ? "Finish Interview ✓"
                  : "Next Question →"}
              </Button>

              <Button variant="ghost" size="sm"
                className="text-red-400 hover:text-red-300 shrink-0"
                onClick={() => {
                  streamRef.current?.getTracks().forEach(t => t.stop());
                  window.speechSynthesis.cancel();
                  navigate("/ai-interview");
                }}>
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === "done" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-400" />
            <p className="text-lg font-semibold">Interview complete!</p>
            <p className="text-gray-400 text-sm">Generating your performance report...</p>
          </div>
        </div>
      )}
    </div>
  );
}

