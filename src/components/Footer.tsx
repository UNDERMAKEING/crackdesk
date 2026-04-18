import { Link } from "react-router-dom";

const Logo = ({ className = "h-9 w-9" }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <defs>
        <linearGradient id="footer-gradBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="footer-gradPurple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>

      {/* Left (Blue Bars) */}
      <rect x="20" y="30" width="45" height="12" rx="6" fill="url(#footer-gradBlue)" />
      <rect x="25" y="50" width="40" height="12" rx="6" fill="url(#footer-gradBlue)" />
      <rect x="30" y="70" width="35" height="12" rx="6" fill="url(#footer-gradBlue)" />

      {/* Right (Purple Bars) */}
      <rect x="50" y="20" width="45" height="12" rx="6" fill="url(#footer-gradPurple)" />
      <rect x="45" y="40" width="40" height="12" rx="6" fill="url(#footer-gradPurple)" />
      <rect x="40" y="60" width="35" height="12" rx="6" fill="url(#footer-gradPurple)" />
      <rect x="40" y="80" width="30" height="12" rx="6" fill="url(#footer-gradPurple)" />
    </svg>
  );
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-9 w-9" />
              <span className="font-display text-lg font-bold">CrackDesk</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              AI-powered mock tests tailored to your dream job description.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Product</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/mock-test" className="hover:text-foreground transition-colors">JD Mock Test</Link>
              <Link to="/test-library" className="hover:text-foreground transition-colors">Test Library</Link>
              <Link to="/test-history" className="hover:text-foreground transition-colors">Test History</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Company</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="cursor-default">About Us</span>
              <span className="cursor-default">Careers</span>
              <span className="cursor-default">Contact</span>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="cursor-default">Privacy Policy</span>
              <span className="cursor-default">Terms of Service</span>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CrackDesk. All rights reserved.
        </div>
      </div>
    </footer>
  );
}