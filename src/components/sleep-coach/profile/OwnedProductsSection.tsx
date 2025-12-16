// Owned products display section with Scandinavian design
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductOwnership, PRODUCT_SLUG_TO_NAME, PRODUCT_SLUG_TO_IMAGE, PRODUCT_RATIONALE, formatAcquiredDate } from "@/lib/productMapping";

interface OwnedProductsSectionProps {
  products: ProductOwnership[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  onSync: () => void;
}

export function OwnedProductsSection({
  products,
  isLoading,
  isSyncing,
  lastSyncAt,
  onSync,
}: OwnedProductsSectionProps) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
        <CardContent className="py-8 flex justify-center">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#A7A29C' }}>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            Loading products...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4 pt-7 px-7">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
              Your Products
            </CardTitle>
            <p className="text-xs mt-1" style={{ color: '#A7A29C' }}>
              Products you're currently using
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="text-xs h-8 px-3"
            style={{ color: 'rgba(60, 131, 246, 0.85)' }}
          >
            {isSyncing ? (
              <>
                <svg className="animate-spin h-3 w-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-3 w-3 mr-1.5" style={{ stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' }}>
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                Sync from Orders
              </>
            )}
          </Button>
        </div>
        {lastSyncAt && (
          <p className="text-[10px] mt-2" style={{ color: '#A7A29C' }}>
            Last synced: {new Date(lastSyncAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="px-7 pb-7">
        {products.length === 0 ? (
          <div 
            className="rounded-lg p-6 text-center"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <svg 
              viewBox="0 0 24 24" 
              className="h-8 w-8 mx-auto mb-3"
              style={{ stroke: '#A7B4C2', strokeWidth: 1.5, fill: 'none' }}
            >
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            <p className="text-xs font-medium mb-1" style={{ color: '#2D2B29' }}>
              No products detected yet
            </p>
            <p className="text-xs" style={{ color: '#6F6A66' }}>
              Click "Sync from Orders" to check your Shopify purchase history
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const displayName = PRODUCT_SLUG_TO_NAME[product.product_slug] || product.product_slug;
              const image = PRODUCT_SLUG_TO_IMAGE[product.product_slug];
              const rationale = PRODUCT_RATIONALE[product.product_slug];
              
              return (
                <div 
                  key={product.id}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
                >
                  <div className="flex items-start gap-4">
                    {/* Product image */}
                    <div 
                      className="w-14 h-14 rounded-md flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: 'rgba(167, 180, 194, 0.08)' }}
                    >
                      {image && (
                        <img 
                          src={image} 
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium" style={{ color: '#2D2B29' }}>
                          {displayName}
                        </h4>
                        <Badge 
                          variant="outline"
                          className="font-normal border-0 text-[10px] shrink-0 px-2 py-0.5"
                          style={{ 
                            backgroundColor: 'rgba(167, 180, 194, 0.15)',
                            color: 'rgba(60, 131, 246, 0.85)',
                          }}
                        >
                          Active
                        </Badge>
                      </div>
                      
                      <p className="text-[11px] mt-0.5" style={{ color: '#A7A29C' }}>
                        Activated: {formatAcquiredDate(product.acquired_at)}
                      </p>
                      
                      {rationale && (
                        <p className="text-xs leading-relaxed mt-2" style={{ color: '#6F6A66' }}>
                          {rationale}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
