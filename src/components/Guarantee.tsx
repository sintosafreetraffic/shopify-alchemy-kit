import { Moon } from "lucide-react";

export const Guarantee = () => {
  return (
    <section className="py-16 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Moon className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-4xl font-bold">100 nights risk free</h2>
        </div>
      </div>
    </section>
  );
};
