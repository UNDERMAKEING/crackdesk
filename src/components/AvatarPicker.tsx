import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Shuffle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type AvatarStyle =
  | "adventurer"
  | "adventurer-neutral"
  | "micah"
  | "notionists"
  | "lorelei"
  | "bottts-neutral"
  | "fun-emoji"
  | "pixel-art";

interface AvatarDef {
  key:   string;
  style: AvatarStyle;
  seed:  string;
  label: string;
}

const AVATAR_LIST: AvatarDef[] = [
  { key:"adventurer:luna",   style:"adventurer",         seed:"luna",    label:"Luna"    },
  { key:"adventurer:felix",  style:"adventurer",         seed:"felix",   label:"Felix"   },
  { key:"adventurer:nova",   style:"adventurer",         seed:"nova",    label:"Nova"    },
  { key:"adventurer:zara",   style:"adventurer",         seed:"zara",    label:"Zara"    },
  { key:"adv-neutral:sage",  style:"adventurer-neutral", seed:"sage",    label:"Sage"    },
  { key:"adv-neutral:river", style:"adventurer-neutral", seed:"river",   label:"River"   },
  { key:"micah:kai",         style:"micah",              seed:"kai",     label:"Kai"     },
  { key:"micah:eden",        style:"micah",              seed:"eden",    label:"Eden"    },
  { key:"micah:orion",       style:"micah",              seed:"orion",   label:"Orion"   },
  { key:"micah:stella",      style:"micah",              seed:"stella",  label:"Stella"  },
  { key:"notionists:maya",   style:"notionists",         seed:"maya",    label:"Maya"    },
  { key:"notionists:leo",    style:"notionists",         seed:"leo",     label:"Leo"     },
  { key:"notionists:aria",   style:"notionists",         seed:"aria",    label:"Aria"    },
  { key:"notionists:cyrus",  style:"notionists",         seed:"cyrus",   label:"Cyrus"   },
  { key:"lorelei:dawn",      style:"lorelei",            seed:"dawn",    label:"Dawn"    },
  { key:"lorelei:ash",       style:"lorelei",            seed:"ash",     label:"Ash"     },
  { key:"bottts:rex",        style:"bottts-neutral",     seed:"rex",     label:"Rex"     },
  { key:"bottts:byte",       style:"bottts-neutral",     seed:"byte",    label:"Byte"    },
  { key:"emoji:smile",       style:"fun-emoji",          seed:"smile",   label:"Smile"   },
  { key:"emoji:cool",        style:"fun-emoji",          seed:"cool",    label:"Cool"    },
  { key:"pixel:hero",        style:"pixel-art",          seed:"hero",    label:"Hero"    },
  { key:"pixel:quest",       style:"pixel-art",          seed:"quest",   label:"Quest"   },
  { key:"pixel:byte",        style:"pixel-art",          seed:"byte",    label:"Byte"    },
  { key:"pixel:spark",       style:"pixel-art",          seed:"spark",   label:"Spark"   },
];

export function avatarUrl(key: string): string {
  const found = AVATAR_LIST.find(a => a.key === key);
  if (!found) return `https://api.dicebear.com/8.x/adventurer/svg?seed=default&backgroundColor=b6e3f4`;
  return `https://api.dicebear.com/8.x/${found.style}/svg?seed=${found.seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

const STYLE_LABELS: Record<AvatarStyle, string> = {
  "adventurer":         "Illustrated",
  "adventurer-neutral": "Neutral",
  "micah":              "Modern",
  "notionists":         "3-D Toon",
  "lorelei":            "Portrait",
  "bottts-neutral":     "Robot",
  "fun-emoji":          "Emoji",
  "pixel-art":          "Pixel",
};

const ALL_STYLES = Array.from(new Set(AVATAR_LIST.map(a => a.style))) as AvatarStyle[];

export function AvatarImg({
  avatarKey,
  size = 64,
  className = "",
}: {
  avatarKey: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const src = avatarKey ? avatarUrl(avatarKey) : avatarUrl("adventurer:luna");
  return (
    <img
      src={src}
      alt="Avatar"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius:"50%", objectFit:"cover" }}
    />
  );
}

interface AvatarPickerProps {
  currentKey: string | null | undefined;
  onSelect:   (key: string, url: string) => void;
  onClose:    () => void;
}

export default function AvatarPicker({ currentKey, onSelect, onClose }: AvatarPickerProps) {
  const [selected,    setSelected]    = useState<string>(currentKey || "adventurer:luna");
  const [activeStyle, setActiveStyle] = useState<AvatarStyle | "all">("all");
  const [saving,      setSaving]      = useState(false);

  const visible = activeStyle === "all"
    ? AVATAR_LIST
    : AVATAR_LIST.filter(a => a.style === activeStyle);

  const handleRandom = () => {
    const pool = activeStyle === "all" ? AVATAR_LIST : visible;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSelected(pick.key);
  };

  const handleConfirm = async () => {
    setSaving(true);
    const url = avatarUrl(selected);

    // ✅ always get fresh session — no prop needed
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error("No session");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_key: selected, avatar_url: url })
      .eq("id", session.user.id);

    setSaving(false);

    if (error) {
      console.error("Avatar save error:", error.message);
      return;
    }

    onSelect(selected, url);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)" }}
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
      >
        <motion.div
          key="panel"
          className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
          style={{ background:"linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)" }}
          initial={{ scale:0.92, opacity:0, y:24 }}
          animate={{ scale:1,    opacity:1, y:0  }}
          exit={{    scale:0.92, opacity:0, y:24  }}
          transition={{ type:"spring", damping:22, stiffness:280 }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ height:3, background:"linear-gradient(90deg,#D4A843,#F0C85A,#D4A843)" }} />

          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <h2 style={{ color:"#FDF6E3", fontFamily:"'Georgia',serif", fontWeight:700, fontSize:17, letterSpacing:2 }}>
                CHOOSE AVATAR
              </h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="px-6 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {(["all", ...ALL_STYLES] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveStyle(s)}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all"
                style={{
                  background: activeStyle === s ? "#D4A843" : "rgba(255,255,255,0.08)",
                  color:      activeStyle === s ? "#1a1a2e"  : "rgba(255,255,255,0.65)",
                  border:     activeStyle === s ? "none"     : "1px solid rgba(255,255,255,0.12)",
                  letterSpacing: 0.5,
                }}
              >
                {s === "all" ? "All" : STYLE_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="flex gap-4 px-6 pb-4">
            <div className="shrink-0 flex flex-col items-center gap-2">
              <motion.div
                key={selected}
                initial={{ scale:0.85, opacity:0 }}
                animate={{ scale:1,    opacity:1 }}
                transition={{ type:"spring", damping:16 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  width:96, height:96,
                  background:"linear-gradient(135deg,#D4A843,#F0C85A)",
                  padding:3,
                  boxShadow:"0 0 28px rgba(212,168,67,0.5)",
                }}
              >
                <div className="w-full h-full rounded-xl overflow-hidden bg-white/10">
                  <AvatarImg avatarKey={selected} size={90} />
                </div>
              </motion.div>
              <span style={{ color:"#D4A843", fontSize:11, fontWeight:600, letterSpacing:1 }}>
                {AVATAR_LIST.find(a => a.key === selected)?.label ?? "Custom"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ maxHeight:220 }}>
              <div className="grid grid-cols-5 gap-2">
                {visible.map(a => {
                  const isActive = a.key === selected;
                  return (
                    <motion.button
                      key={a.key}
                      whileHover={{ scale:1.08 }}
                      whileTap={{  scale:0.95 }}
                      onClick={() => setSelected(a.key)}
                      className="relative rounded-xl overflow-hidden flex flex-col items-center"
                      style={{
                        background: isActive ? "rgba(212,168,67,0.25)" : "rgba(255,255,255,0.05)",
                        border:     isActive ? "2px solid #D4A843"     : "2px solid transparent",
                        padding:    "6px 4px 4px",
                        cursor:     "pointer",
                        transition: "border 0.15s",
                      }}
                    >
                      <AvatarImg avatarKey={a.key} size={40} />
                      <span style={{ color:"rgba(255,255,255,0.55)", fontSize:9, marginTop:3, letterSpacing:0.3 }}>
                        {a.label}
                      </span>
                      {isActive && (
                        <motion.div
                          initial={{ scale:0 }} animate={{ scale:1 }}
                          className="absolute top-1 right-1 rounded-full flex items-center justify-center"
                          style={{ width:14, height:14, background:"#D4A843" }}
                        >
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={handleRandom}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/10"
              style={{ color:"rgba(255,255,255,0.65)", border:"1px solid rgba(255,255,255,0.15)" }}
            >
              <Shuffle className="h-3.5 w-3.5" /> Random
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-gray-400 hover:text-white">
                Cancel
              </Button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-60"
                style={{
                  background:   "linear-gradient(90deg,#B8891E,#D4A843,#F0C85A)",
                  color:        "#1a1a2e",
                  letterSpacing: 1,
                  boxShadow:    "0 3px 16px rgba(212,168,67,0.45)",
                }}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                {saving ? "Saving..." : "Use This Avatar"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}