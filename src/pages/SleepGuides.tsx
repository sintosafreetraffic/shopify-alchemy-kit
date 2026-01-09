import { Download, Clock, BookOpen, Moon, Sunrise, Thermometer, Volume2, Activity, Heart, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const guides = [
  {
    id: "delivery-quickstart",
    title: "Delivery Day Quickstart",
    subtitle: "Your First 10 Minutes Matter Most",
    description: "Set up your pillow correctly from day one. This guide ensures smooth adaptation and faster sleep improvements.",
    icon: Sparkles,
    duration: "5 min read",
    pages: 12,
    pdfUrl: "/ebooks/delivery-day-quickstart.pdf",
    color: "from-primary/20 to-primary/5",
    featured: true,
  },
  {
    id: "ergonomic-pillow",
    title: "Ergonomic Pillow Master Guide",
    subtitle: "Sleep in True Alignment",
    description: "Complete guide to using your ergonomic pillow. From the adjustment phase to full 30-day adaptation.",
    icon: Heart,
    duration: "8 min read",
    pages: 14,
    pdfUrl: "/ebooks/ergonomic-pillow-guide.pdf",
    color: "from-blue-500/20 to-blue-500/5",
  },
  {
    id: "knee-pillow-hip",
    title: "Knee Pillow & Hip Alignment",
    subtitle: "Wake Without Hip or Lower-Back Pain",
    description: "Master proper hip alignment during sleep. Perfect positioning techniques for side sleepers.",
    icon: Activity,
    duration: "7 min read",
    pages: 13,
    pdfUrl: "/ebooks/knee-pillow-hip-guide.pdf",
    color: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    id: "7-day-reset",
    title: "7-Day Sleep Reset Program",
    subtitle: "Transform Your Sleep in One Week",
    description: "A structured day-by-day program with simple tasks, night cues, and progress tracking to reset your sleep.",
    icon: BookOpen,
    duration: "10 min read",
    pages: 15,
    pdfUrl: "/ebooks/7-day-sleep-reset.pdf",
    color: "from-violet-500/20 to-violet-500/5",
  },
  {
    id: "evening-routine",
    title: "Evening Routine Reset",
    subtitle: "A Calm Flow for Falling Asleep",
    description: "Learn to lower cortisol, calm your mind, and enter sleep effortlessly with a 20-minute wind-down routine.",
    icon: Moon,
    duration: "8 min read",
    pages: 16,
    pdfUrl: "/ebooks/evening-routine-reset.pdf",
    color: "from-indigo-500/20 to-indigo-500/5",
  },
  {
    id: "morning-mobility",
    title: "Morning Mobility & Neck Reset",
    subtitle: "Start Aligned, Energized & Tension-Free",
    description: "A simple 3-minute morning flow that resets posture, reduces stiffness, and boosts morning energy.",
    icon: Sunrise,
    duration: "6 min read",
    pages: 14,
    pdfUrl: "/ebooks/morning-mobility-neck.pdf",
    color: "from-amber-500/20 to-amber-500/5",
  },
  {
    id: "deep-sleep-energy",
    title: "Deep Sleep → Morning Energy",
    subtitle: "How Nighttime Alignment Transforms Your Day",
    description: "Discover how deeper sleep cycles lead to clearer mornings, more focus, and long-lasting daytime energy.",
    icon: Sparkles,
    duration: "9 min read",
    pages: 15,
    pdfUrl: "/ebooks/deep-sleep-morning-energy.pdf",
    color: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    id: "rem-optimization",
    title: "REM & Deep Sleep Optimization",
    subtitle: "Unlock Deeper Rest",
    description: "Understand sleep cycles and learn proven techniques to enhance both REM and deep sleep phases.",
    icon: Moon,
    duration: "8 min read",
    pages: 14,
    pdfUrl: "/ebooks/rem-deep-sleep-optimization.pdf",
    color: "from-purple-500/20 to-purple-500/5",
  },
  {
    id: "temperature",
    title: "Temperature Optimization Handbook",
    subtitle: "Control Your Nighttime Temperature",
    description: "Master bedroom temperature, bedding materials, and cooling strategies for deeper, uninterrupted sleep.",
    icon: Thermometer,
    duration: "7 min read",
    pages: 13,
    pdfUrl: "/ebooks/temperature-optimization.pdf",
    color: "from-rose-500/20 to-rose-500/5",
  },
  {
    id: "noise-light-stress",
    title: "Noise, Light & Stress Reduction",
    subtitle: "Create a Calm Sleep Environment",
    description: "Optimize your environment by reducing noise, managing light exposure, and lowering evening stress.",
    icon: Volume2,
    duration: "8 min read",
    pages: 15,
    pdfUrl: "/ebooks/noise-light-stress-reduction.pdf",
    color: "from-teal-500/20 to-teal-500/5",
  },
  {
    id: "back-pain-rotation",
    title: "Back Pain & Hip Rotation Fix",
    subtitle: "Sleep in Alignment, Wake Without Tension",
    description: "Learn how pelvis rotation causes back pain and how proper knee support keeps your spine aligned all night.",
    icon: Activity,
    duration: "7 min read",
    pages: 14,
    pdfUrl: "/ebooks/back-pain-rotation-fix.pdf",
    color: "from-orange-500/20 to-orange-500/5",
  },
  {
    id: "neck-alignment",
    title: "Neck Pain Alignment Guide",
    subtitle: "Wake Up Without Pain",
    description: "Master proper neck alignment during sleep. Understand the neck-shoulder gap and how to position yourself correctly.",
    icon: Zap,
    duration: "8 min read",
    pages: 15,
    pdfUrl: "/ebooks/neck-alignment-guide.pdf",
    color: "from-sky-500/20 to-sky-500/5",
  },
];

const SleepGuides = () => {
  const { toast } = useToast();

  const downloadPdf = async (pdfUrl: string) => {
    try {
      const res = await fetch(pdfUrl, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const filename = pdfUrl.split("/").pop() || "sleep-guide.pdf";

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("[SleepGuides] PDF download failed", err);
      toast({
        title: "Download failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.05),transparent_50%)]" />
        
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <BookOpen className="h-4 w-4" />
              Free Sleep Resources
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Sleep Better, Wake{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Restored
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Expert guides designed to transform your sleep. From pillow setup to advanced sleep optimization — 
              everything you need for deeper, more restorative nights.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Guide */}
      {guides.filter(g => g.featured).map(guide => (
        <section key={guide.id} className="container mx-auto px-4 -mt-8 mb-12 md:mb-16">
          <div className="mx-auto max-w-4xl">
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${guide.color} border border-border/50 p-6 md:p-10`}>
              <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
              
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <guide.icon className="h-10 w-10 text-primary" />
                </div>
                
                <div className="flex-1">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Start Here
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">{guide.title}</h2>
                  <p className="mb-4 text-muted-foreground">{guide.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      size="lg"
                      className="gap-2"
                      onClick={() => downloadPdf(guide.pdfUrl)}
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {guide.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {guide.pages} pages
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* All Guides Grid */}
      <section className="container mx-auto px-4 pb-20 md:pb-28">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Complete Sleep Library
          </h2>
          <p className="text-muted-foreground">
            Explore all our guides to optimize every aspect of your sleep
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.filter(g => !g.featured).map((guide) => (
            <div
              key={guide.id}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${guide.color} opacity-50 transition-opacity group-hover:opacity-70`} />
              
              <div className="relative p-6">
                {/* Icon */}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 shadow-sm">
                  <guide.icon className="h-6 w-6 text-primary" />
                </div>

                {/* Content */}
                <h3 className="mb-1 text-lg font-semibold text-foreground">
                  {guide.title}
                </h3>
                <p className="mb-3 text-sm font-medium text-primary/80">
                  {guide.subtitle}
                </p>
                <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                  {guide.description}
                </p>

                {/* Meta & Download */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {guide.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {guide.pages}p
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => downloadPdf(guide.pdfUrl)}
                    aria-label={`Download ${guide.title} PDF`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 bg-muted/30 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
              Ready to Transform Your Sleep?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Our ergonomic pillows are designed to work hand-in-hand with these guides. 
              Experience the complete RiseByNight sleep transformation.
            </p>
            <Button asChild size="lg">
              <a href="/products/ergonomic-pillow">
                Explore Our Pillows
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SleepGuides;
