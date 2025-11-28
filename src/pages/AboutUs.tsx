import { Moon, Heart, Target, Users } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-4xl text-center">
          <Moon className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            About Rise By Night
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Transforming lives through the power of quality sleep
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-4">
              Poor sleep isn't just an inconvenience—it's a serious problem affecting millions of people every night. Low-quality sleep leads to chronic pain, reduced productivity, weakened immunity, and diminished quality of life. We see people struggling with neck pain, restless nights, and exhaustion that carries into their daily lives, limiting their potential and happiness.
            </p>
            <p className="text-lg text-muted-foreground mb-4">
              At Rise By Night, we're urgently motivated to change this. We believe that quality sleep is something everyone deserves and should be easily accessible to achieve. Sleep quality is fundamental to longevity, performance, and overall quality of life—it's not a luxury, it's a necessity.
            </p>
            <p className="text-lg text-muted-foreground">
              That's why we've dedicated ourselves to creating scientifically-proven sleep solutions that genuinely work. Our products are engineered with precision, backed by research, and designed to help you achieve the restorative sleep your body needs to thrive.
            </p>
          </div>

          {/* Values Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Science-Driven</h3>
              <p className="text-muted-foreground">
                Every product is backed by scientific research and ergonomic principles to deliver real results.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Customer-First</h3>
              <p className="text-muted-foreground">
                Your sleep quality and satisfaction drive everything we do. We stand behind our products with a 100-night guarantee.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Proven Results</h3>
              <p className="text-muted-foreground">
                Thousands of customers have transformed their sleep and their lives with Rise By Night products.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
          <p className="text-lg text-muted-foreground mb-4">
            Rise By Night was founded with a simple but powerful vision: to help everyone achieve the quality sleep they deserve. We started by recognizing a gap in the market—too many sleep products promised comfort but delivered disappointment. Pillows that went flat within months, designs that ignored basic ergonomic principles, and materials that trapped heat instead of promoting restful sleep.
          </p>
          <p className="text-lg text-muted-foreground mb-4">
            We knew we could do better. Our team combined expertise in ergonomics, materials science, and sleep research to create products that actually work. We tested, refined, and perfected our designs until we achieved something remarkable: sleep solutions that deliver measurable improvements in pain relief, sleep quality, and daily wellness.
          </p>
          <p className="text-lg text-muted-foreground">
            Today, thousands of customers trust Rise By Night to help them sleep better and live better. But we're not done—we continue to innovate, listen to our customers, and expand our product line to address every barrier to quality sleep. Because everyone deserves to wake up feeling refreshed, pain-free, and ready to take on the day.
          </p>
        </div>
      </section>

      {/* Commitment Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Commitment to You</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-lg text-muted-foreground">
                <strong>100-Night Risk-Free Trial:</strong> We're confident you'll love our products, so we give you over three months to try them. If you're not satisfied, we'll refund you—no questions asked.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-lg text-muted-foreground">
                <strong>2-Year Warranty:</strong> Our products are built to last. We stand behind their quality with a comprehensive 2-year warranty.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-lg text-muted-foreground">
                <strong>Free Worldwide Shipping:</strong> No matter where you are, we'll deliver your sleep solution with free shipping and tracking to all destinations.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-lg text-muted-foreground">
                <strong>Scientifically Proven:</strong> Every product is designed using proven ergonomic principles and backed by research to ensure real, measurable results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Get in Touch</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Have questions? We're here to help you on your journey to better sleep.
          </p>
          <div className="space-y-2">
            <p className="text-lg">
              <strong>Email:</strong>{" "}
              <a href="mailto:support@risebynight.com" className="text-primary hover:underline">
                support@risebynight.com
              </a>
            </p>
            <p className="text-lg text-muted-foreground">
              Loofdakstraat 10, 3036JN, ROTTERDAM
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
