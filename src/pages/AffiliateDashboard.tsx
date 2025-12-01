import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, DollarSign, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const AffiliateDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Affiliate Program</h1>
          <p className="text-xl text-muted-foreground">Coming Soon</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Join Our Affiliate Program</CardTitle>
            <CardDescription>
              We're building something exciting for our community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Our affiliate program is currently under development. Soon you'll be able to earn 
              commissions by sharing Rise By Night™ products with your audience.
            </p>
            
            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                <Users className="h-8 w-8 text-primary mb-2" />
                <span className="font-semibold">Build Your Network</span>
                <span className="text-sm text-muted-foreground text-center">Invite others to join</span>
              </div>
              
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                <DollarSign className="h-8 w-8 text-primary mb-2" />
                <span className="font-semibold">Earn Commissions</span>
                <span className="text-sm text-muted-foreground text-center">Up to 15% per sale</span>
              </div>
              
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <span className="font-semibold">Multi-Level Rewards</span>
                <span className="text-sm text-muted-foreground text-center">Earn from your network</span>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-center text-sm">
                <span className="font-semibold">Want to be notified when we launch?</span>
                <br />
                Contact us at <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateDashboard;
