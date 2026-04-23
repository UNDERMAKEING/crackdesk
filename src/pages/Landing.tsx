import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { BookOpen, Brain, FileCheck, Star, ChevronRight, Sparkles, Target, Award } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const steps = [
  { icon: FileCheck, title: "Paste Your JD", desc: "Copy the job description from any portal and paste it in our smart text box." },
  { icon: Brain, title: "AI Generates Test", desc: "Our AI reads every skill, technology and requirement to craft a tailored 20-question quiz." },
  { icon: Award, title: "Get Your Score", desc: "Receive a detailed score report with strengths, weaknesses and a downloadable PDF certificate." },
];

const testimonials = [
  { name: "Priya Sharma", college: "VIT Vellore", text: "CrackDesk helped me crack the TCS NQT on my first attempt. The JD-based tests were spot on!", rating: 5 },
  { name: "Rahul Menon", college: "SRM Chennai", text: "I practiced with company-specific tests and improved my score from 55% to 89% in just two weeks.", rating: 5 },
  { name: "Ananya Gupta", college: "BITS Pilani", text: "The AI-generated questions felt like real interview prep. The PDF certificate is a nice touch for applications.", rating: 5 },
];

const companyLogos = ["TCS", "Infosys", "Wipro", "Zoho", "Accenture"];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(245 45% 37% / 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(270 50% 50% / 0.06) 0%, transparent 50%)" }} />
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-secondary-foreground">
                <Sparkles className="h-3.5 w-3.5" /> AI-Powered Mock Tests
              </span>
            </motion.div>
            <motion.h1
              className="mt-6 font-display text-4xl font-bold leading-tight text-foreground md:text-6xl"
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Ace Your Dream Job with{" "}
              <span className="text-gradient">AI-Tailoured</span> Mock Tests
            </motion.h1>
            <motion.p
              className="mt-5 text-lg text-muted-foreground md:text-xl"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              Paste any job description and get a personalized 20-question assessment
              in seconds. Built for Indian engineering students targeting top companies.
            </motion.p>
            <motion.div
              className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
            >
              <Link to="/mock-test">
                <Button variant="hero" size="lg" className="gap-2 text-base px-8">
                  Free Trial <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="hero-outline" size="lg" className="text-base px-8">
                  View Pricing
                </Button>
              </Link>
            </motion.div>
            <motion.div
              className="mt-10 flex flex-wrap items-center justify-center gap-6"
              initial="hidden" animate="visible" variants={fadeUp} custom={4}
            >
              {companyLogos.map((name) => (
                <span key={name} className="rounded-lg bg-background px-4 py-2 text-sm font-semibold text-muted-foreground shadow-card">
                  {name}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <span className="text-sm font-semibold text-primary">How It Works</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
              Three Simple Steps to Your Score
            </h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                className="group relative rounded-2xl border border-border bg-card p-8 shadow-card transition-all duration-300 hover:shadow-card-hover"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary transition-all duration-300 group-hover:gradient-primary group-hover:text-primary-foreground">
                  <step.icon className="h-7 w-7" />
                </div>
                <span className="absolute right-6 top-6 font-display text-5xl font-bold text-muted/60">
                  {i + 1}
                </span>
                <h3 className="font-display text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>  
      </section>

      {/* Features */}
      <section className="bg-secondary/50 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-center">
            <div>
              <span className="text-sm font-semibold text-primary">Why CrackDesk?</span>
              <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
                Smarter Preparation, Better Results
              </h2>
              <div className="mt-8 space-y-5">
                {[
                  { icon: Target, label: "JD-Specific Questions", desc: "Tests tailored to the exact skills companies are looking for." },
                  { icon: BookOpen, label: "Company Test Library", desc: "Pre-made tests for TCS, Infosys, Wipro, Zoho & Accenture." },
                  { icon: Award, label: "PDF Certificates", desc: "Download a score certificate to attach with your applications." },
                ].map((f) => (
                  <div key={f.label} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-foreground">{f.label}</h4>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">Mock Test Result</p>
                    <p className="text-xs text-muted-foreground">TCS Digital — Full Stack Developer</p>
                  </div>
                </div>
                <div className="text-center py-4">
                  <p className="font-display text-5xl font-bold text-primary">85%</p>
                  <p className="text-sm text-muted-foreground mt-1">17 / 20 Correct</p>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">React.js</span><span className="font-semibold text-success">Strong</span></div>
                  <div className="h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-success" style={{ width: "90%" }} /></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">SQL</span><span className="font-semibold text-warning">Needs Work</span></div>
                  <div className="h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-warning" style={{ width: "50%" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <span className="text-sm font-semibold text-primary">Testimonials</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
              Loved by Students Across India
            </h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-display font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.college}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-primary py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Join thousands of students already using CrackDesk to land their dream jobs.
          </p>
          <div className="mt-8">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="text-base px-10 font-semibold">
                Get Started — It's Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

