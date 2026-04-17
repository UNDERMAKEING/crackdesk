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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserName(session?.user?.user_metadata?.full_name ?? "Student");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setUserName(session?.user?.user_metadata?.full_name ?? "Student");
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* 🔥 LOGO SECTION */}
        <Link to="/" className="flex items-center gap-2">
          <div className="transition-transform duration-300 hover:scale-110">
            <Logo className="h-10 w-10" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Crack<span className="text-gradient">desk</span>
          </span>
        </Link>

        {/* Desktop nav */}
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

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                  <span className="text-xs font-bold text-primary">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
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

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm ${
                    location.pathname === l.href
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}