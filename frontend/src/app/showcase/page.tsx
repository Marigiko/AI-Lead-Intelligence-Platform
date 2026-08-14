"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Users,
  ArrowRight,
  CheckCircle2,
  Star,
  Globe,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Sub-100ms response times across all endpoints.",
    color: "text-electric-400",
    bg: "bg-electric-500/10",
  },
  {
    icon: TrendingUp,
    title: "Predictive Analytics",
    description: "AI-powered scoring that learns from your pipeline.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Real-time sync across distributed sales teams.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Multi-language support with 40+ integrations.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

const stats = [
  { label: "Leads Processed", value: "12,847", change: "+23%" },
  { label: "Conversion Rate", value: "34.2%", change: "+5.1%" },
  { label: "Avg Deal Size", value: "$24.5K", change: "+12%" },
  { label: "Time to Close", value: "18 days", change: "-4 days" },
];

export default function DesignSystemShowcase() {
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen animated-bg text-foreground">
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16">
        {/* Background Effects */}
        <div className="absolute inset-0 gradient-mesh opacity-60" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-electric-500/10 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          {/* Hero Badge */}
          <div className="mb-8 animate-fade-in-down">
            <Badge variant="electric" size="lg" dot animated>
              <Sparkles className="h-3.5 w-3.5" />
              Premium Design System
            </Badge>
          </div>

          {/* Hero Title */}
          <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight md:text-7xl">
            <span className="gradient-text-animated">AI-Powered</span>
            <br />
            <span className="text-foreground">Lead Intelligence</span>
          </h1>

          {/* Hero Subtitle */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground animate-fade-in-up">
            Transform your sales pipeline with cutting-edge glassmorphism,
            vibrant electric accents, and buttery-smooth animations.
          </p>

          {/* Hero CTA */}
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in-up">
            <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Get Started Free
            </Button>
            <Button variant="outline" size="lg">
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Stats Section ─── */}
      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Card
              key={stat.label}
              variant="gradient"
              hover
              animated
              className="text-center"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <CardContent padding="sm">
                <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
                <Badge variant="cyan" size="sm" className="mt-2">
                  {stat.change}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Card Variants Showcase ─── */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-3xl font-bold">
            Card Variants
          </h2>
          <p className="mb-10 text-center text-muted-foreground">
            Glassmorphism with multiple style variants
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Default Card */}
            <Card variant="default" hover animated>
              <CardHeader>
                <CardTitle>Default Glass</CardTitle>
                <CardDescription>
                  Clean frosted glass with subtle border
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Perfect for content sections that need visual separation
                  without heavy decoration.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="info">Standard</Badge>
              </CardFooter>
            </Card>

            {/* Gradient Card */}
            <Card variant="gradient" hover animated>
              <CardHeader>
                <CardTitle className="gradient-text">Gradient</CardTitle>
                <CardDescription>
                  Purple-to-cyan mesh background
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Use for featured content, metrics, or call-out sections that
                  demand attention.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="electric" dot>Featured</Badge>
              </CardFooter>
            </Card>

            {/* Glow Card */}
            <Card variant="glow" hover animated>
              <CardHeader>
                <CardTitle>
                  <span className="glow-text">Glow Effect</span>
                </CardTitle>
                <CardDescription>
                  Animated purple glow shadow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ideal for premium features, upsells, or hero content that
                  should feel magical.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="gradient" dot>Premium</Badge>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Button Variants Showcase ─── */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <Card variant="subtle" padding="lg">
            <h2 className="mb-2 text-3xl font-bold">Button Variants</h2>
            <p className="mb-8 text-muted-foreground">
              Multiple button styles for different contexts
            </p>

            <div className="space-y-6">
              {/* Row 1: Primary Variants */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm text-muted-foreground">
                  Primary:
                </span>
                <Button variant="primary" leftIcon={<Zap className="h-4 w-4" />}>
                  Primary
                </Button>
                <Button variant="cyan">Cyan</Button>
                <Button variant="secondary">Secondary</Button>
              </div>

              {/* Row 2: Outline & Ghost */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm text-muted-foreground">
                  Subtle:
                </span>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link Style</Button>
              </div>

              {/* Row 3: Special */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm text-muted-foreground">
                  Special:
                </span>
                <Button variant="glow" leftIcon={<Sparkles className="h-4 w-4" />}>
                  Glow Button
                </Button>
                <Button variant="destructive">Destructive</Button>
                <Button
                  variant="primary"
                  isLoading={loading}
                  onClick={handleLoadingDemo}
                >
                  {loading ? "Loading..." : "Click for Loading"}
                </Button>
              </div>

              {/* Row 4: Sizes */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm text-muted-foreground">
                  Sizes:
                </span>
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
                <Button size="icon" variant="outline">
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ─── Badge Variants Showcase ─── */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-3xl font-bold">Badge Variants</h2>
          <p className="mb-10 text-center text-muted-foreground">
            Status indicators with semantic colors
          </p>

          <Card variant="default" padding="lg">
            <div className="space-y-6">
              {/* Semantic Badges */}
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Semantic Colors
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="success" dot>Success</Badge>
                  <Badge variant="warning" dot>Warning</Badge>
                  <Badge variant="info" dot>Info</Badge>
                  <Badge variant="danger" dot>Danger</Badge>
                </div>
              </div>

              {/* Accent Badges */}
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Premium Accents
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="electric" dot>Electric</Badge>
                  <Badge variant="cyan" dot>Cyan</Badge>
                  <Badge variant="purple" dot>Purple</Badge>
                  <Badge variant="gradient" dot>Gradient</Badge>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Sizes
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge size="sm">Small</Badge>
                  <Badge size="default">Default</Badge>
                  <Badge size="lg">Large</Badge>
                </div>
              </div>

              {/* With Dots */}
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  With Status Dots
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="success" dot dotColor="bg-green-400">
                    Live
                  </Badge>
                  <Badge variant="warning" dot dotColor="bg-yellow-400">
                    Pending
                  </Badge>
                  <Badge variant="danger" dot dotColor="bg-red-400">
                    Offline
                  </Badge>
                  <Badge variant="electric" dot dotColor="bg-purple-400">
                    Processing
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-3xl font-bold">
            Feature Cards
          </h2>
          <p className="mb-10 text-center text-muted-foreground">
            Consistent card patterns for feature showcases
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, i) => (
              <Card
                key={feature.title}
                variant="purple"
                hover
                animated
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <CardHeader>
                  <div className={`mb-3 inline-flex rounded-lg p-2.5 ${feature.bg}`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Glassmorphism Demo ─── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <Card variant="glow" padding="lg" className="text-center">
            <CardContent padding="none">
              <div className="mb-4 inline-flex rounded-full bg-gradient-to-r from-electric-500 to-cyan-500 p-4 glow-purple-strong">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-2xl font-bold gradient-text">
                Premium Design System
              </h3>
              <p className="mb-6 text-muted-foreground">
                All components use glassmorphism, electric purple & cyan
                accents, smooth spring animations, and semantic color tokens
                for data visualization.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="success" dot>
                  <CheckCircle2 className="h-3 w-3" /> Glassmorphism
                </Badge>
                <Badge variant="cyan" dot>
                  <BarChart3 className="h-3 w-3" /> Animations
                </Badge>
                <Badge variant="electric" dot>
                  <Zap className="h-3 w-3" /> Dark Mode
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
