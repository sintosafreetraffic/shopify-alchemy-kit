import { Shield, Cookie, Lock, Eye, Mail, FileText } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              This Privacy Policy describes how your personal information is collected, used, and shared when you visit
              or make a purchase from risebynight.com (the "Site").
            </p>
            <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
          </div>

          {/* Personal Information We Collect */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Personal Information We Collect</h2>
            </div>

            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                When you visit the Site, we automatically collect certain information about your device, including
                information about your web browser, IP address, time zone, and some of the cookies that are installed on
                your device.
              </p>

              <p className="text-muted-foreground">
                Additionally, as you browse the Site, we collect information about the individual web pages or products
                that you view, what websites or search terms referred you to the Site, and information about how you
                interact with the Site. We refer to this automatically-collected information as{" "}
                <strong>"Device Information"</strong>.
              </p>

              <p className="text-muted-foreground">
                When you make a purchase or attempt to make a purchase through the Site, we collect certain information
                from you, including your name, billing address, shipping address, payment information (including credit
                card numbers), email address, and phone number. We refer to this information as{" "}
                <strong>"Order Information"</strong>.
              </p>

              <div className="bg-primary/5 p-4 rounded-lg mt-4">
                <p className="text-sm font-medium">
                  When we talk about <strong>"Personal Information"</strong> in this Privacy Policy, we are referring to
                  both Device Information and Order Information.
                </p>
              </div>
            </div>
          </section>

          {/* How We Collect Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">How We Collect Device Information</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-card p-6 rounded-lg border space-y-3">
                <h3 className="text-lg font-semibold">Cookies</h3>
                <p className="text-muted-foreground">
                  Data files that are placed on your device or computer and often include an anonymous unique
                  identifier. Cookies help us understand how you use our Site and improve your experience.
                </p>
                <p className="text-sm text-muted-foreground">
                  For more information about cookies, and how to disable cookies, visit{" "}
                  <a
                    href="http://www.allaboutcookies.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    allaboutcookies.org
                  </a>
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border space-y-3">
                <h3 className="text-lg font-semibold">Log Files</h3>
                <p className="text-muted-foreground">
                  Track actions occurring on the Site and collect data including your IP address, browser type, Internet
                  service provider, referring/exit pages, and date/time stamps.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border space-y-3">
                <h3 className="text-lg font-semibold">Web Beacons, Tags, and Pixels</h3>
                <p className="text-muted-foreground">
                  Electronic files used to record information about how you browse the Site. These help us analyze Site
                  traffic and improve our services.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">How We Use Your Personal Information</h2>
            </div>

            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                We use the Order Information that we collect generally to fulfill any orders placed through the Site
                (including processing your payment information, arranging for shipping, and providing you with invoices
                and/or order confirmations).
              </p>

              <p className="text-muted-foreground font-semibold">Additionally, we use this Order Information to:</p>

              <ul className="space-y-2 ml-6">
                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Communicate with you about your order and provide customer support</span>
                </li>
                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Screen our orders for potential risk or fraud</span>
                </li>
                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    When in line with the preferences you have shared with us, provide you with information or
                    advertising relating to our products or services
                  </span>
                </li>
                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Improve and optimize our Site and product offerings</span>
                </li>
              </ul>

              <div className="bg-primary/5 p-4 rounded-lg mt-4">
                <p className="text-sm">
                  We use the Device Information we collect to help us screen for potential risk and fraud (in
                  particular, your IP address), and more generally to improve and optimize our Site (for example, by
                  generating analytics about how our customers browse and interact with the Site).
                </p>
              </div>
            </div>
          </section>

          {/* Sharing Your Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Sharing Your Personal Information</h2>
            </div>

            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                We share your Personal Information with third parties to help us use your Personal Information, as
                described above. For example:
              </p>

              <ul className="space-y-2 ml-6">
                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Payment Processors:</strong> We use secure payment gateways to process your payment
                    information safely
                  </span>
                </li>

                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Shipping Partners:</strong> We share shipping information with logistics providers to
                    deliver your order
                  </span>
                </li>

                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Analytics Services:</strong> We use analytics tools to understand how customers use our Site
                  </span>
                </li>

                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Third‑Party Integrations (Sleep & Wellness Apps):</strong>
                    If you choose to connect external sleep‑tracking, wellness, or wearable devices with our products or
                    services, we will only process the data necessary to provide the features you enable. We do{" "}
                    <strong>not</strong>
                    share sleep data, health‑related data, or any personal information received from these external
                    integrations with third parties for marketing or advertising. This data is never sold or disclosed
                    outside of what is required to provide the service you request.
                  </span>
                </li>
              </ul>

              <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-900 mt-4">
                <p className="text-sm font-medium">
                  We may also share your Personal Information to comply with applicable laws and regulations, to respond
                  to a subpoena, search warrant or other lawful request for information we receive, or to otherwise
                  protect our rights.
                </p>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                When you place an order through the Site, we will maintain your Order Information for our records unless
                and until you ask us to delete this information. This helps us provide better customer service and honor
                our 100-night trial guarantee.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                If you are a European resident, you have the right to access personal information we hold about you and
                to ask that your personal information be corrected, updated, or deleted. If you would like to exercise
                this right, please contact us through the contact information below.
              </p>

              <p className="text-muted-foreground">
                Additionally, if you are a European resident we note that we are processing your information in order to
                fulfill contracts we might have with you (for example if you make an order through the Site), or
                otherwise to pursue our legitimate business interests listed above.
              </p>

              <div className="bg-primary/5 p-4 rounded-lg mt-4">
                <p className="text-sm font-medium">
                  Please note that your information may be transferred outside of Europe, including to the Netherlands
                  where our facility is located.
                </p>
              </div>
            </div>
          </section>

          {/* Marketing Communications */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Marketing Communications</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                With your permission, we may send you emails about our products, new offerings, and other updates. You
                can opt out of marketing communications at any time by:
              </p>
              <ul className="space-y-2 ml-6">
                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Clicking the "unsubscribe" link in any marketing email</span>
                </li>
                <li className="text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Contacting us directly at support@risebynight.com</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Note: Even if you opt out of marketing emails, we will still send you transactional emails related to
                your orders (order confirmations, shipping updates, etc.).
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Data Security</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                We take the security of your personal information seriously and implement appropriate technical and
                organizational measures to protect it against unauthorized or unlawful processing, accidental loss,
                destruction, or damage.
              </p>
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <div className="bg-primary/5 p-3 rounded">
                  <p className="text-sm">🔒 SSL encryption for all data transmission</p>
                </div>
                <div className="bg-primary/5 p-3 rounded">
                  <p className="text-sm">💳 Secure payment processing</p>
                </div>
                <div className="bg-primary/5 p-3 rounded">
                  <p className="text-sm">🛡️ Regular security audits</p>
                </div>
                <div className="bg-primary/5 p-3 rounded">
                  <p className="text-sm">🔐 Limited access to personal data</p>
                </div>
              </div>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                The Site is not intended for individuals under the age of 18. We do not knowingly collect personal
                information from children. If you are a parent or guardian and believe your child has provided us with
                personal information, please contact us immediately.
              </p>
            </div>
          </section>

          {/* Changes to Privacy Policy */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Changes to This Privacy Policy</h2>
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <p className="text-muted-foreground">
                We may update this privacy policy from time to time in order to reflect, for example, changes to our
                practices or for other operational, legal, or regulatory reasons. We will notify you of any material
                changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </div>
          </section>

          {/* Contact Us */}
          <section className="bg-primary/5 p-8 rounded-lg space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Contact Us</h2>
            </div>
            <p className="text-muted-foreground">
              For more information about our privacy practices, if you have questions, or if you would like to make a
              complaint, please contact us:
            </p>
            <div className="space-y-2 mt-4">
              <p className="font-semibold">RiseByNight</p>
              <p className="text-muted-foreground">
                Email:{" "}
                <a href="mailto:support@risebynight.com" className="text-primary hover:underline">
                  support@risebynight.com
                </a>
              </p>
              <p className="text-muted-foreground">Address: Loofdakstraat 10, 3036JN Rotterdam, Netherlands</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
