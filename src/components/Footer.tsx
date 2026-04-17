import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <span className="font-display text-sm font-bold text-primary-foreground">A</span>
              </div>
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

