import { Package, RotateCcw, Mail, AlertCircle } from "lucide-react";

export default function ReturnPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Return Policy</h1>
            <p className="text-lg text-muted-foreground">
              We want you to love your RiseByNight pillow. If you're not completely satisfied, 
              we offer a generous 100-night risk-free trial.
            </p>
          </div>

          {/* 100-Night Trial */}
          <section className="bg-card p-8 rounded-lg border space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">100-Night Risk-Free Trial</h2>
            </div>
            <p className="text-muted-foreground">
              We're confident you'll love your RiseByNight pillow, which is why we offer a generous 
              100-night trial period. If you're not completely satisfied with your purchase, you can 
              return it for a full refund - no questions asked.
            </p>
            <div className="bg-primary/5 p-4 rounded-lg mt-4">
              <p className="text-sm font-medium text-primary">
                ✓ Full 100 nights to try your pillow<br/>
                ✓ Easy return process - ship to our warehouse<br/>
                ✓ Full refund processed within 5 business days<br/>
                ✓ No questions asked
              </p>
            </div>
          </section>

          {/* How to Return */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">How to Return Your Order</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h3 className="text-lg font-semibold">Step 1: Contact Us</h3>
              <p className="text-muted-foreground">
                Email us at <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a> with 
                your order number and reason for return (optional). Our customer service team will 
                respond within 24 hours.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h3 className="text-lg font-semibold">Step 2: Ship to Our Warehouse</h3>
              <p className="text-muted-foreground">
                Pack the pillow in its original packaging (or any suitable box) and ship it to our 
                warehouse. Return shipping costs are the responsibility of the customer. We'll provide 
                you with the return address once you contact us.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h3 className="text-lg font-semibold">Step 3: Refund Processing</h3>
              <p className="text-muted-foreground">
                Once we receive your returned item, we'll process your refund within 5 business days. 
                The refund will be issued to your original payment method.
              </p>
            </div>
          </section>

          {/* Damaged or Defective Items */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Damaged or Defective Items</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    If your product arrives damaged or defective, we'll replace it immediately at no cost to you.
                  </p>
                  <p className="text-muted-foreground">
                    Please contact us at <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a> with:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Your order number</li>
                    <li>A photo of the damaged item</li>
                    <li>A brief description of the issue</li>
                  </ul>
                  <p className="text-muted-foreground">
                    We'll ship a replacement within 7 business days, completely free of charge.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Address Changes */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Address Changes</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                Need to change your delivery address? Contact us immediately at{" "}
                <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a>{" "}
                with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Your order number</li>
                <li>Current delivery address</li>
                <li>New delivery address</li>
              </ul>
              <p className="text-muted-foreground">
                We can update your address until your order ships from our facility. Once shipped, 
                address changes may not be possible.
              </p>
            </div>
          </section>

          {/* Order Cancellations */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Order Cancellations</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                You can cancel your order within 24 hours of placing it by contacting us at{" "}
                <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a>.
              </p>
              <p className="text-muted-foreground">
                After 24 hours, your order enters our processing and shipping workflow. If you wish 
                to return it after this point, you can use our 100-night risk-free trial period once 
                you receive the product.
              </p>
            </div>
          </section>

          {/* Lost or Missing Packages */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Lost or Missing Packages</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                If your package hasn't arrived within the estimated delivery timeframe, please contact 
                us immediately at <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a>.
              </p>
              <p className="text-muted-foreground">
                We'll work with our shipping partners to locate your package. If it cannot be found, 
                we'll send a replacement at no additional cost or issue a full refund - your choice.
              </p>
              <p className="text-muted-foreground">
                We ask that you allow up to 14 days for investigation, as packages can sometimes 
                experience delays but still arrive safely.
              </p>
            </div>
          </section>

          {/* Product Appearance Disclaimer */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Product Images</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                We strive to display our products as accurately as possible. However, due to 
                differences in screen resolution and settings, the actual color and appearance of 
                the product may vary slightly from what you see on your device.
              </p>
              <p className="text-muted-foreground">
                If you have any questions about the material, color, or size before purchasing, 
                please contact us at <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a>.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-primary/5 p-8 rounded-lg space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Need Help?</h2>
            </div>
            <p className="text-muted-foreground">
              Our customer service team is here to help you with any questions about returns, 
              refunds, or exchanges.
            </p>
            <div className="space-y-2">
              <p className="font-semibold">Contact Us:</p>
              <p className="text-muted-foreground">
                Email: <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a>
              </p>
              <div className="text-muted-foreground space-y-1">
                <p className="font-medium">Return Address:</p>
                <p>Recipient: win-winfulfillment CHN SNG092711</p>
                <p>No. 160 Nijiayan Road, Jiangbei District</p>
                <p>Ningbo, Zhejiang 315000</p>
                <p>China</p>
                <p>Phone: +86 17758231352</p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Response time: Within 24 hours on business days
              </p>
            </div>
          </section>

          {/* Warranty Information */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">2-Year Warranty</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                All RiseByNight pillows come with a 2-year warranty covering manufacturing defects. 
                This warranty ensures that your pillow maintains its shape and support properties 
                under normal use.
              </p>
              <p className="text-muted-foreground">
                If you experience any issues covered by the warranty, contact us at{" "}
                <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a>{" "}
                with your order number and photos of the issue. We'll replace your pillow free of charge.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
