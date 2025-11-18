import { CartDrawer } from "./CartDrawer";

export const Header = () => {
  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">OptiSleep</h1>
        </div>
        <CartDrawer />
      </div>
    </header>
  );
};
