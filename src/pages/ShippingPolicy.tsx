import { Truck, Clock, Globe, AlertCircle } from "lucide-react";

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Shipping Information</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about RiseByNight shipping and delivery
          </p>
        </div>

        {/* Quick Overview */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="bg-primary/5 p-6 rounded-lg border">
            <Truck className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-2">Free Shipping</h3>
            <p className="text-sm text-muted-foreground">Worldwide delivery at no cost</p>
          </div>
          <div className="bg-primary/5 p-6 rounded-lg border">
            <Clock className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-2">Fast Processing</h3>
            <p className="text-sm text-muted-foreground">1-3 business days handling</p>
          </div>
          <div className="bg-primary/5 p-6 rounded-lg border">
            <Globe className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-2">Tracking Included</h3>
            <p className="text-sm text-muted-foreground">Monitor your order every step</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Shipping Coverage</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h3 className="text-lg font-semibold">Do you ship worldwide?</h3>
              <p className="text-muted-foreground">
                Yes! We ship worldwide from our facility. We offer free shipping 
                to all international destinations with full tracking included. There are NO shipping fees 
                and NO sales tax charged at checkout. Enjoy stress-free shopping!
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Shipping Process</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium mb-1">Order Processing</p>
                    <p className="text-sm text-muted-foreground">
                      We begin processing your order immediately after placement. Due to our fast processing, 
                      we cannot modify orders once they have been submitted. You will only be charged for 
                      items that are shipped, along with applicable shipping and tax rates.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium mb-1">Shipping Confirmation</p>
                    <p className="text-sm text-muted-foreground">
                      Once your order ships, you will receive a shipping confirmation email with your 
                      tracking number to monitor your package.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium mb-1">Business Days Only</p>
                    <p className="text-sm text-muted-foreground">
                      We ship on business days only - not on Saturdays, Sundays, or public holidays.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <p className="font-medium mb-1">Processing Time</p>
                    <p className="text-sm text-muted-foreground">
                      We typically need 1-3 business days to fulfill your order. During peak periods 
                      (holidays or high-demand items), processing may take up to 10 business days. Orders 
                      ship as soon as product availability is confirmed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">5</div>
                  <div>
                    <p className="font-medium mb-1">Multiple Item Orders</p>
                    <p className="text-sm text-muted-foreground">
                      Orders containing multiple products may be shipped separately and arrive on different 
                      dates due to varying warehouse locations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Delivery Times</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground mb-4">
                Once your order ships, estimated delivery times are typically 5-7 business days depending 
                on your location. Specific delivery dates are not provided or guaranteed.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mb-4">
                <div className="flex gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">Priority US Delivery</p>
                    <p className="text-blue-800 dark:text-blue-300">
                      Thanks to our strategic partnerships, shipments to the United States enjoy the 
                      fastest delivery times, typically arriving within 5 business days.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold mb-3">Estimated Delivery by Region:</h3>
                <div className="grid gap-2">
                  <div className="flex justify-between py-2 border-b items-center">
                    <span className="font-medium flex items-center gap-2">
                      United States
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Fastest</span>
                    </span>
                    <span className="text-muted-foreground">5 business days</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Canada</span>
                    <span className="text-muted-foreground">5-7 business days</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">United Kingdom</span>
                    <span className="text-muted-foreground">5-7 business days</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Australia</span>
                    <span className="text-muted-foreground">5-7 business days</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Europe</span>
                    <span className="text-muted-foreground">5-7 business days</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Rest of World</span>
                    <span className="text-muted-foreground">5-7 business days</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-900 mt-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">Important Note:</p>
                    <p className="text-amber-800 dark:text-amber-300">
                      The timeframes listed are estimates only. While we do everything possible to ensure 
                      timely delivery, we cannot be held responsible for circumstances beyond our control, 
                      such as postal delays, customs clearance procedures, holidays, severe weather, labor 
                      disputes, or protests. These disruptions may cause delays beyond our original estimates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Customs, Duties & Taxes</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                For international shipments, import taxes, duties, and/or customs clearance fees may apply 
                once your package reaches the destination country. These charges are the sole responsibility 
                of the recipient.
              </p>
              <p className="text-muted-foreground">
                We have no control over these charges and cannot predict their amounts. If a shipment is 
                refused and returned, you are responsible for all import duties and return shipping costs incurred.
              </p>
              <p className="text-muted-foreground">
                Customs regulations vary significantly from country to country. If you have questions, we 
                recommend contacting your local customs office for specific information.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Important Policies</h2>
            
            <div className="space-y-4">
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="font-semibold mb-3">Incorrect Address Disclaimer</h3>
                <p className="text-muted-foreground text-sm">
                  It is the buyer&apos;s responsibility to ensure the delivery address entered is correct before 
                  placing an order. We begin processing orders immediately, so in most cases we cannot make 
                  changes to an order after it has been placed.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h3 className="font-semibold mb-3">Refused Delivery Policy</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  If an order is refused at delivery and returned to us without prior cancellation (within 
                  the timeframe stated in our policy), we reserve the right to charge a 50% restocking fee 
                  on the total order value. This fee covers processing, return shipping, and restocking costs.
                </p>
                <div className="bg-muted/50 p-4 rounded text-sm space-y-2">
                  <p className="font-medium">Please Note:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>This policy does not apply if the order was properly cancelled within the allowed cancellation period.</li>
                    <li>Shipping and return costs, if applicable, will not be refunded and remain the customer&apos;s responsibility.</li>
                    <li>If you have delivery issues (wrong address, etc.), contact us immediately at support@risebynight.com</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-primary/5 p-8 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-4">
              Have questions about your shipment or need assistance? Our customer support team is here to help.
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:support@risebynight.com" className="text-primary hover:underline">
                  support@risebynight.com
                </a>
              </p>
              <p className="text-sm">
                <span className="font-medium">Address:</span> Loofdakstraat 10, 3036JN, Rotterdam, Netherlands
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
