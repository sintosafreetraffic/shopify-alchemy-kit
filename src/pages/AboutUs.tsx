import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchPageByHandle, ShopifyPage } from "@/lib/shopify";

export default function AboutUs() {
  const [pageContent, setPageContent] = useState<ShopifyPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      const page = await fetchPageByHandle("about-us");
      setPageContent(page);
      setIsLoading(false);
    };
    loadPage();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Moon className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (pageContent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-8 text-center">
            {pageContent.title}
          </h1>
          <div 
            className="prose prose-lg max-w-none [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-3 [&_p]:text-lg [&_p]:text-muted-foreground [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
            dangerouslySetInnerHTML={{ __html: pageContent.body }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <Moon className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-lg text-muted-foreground mb-6">
          This page hasn't been created in Shopify yet. Please create a page with handle "about-us" in your Shopify admin.
        </p>
        <Link to="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
