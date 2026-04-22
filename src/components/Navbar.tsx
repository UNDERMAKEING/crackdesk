import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Mock Test", href: "/mock-test" },
  { label: "Test Library", href: "/test-library" },
  { label: "AI Interview", href: "/ai-interview", badge: "NEW" },
  { label: "History", href: "/test-history" },
  { label: "Pricing", href: "/pricing" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // 👈 NEW
  const location = useLocation();
  const navigate = useNavigate();

  // 👇 NEW: fetch avatar from profiles table
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", userId)
      .single();

    if (data) {
      if (data.avatar_url) setAvatarUrl(data.avatar_url);
      if (data.full_name) setUserName(data.full_name);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setUserName(u?.user_metadata?.full_name ?? "Student");
      if (u) fetchProfile(u.id); // 👈 fetch avatar on load
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setUserName(u?.user_metadata?.full_name ?? "Student");
      if (u) fetchProfile(u.id); // 👈 fetch avatar on auth change
      if (!u) setAvatarUrl(null); // 👈 clear on logout
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // 👇 NEW: reusable avatar component used in both desktop + mobile
  const UserAvatar = ({ size = "sm" }: { size?: "sm" | "md" }) => {
    const dim = size === "md" ? "h-8 w-8" : "h-7 w-7";
    const textSize = size === "md" ? "text-sm" : "text-xs";

    return avatarUrl ? (
      <img
        src={avatarUrl}
        alt={userName}
        className={`${dim} rounded-full object-cover ring-2 ring-secondary`}
        onError={() => setAvatarUrl(null)} // fallback if image fails
      />
    ) : (
      <div className={`flex ${dim} items-center justify-center rounded-full bg-secondary`}>
        <span className={`${textSize} font-bold text-primary`}>
          {userName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <div className="transition-transform duration-300 hover:scale-110">
            <Logo className="h-10 w-10" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Crack<span className="text-gradient">Desk</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                location.pathname === l.href
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
              {l.badge && (
                <span className="bg-secondary text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2">
                <UserAvatar size="sm" /> {/* 👈 uses avatar or initial */}
                <span className="text-sm font-medium text-foreground">
                  {userName}
                </span>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button variant="hero" size="sm">Sign up free</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">

              {/* Nav Links */}
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm flex items-center gap-1.5 ${
                    location.pathname === l.href
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {l.label}
                  {l.badge && (
                    <span className="bg-secondary text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {l.badge}
                    </span>
                  )}
                </Link>
              ))}

              {/* Auth Section */}
              <div className="mt-3 border-t border-border pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <UserAvatar size="md" /> {/* 👈 uses avatar or initial */}
                      <span className="font-medium">{userName}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-3"
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                    >
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full">Log in</Button>
                    </Link>
                    <Link to="/signup" onClick={() => setMobileOpen(false)}>
                      <Button variant="hero" size="sm" className="w-full">Sign up free</Button>
                    </Link>
                  </>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}