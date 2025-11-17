import comparisonImage from "@/assets/comparison.png";
import comparisonChart from "@/assets/comparison-chart.png";

export const Comparison = () => {
  return (
    <section className="py-16 px-4 bg-secondary/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">OptiSleep vs. Regular Pillows</h2>
          <p className="text-xl text-muted-foreground">
            See the difference proper neck alignment makes
          </p>
        </div>
        
        <div className="rounded-xl overflow-hidden shadow-2xl mb-12 max-w-2xl mx-auto">
          <img 
            src={comparisonImage} 
            alt="OptiSleep pillow comparison showing ergonomic neck support vs regular pillows that cause stiffness" 
            className="w-full"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4 text-center text-green-700">✓ OptiSleep</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">✓</span>
                <span>Maintains shape and support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">✓</span>
                <span>Ergonomic design prevents pain</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">✓</span>
                <span>Cooling gel technology</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">✓</span>
                <span>Perfect spinal alignment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">✓</span>
                <span>Lasts 3-5 years</span>
              </li>
            </ul>
          </div>

          <div className="bg-destructive/10 border-2 border-destructive/20 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4 text-center">❌ Regular Pillows</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold mt-1">•</span>
                <span>Flatten quickly, losing support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold mt-1">•</span>
                <span>Cause neck and shoulder stiffness</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold mt-1">•</span>
                <span>Trap heat, making you sweat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold mt-1">•</span>
                <span>No proper spinal alignment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold mt-1">•</span>
                <span>Need replacement every 6 months</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden shadow-2xl max-w-3xl mx-auto">
          <img 
            src={comparisonChart} 
            alt="OptiSleep vs regular pillows detailed comparison chart" 
            className="w-full"
            style={{ filter: 'hue-rotate(200deg)' }}
          />
        </div>
      </div>
    </section>
  );
};
