import { useEffect, useState } from "react";
import { fetchPageByHandle, ShopifyPage } from "@/lib/shopify";

export default function ReturnPolicy() {
  const [page, setPage] = useState<ShopifyPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      const pageData = await fetchPageByHandle("return-policy");
      setPage(pageData);
      setLoading(false);
    };
    loadPage();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The Return Policy page content is not available. Please create a "return-policy" page in your Shopify admin dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            Go to Shopify Admin → Online Store → Pages → Add page with handle "return-policy"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">{page.title}</h1>
        <div 
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      </div>
    </div>
  );
}
