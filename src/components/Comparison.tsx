// Performance: Using OptimizedImage for lazy loading with WebP
import comparisonImage from "@/assets/comparison-new-updated.webp";
import comparisonChart from "@/assets/comparison-them.webp";
import OptimizedImage from "@/components/OptimizedImage";

export const Comparison = () => {
  return (
    <section className="py-16 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Rise By Night vs. Regular Pillows</h2>
          <p className="text-xl text-muted-foreground">
            See the difference proper neck alignment makes
          </p>
        </div>
        
        <div className="rounded-xl overflow-hidden shadow-2xl mb-12 max-w-4xl mx-auto">
          <OptimizedImage 
            src={comparisonImage} 
            alt="Rise By Night pillow comparison showing ergonomic neck support vs regular pillows that cause stiffness with detailed benefits" 
            width={800}
            height={500}
            className="w-full"
          />
        </div>

        <div className="rounded-xl overflow-hidden shadow-2xl max-w-3xl mx-auto">
          <OptimizedImage 
            src={comparisonChart} 
            alt="Rise By Night vs regular pillows detailed comparison chart"
            width={700}
            height={400}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
};
