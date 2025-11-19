import { Scale, FileText, ShieldAlert, AlertCircle } from "lucide-react";

export default function TermsConditions() {
  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms & Conditions</h1>
          <p className="text-xl text-muted-foreground">
            General Terms and Conditions for RiseByNight
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last Updated: November 2024
          </p>
        </div>

        <div className="space-y-8">
          {/* Definitions */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">1. Definitions</h2>
            </div>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                These Terms and Conditions define the following terms:
              </p>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold mb-1">Right of Withdrawal</p>
                  <p className="text-sm text-muted-foreground">
                    The period within which a consumer may withdraw from a distance contract.
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Consumer</p>
                  <p className="text-sm text-muted-foreground">
                    A natural person who is not acting in the course of their professional or commercial 
                    activity and who enters into a distance contract with the entrepreneur.
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Distance Contract</p>
                  <p className="text-sm text-muted-foreground">
                    A contract concluded under an organized system for the distance sale of products and/or 
                    services, without the entrepreneur and consumer being physically present at the same time.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Company Identity */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">2. Company Identity and Contact Information</h2>
            </div>
            <div className="bg-card p-6 rounded-lg border space-y-3">
              <div>
                <p className="font-semibold mb-1">Company Name</p>
                <p className="text-sm text-muted-foreground">RiseByNight</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Address</p>
                <p className="text-sm text-muted-foreground">
                  Loofdakstraat 10, 3036JN Rotterdam, Zuid-Holland, The Netherlands
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">Email</p>
                <p className="text-sm">
                  <a href="mailto:support@risebynight.com" className="text-primary hover:underline">
                    support@risebynight.com
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Applicability */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Applicability</h2>
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-muted-foreground">
                These terms and conditions apply to every offer from RiseByNight and to every distance 
                contract and order concluded between RiseByNight and the consumer. By placing an order 
                or using our services, you agree to be bound by these terms and conditions.
              </p>
            </div>
          </section>

          {/* Offer and Acceptance */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Offer and Acceptance</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                If an offer has a limited validity period or is subject to conditions, this will be 
                expressly stated in the offer.
              </p>
              <p className="text-muted-foreground">
                The offer contains a complete and accurate description of the products and/or services 
                offered, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                <li>Description of essential characteristics of products/services</li>
                <li>Price including all applicable taxes and fees</li>
                <li>Delivery costs (if applicable)</li>
                <li>Method of payment, delivery, and execution</li>
                <li>Period for accepting the offer</li>
                <li>Information about the right of withdrawal</li>
              </ul>
              <p className="text-muted-foreground text-sm">
                Obvious errors or mistakes in the offer are not binding on the entrepreneur.
              </p>
            </div>
          </section>

          {/* Right of Withdrawal */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">5. Right of Withdrawal (100-Night Trial)</h2>
            </div>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <p className="font-semibold text-primary mb-2">Our 100-Night Sleep Trial</p>
                <p className="text-sm text-muted-foreground">
                  At RiseByNight, we extend the standard 30-day withdrawal period to a full 100 nights, 
                  allowing you to truly experience the benefits of our ergonomic sleep pillow.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="font-semibold mb-2">Withdrawal Period</p>
                  <p className="text-sm text-muted-foreground">
                    When purchasing products, the consumer has the right to withdraw from the contract 
                    without giving any reason within 100 nights. This period begins on the day after the 
                    consumer or a representative designated by the consumer receives the product.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">Product Care During Trial</p>
                  <p className="text-sm text-muted-foreground">
                    During this period, the consumer must handle the product and packaging with care. 
                    The product may only be unpacked or used to the extent necessary to assess whether 
                    they wish to keep it. We recommend using a pillowcase during the trial period.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">How to Exercise Your Right</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    If the consumer wishes to exercise their right of withdrawal, they must inform 
                    RiseByNight within 100 nights of receiving the product by contacting:
                  </p>
                  <p className="text-sm">
                    Email:{" "}
                    <a href="mailto:support@risebynight.com" className="text-primary hover:underline">
                      support@risebynight.com
                    </a>
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">Return Process</p>
                  <p className="text-sm text-muted-foreground">
                    The consumer must return the product within 14 days after notifying us of their 
                    withdrawal. The consumer bears the direct costs of returning the product unless we 
                    have agreed to bear these costs or failed to inform the consumer that they must bear 
                    these costs.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">Refund</p>
                  <p className="text-sm text-muted-foreground">
                    Upon receipt and inspection of the returned product, we will refund all payments 
                    received from the consumer, including delivery costs (except additional costs resulting 
                    from the consumer&apos;s choice of delivery method other than the standard delivery we 
                    offer), without undue delay and in any event within 14 days of receiving your withdrawal 
                    notification.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Prices and Payment */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Prices and Payment</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                During the validity period stated in the offer, the prices of the products and/or services 
                offered will not be increased, except for price changes due to changes in VAT rates or 
                other statutory levies.
              </p>
              <p className="text-muted-foreground">
                All prices shown on our website include VAT and other applicable taxes unless stated otherwise.
              </p>
              <div>
                <p className="font-semibold mb-2">Payment Methods</p>
                <p className="text-sm text-muted-foreground">
                  We accept various payment methods as indicated during checkout. Payment must be completed 
                  at the time of order placement unless otherwise agreed.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-2">Currency</p>
                <p className="text-sm text-muted-foreground">
                  All prices are displayed in the currency applicable to your region. The final price 
                  charged will be in the currency shown at checkout.
                </p>
              </div>
            </div>
          </section>

          {/* Delivery and Execution */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Delivery and Execution</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                RiseByNight will exercise the greatest possible care when receiving and executing orders 
                for products. The place of delivery is the address that the consumer has provided to RiseByNight.
              </p>
              <div>
                <p className="font-semibold mb-2">Delivery Timeline</p>
                <p className="text-sm text-muted-foreground">
                  Accepted orders will be executed promptly, but no later than within 30 days, unless a 
                  longer delivery period has been agreed. Detailed delivery information can be found in 
                  our Shipping Policy.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-2">Delayed Delivery</p>
                <p className="text-sm text-muted-foreground">
                  If delivery is delayed, the consumer will be informed no later than 30 days after placing 
                  the order. In such cases, the consumer has the right to dissolve the contract without 
                  costs and is entitled to compensation if applicable.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-2">Risk Transfer</p>
                <p className="text-sm text-muted-foreground">
                  The risk of loss or damage passes to the consumer when the product is delivered to the 
                  specified address.
                </p>
              </div>
            </div>
          </section>

          {/* Complaints and Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Complaints and Dispute Resolution</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                Complaints about the execution of the contract must be communicated to RiseByNight in a 
                complete and clear description within 7 days after the consumer has discovered the defect.
              </p>
              <div>
                <p className="font-semibold mb-2">Response Time</p>
                <p className="text-sm text-muted-foreground">
                  RiseByNight will respond to complaints within 14 days of receipt. If a complaint requires 
                  a longer processing time, RiseByNight will respond within the 14-day period with an 
                  acknowledgment of receipt and an indication of when the consumer can expect a more detailed response.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-2">Contact for Complaints</p>
                <p className="text-sm">
                  Email:{" "}
                  <a href="mailto:support@risebynight.com" className="text-primary hover:underline">
                    support@risebynight.com
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Service Use and Prohibited Uses */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">9. Service Use and Prohibited Uses</h2>
            </div>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                You agree not to use the service for any illegal or unauthorized purposes and not to 
                violate any laws in your jurisdiction (including but not limited to copyright laws).
              </p>
              <div>
                <p className="font-semibold mb-2">Prohibited Activities Include:</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li>Transmitting viruses or destructive code</li>
                  <li>Attempting to gain unauthorized access to our systems</li>
                  <li>Using automated systems or software to extract data (scraping)</li>
                  <li>Impersonating another person or entity</li>
                  <li>Interfering with or disrupting the service</li>
                  <li>Violating intellectual property rights</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                A violation of these terms will result in the immediate termination of your services.
              </p>
            </div>
          </section>

          {/* Liability and Warranties */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Liability and Warranties</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <div>
                <p className="font-semibold mb-2">Product Warranty</p>
                <p className="text-sm text-muted-foreground">
                  RiseByNight guarantees that the products and/or services comply with the contract terms, 
                  the specifications stated in the offer, reasonable requirements of reliability and/or 
                  usability, and the statutory provisions and/or government regulations existing at the 
                  time of contract conclusion.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-2">2-Year Warranty Coverage</p>
                <p className="text-sm text-muted-foreground">
                  Our products come with a 2-year warranty against manufacturing defects. This warranty 
                  covers defects in materials and workmanship under normal use. The warranty does not 
                  cover damage caused by improper use, accidents, or normal wear and tear.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-2">Limitation of Liability</p>
                <p className="text-sm text-muted-foreground">
                  RiseByNight&apos;s liability is limited to the purchase price of the product. We are not 
                  liable for indirect, incidental, or consequential damages except where required by law.
                </p>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. Intellectual Property</h2>
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-muted-foreground mb-3">
                All content on this website, including but not limited to text, graphics, logos, images, 
                and software, is the property of RiseByNight and is protected by international copyright 
                and trademark laws.
              </p>
              <p className="text-sm text-muted-foreground">
                You may not reproduce, distribute, modify, or create derivative works from our content 
                without express written permission.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. Changes to Terms and Conditions</h2>
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-muted-foreground mb-3">
                RiseByNight reserves the right to amend these terms and conditions at any time. Changes 
                will be effective immediately upon posting on our website.
              </p>
              <p className="text-sm text-muted-foreground">
                We recommend reviewing these terms regularly. Your continued use of our services after 
                changes constitutes acceptance of the modified terms.
              </p>
            </div>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. Governing Law and Jurisdiction</h2>
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-muted-foreground mb-3">
                These terms and conditions are governed by the laws of The Netherlands. Any disputes 
                arising from or in connection with these terms shall be subject to the exclusive 
                jurisdiction of the courts of Rotterdam, The Netherlands.
              </p>
              <p className="text-sm text-muted-foreground">
                Consumers retain the right to bring proceedings in their country of residence where 
                applicable under EU consumer protection laws.
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-primary/5 p-8 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">Questions About Our Terms?</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about these Terms and Conditions, please contact us:
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:support@risebynight.com" className="text-primary hover:underline">
                  support@risebynight.com
                </a>
              </p>
              <p className="text-sm">
                <span className="font-medium">Address:</span> Loofdakstraat 10, 3036JN Rotterdam, The Netherlands
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
