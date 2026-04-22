import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  GraduationCap, Crown, Award, BookOpen,
  TrendingUp, Calendar, Pencil, X, Save, Loader2, Camera,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getDepartmentMeta } from "@/lib/studentQuestions";
import { toast } from "sonner";
import AvatarPicker, { AvatarImg, avatarUrl } from "../components/AvatarPicker"; // 👈 also import avatarUrl

interface ProfileData {
  full_name:    string;
  email:        string;
  college_name: string;
  departments:  string[];
  plan_type:    string;
  created_at:   string;
  avatar_key:   string | null;
  avatar_url:   string | null; // 👈 NEW
}

interface Stats {
  testsTaken: number;
  avgScore:   number;
  bestScore:  number;
}

export default function Profile() {
  const [profile,     setProfile]     = useState<ProfileData | null>(null);
  const [stats,       setStats]       = useState<Stats>({ testsTaken:0, avgScore:0, bestScore:0 });
  const [editing,     setEditing]     = useState(false);
  const [editName,    setEditName]    = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [showPicker,  setShowPicker]  = useState(false);
  const [avatarKey,   setAvatarKey]   = useState<string | null>(null);
  const [userId,      setUserId]      = useState<string>(""); // 👈 NEW

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      setUserId(uid); // 👈 store userId in state

      const { data: prof } = await (supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)        // ✅ must be "id" not "user_id"
        .maybeSingle() as any);

      if (prof) {
        const fullName =
          prof.full_name ||
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] || "";

        const p: ProfileData = {
          full_name:    fullName,
          email:        prof.email        || session.user.email || "",
          college_name: prof.college_name || "",
          departments:  prof.departments  || [],
          plan_type:    prof.plan_type    || "free",
          created_at:   prof.created_at,
          avatar_key:   prof.avatar_key   || null,
          avatar_url:   prof.avatar_url   || null,
        };
        setProfile(p);
        setEditName(p.full_name);
        setEditCollege(p.college_name);

        // ✅ avatar_key from DB is the source of truth — remove localStorage fallback
        setAvatarKey(prof.avatar_key || "adventurer:luna");
      }
      const { data: results } = await (supabase
        .from("test_results")
        .select("score, total_questions")
        .eq("user_id", uid) as any);

      if (results && results.length > 0) {
        const scores = results.map((r: any) => Math.round((r.score / r.total_questions) * 100));
        setStats({
          testsTaken: results.length,
          avgScore:   Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
          bestScore:  Math.max(...scores),
        });
      }

      setLoading(false);
    };
    load();
  }, []);

  /* ── Save avatar — now receives key + url from picker ──── */
const handleAvatarSelect = (key: string, url: string) => {
  setAvatarKey(key);
  setProfile(p => p ? { ...p, avatar_key: key, avatar_url: url } : p);
  toast.success("Avatar updated!");

  // ✅ tell navbar to re-fetch
  window.dispatchEvent(new CustomEvent("avatar-updated"));
};

  /* ── Save name/college ─────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await (supabase
      .from("profiles")
      .update({ full_name: editName, college_name: editCollege })
      .eq("id", session.user.id) as any);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      setProfile(p => p ? { ...p, full_name: editName, college_name: editCollege } : p);
      setEditing(false);
      toast.success("Profile updated!");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // 👇 FIX: was falling back to "Profile", now uses email prefix instead
  const firstName = profile?.full_name?.split(" ")[0] ||
    profile?.email?.split("@")[0] ||
    "User";

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale:0.8, opacity:0 }}
            animate={{ scale:1,   opacity:1 }}
            className="relative shrink-0 cursor-pointer group"
            onClick={() => setShowPicker(true)}
            title="Change avatar"
          >
            <AvatarImg avatarKey={avatarKey} size={48} className="ring-2 ring-primary/40 ring-offset-2" />
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background:"rgba(0,0,0,0.45)" }}>
              <Camera className="h-4 w-4 text-white" />
            </div>
          </motion.div>

          <div>
            <motion.h1
              initial={{ opacity:0, x:-12 }}
              animate={{ opacity:1, x:0 }}
              className="font-display text-2xl font-bold text-foreground md:text-3xl"
            >
              {firstName} {/* ✅ now shows actual name */}
            </motion.h1>
            <p className="text-sm text-muted-foreground">
              Manage your account and view your stats
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} className="lg:col-span-2">
            <Card className="shadow-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0 cursor-pointer group" onClick={() => setShowPicker(true)}>
                      <div className="rounded-full overflow-hidden ring-2 ring-primary/30 ring-offset-2"
                        style={{ width:64, height:64 }}>
                        <AvatarImg avatarKey={avatarKey} size={64} />
                      </div>
                      <div
                        className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center
                                   opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ width:20, height:20, background:"var(--primary)", boxShadow:"0 0 6px rgba(0,0,0,0.3)" }}
                      >
                        <Camera className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>

                    <div>
                      {editing ? (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Full Name</Label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">College</Label>
                            <Input value={editCollege} onChange={e => setEditCollege(e.target.value)} className="mt-1" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <h2 className="font-display text-xl font-bold text-foreground">{profile?.full_name}</h2>
                          <p className="text-sm text-muted-foreground">{profile?.email}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {editing ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button variant="hero" size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">College:</span>
                    <span className="font-medium text-foreground">{profile?.college_name || "Not set"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Crown className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Plan:</span>
                    <Badge variant="secondary" className="capitalize">{profile?.plan_type}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium text-foreground">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground shrink-0">Departments:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile?.departments && profile.departments.length > 0 ? (
                        profile.departments.map(d => {
                          const meta = getDepartmentMeta(d);
                          return (
                            <Badge key={d} className="bg-primary/10 text-primary border-primary/20">
                              {meta.icon} {meta.label}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground">None selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
            <Card className="shadow-card border-border h-full">
              <CardContent className="p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-4">Performance</h3>
                <div className="space-y-5">
                  {[
                    { label:"Tests Taken",   value:stats.testsTaken.toString(), icon:BookOpen,   color:"text-primary" },
                    { label:"Average Score", value:`${stats.avgScore}%`,        icon:TrendingUp, color:"text-primary" },
                    { label:"Best Score",    value:`${stats.bestScore}%`,       icon:Award,      color:"text-primary" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <s.icon className={`h-5 w-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="font-display text-lg font-bold text-foreground">{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />

      {/* 👇 updated: passes userId, and new onSelect signature */}
      {showPicker && userId && (
        <AvatarPicker
          currentKey={avatarKey}
          userId={userId}
          onSelect={handleAvatarSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}