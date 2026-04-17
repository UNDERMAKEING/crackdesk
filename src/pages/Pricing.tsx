import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, X, Crown, Zap, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free",
    icon: Zap,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Get started with basic mock tests",
    features: [
      { name: "5 mock tests per month", included: true },
      { name: "Basic question generation", included: true },
      { name: "Score tracking", included: true },
      { name: "Test history (last 5)", included: true },
      { name: "Skill breakdown analysis", included: false },
      { name: "Certificate downloads", included: false },
      { name: "Priority AI generation", included: false },
      { name: "Custom test templates", included: false },
    ],
    cta: "Current Plan",
    popular: false,
    variant: "outline" as const,
  },
  {
    name: "Pro",
    icon: Crown,
    monthlyPrice: 499,
    yearlyPrice: 3999,
    description: "For serious placement preparation",
    features: [
      { name: "Unlimited mock tests", included: true },
      { name: "Advanced AI question generation", included: true },
      { name: "Score tracking", included: true },
      { name: "Full test history", included: true },
      { name: "Skill breakdown analysis", included: true },
      { name: "Certificate downloads", included: true },
      { name: "Priority AI generation", included: false },
      { name: "Custom test templates", included: false },
    ],
    cta: "Upgrade to Pro",
    popular: true,
    variant: "hero" as const,
  },
  {
    name: "Premium",
    icon: Rocket,
    monthlyPrice: 999,
    yearlyPrice: 7999,
    description: "Maximum preparation with all features",
    features: [
      { name: "Unlimited mock tests", included: true },
      { name: "Advanced AI question generation", included: true },
      { name: "Score tracking", included: true },
      { name: "Full test history", included: true },
      { name: "Skill breakdown analysis", included: true },
      { name: "Certificate downloads", included: true },
      { name: "Priority AI generation", included: true },
      { name: "Custom test templates", included: true },
    ],
    cta: "Go Premium",
    popular: false,
    variant: "default" as const,
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-muted-foreground">
            Choose the plan that fits your placement preparation needs
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {yearly && (
              <Badge variant="secondary" className="text-xs">Save up to 33%</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`relative h-full flex flex-col shadow-card border-border ${plan.popular ? "ring-2 ring-primary" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                    <plan.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      ₹{yearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{yearly ? "year" : "month"}
                    </span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.name} className="flex items-center gap-2 text-sm">
                        {f.included ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                          {f.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/signup">
                    <Button variant={plan.variant} className="w-full">
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

