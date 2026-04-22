import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEPARTMENTS, initializeStudentQuestions } from "@/lib/studentQuestions";

export default function Signup() {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPass, setShowPass] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName || !email || !college || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setStep(2);
  };

  const toggleDept = (key: string) => {
    if (selectedDepts.includes(key)) {
      setSelectedDepts(selectedDepts.filter((d) => d !== key));
      setError("");
    } else {
      if (selectedDepts.length >= 5) {
        setError("You can select a maximum of 5 departments.");
        return;
      }
      setSelectedDepts([...selectedDepts, key]);
      setError("");
    }
  };

  const handleSignup = async () => {
    if (selectedDepts.length === 0 || selectedDepts.length > 5) {
      setError("Please select 1 to 5 departments.");
      return;
    }
    setError("");
    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          college_name: college,
          departments: selectedDepts,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await (supabase.from("profiles").upsert({
        id: data.user.id,        // ✅ matches your primary key column
        full_name: fullName,
        email,
        college_name: college,
        departments: selectedDepts,
        plan_type: "free",
        avatar_key: null,
        avatar_url: null,
      } as any) as any);

      localStorage.setItem("generating_questions", "true");
      localStorage.setItem("generating_departments", JSON.stringify(selectedDepts));

      navigate("/dashboard", { replace: true });

      // Generate questions in background
      initializeStudentQuestions(data.user.id, selectedDepts)
        .then(() => {
          localStorage.removeItem("generating_questions");
          localStorage.removeItem("generating_departments");
        })
        .catch((err) => {
          console.error("Question generation failed:", err);
          localStorage.removeItem("generating_questions");
          localStorage.removeItem("generating_departments");
        });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden w-1/2 items-center justify-center gradient-primary lg:flex">
        <div className="max-w-md px-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur">
              <span className="font-display text-3xl font-bold text-primary-foreground">A</span>
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground">Join CrackDesk</h2>
          <p className="mt-4 text-primary-foreground/70">
            Start preparing smarter with AI-powered mock tests tailored to real job descriptions.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step === 1 ? "bg-primary-foreground text-primary" : "bg-primary-foreground/30 text-primary-foreground"
            }`}>1</div>
            <div className="h-px w-12 bg-primary-foreground/30" />
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step === 2 ? "bg-primary-foreground text-primary" : "bg-primary-foreground/30 text-primary-foreground"
            }`}>2</div>
          </div>
          <p className="mt-2 text-sm text-primary-foreground/70">
            {step === 1 ? "Your details" : "Choose departments"}
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <span className="font-display text-lg font-bold text-primary-foreground">A</span>
            </div>
            <span className="font-display text-xl font-bold">CrackDesk</span>
          </Link>

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Step 1 of 2 — Your details</p>

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-5" onSubmit={handleNextStep}>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Vijay M"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="college">College</Label>
                  <Input
                    id="college"
                    placeholder="Anna University"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button variant="hero" className="w-full" type="submit">
                  Next — Choose Departments →
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
              </p>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">Choose your departments</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Step 2 of 2 — Select up to <strong>5 departments</strong> for your personalized question bank
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Selected chips */}
              {selectedDepts.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {selectedDepts.map((key) => {
                    const dept = DEPARTMENTS.find((d) => d.key === key);
                    return (
                      <span key={key} className="flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {dept?.label ?? key}
                        <button onClick={() => toggleDept(key)} className="ml-1 hover:text-destructive">×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Department cards grid */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {DEPARTMENTS.map((dept) => {
                  const isSelected = selectedDepts.includes(dept.key);
                  const isDisabled = !isSelected && selectedDepts.length >= 5;
                  return (
                    <button
                      key={dept.key}
                      type="button"
                      onClick={() => toggleDept(dept.key)}
                      disabled={isDisabled}
                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : isDisabled
                          ? "cursor-not-allowed border-muted bg-muted/30 opacity-40"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-primary" />
                      )}
                      <span className="text-2xl mb-1">{dept.icon}</span>
                      <span className="text-xs font-bold text-foreground leading-tight">{dept.label}</span>
                      <span className="text-[10px] text-muted-foreground">{dept.key}</span>
                    </button>
                  );
                })}
              </div>

              {/* Counter with color feedback */}
              <p className={`mt-3 text-center text-xs font-medium ${
                selectedDepts.length === 5
                  ? "text-amber-500"
                  : selectedDepts.length > 0
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}>
                {selectedDepts.length}/5 selected
                {selectedDepts.length === 5 && " — maximum reached"}
              </p>

              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="w-1/3"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  ← Back
                </Button>
                <Button
                  variant="hero"
                  className="w-2/3"
                  onClick={handleSignup}
                  disabled={loading || selectedDepts.length === 0}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

