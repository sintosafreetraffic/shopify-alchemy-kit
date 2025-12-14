import { Building2, Mail, Globe, FileText, Shield, Copyright, Users } from "lucide-react";

const Imprint = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          Imprint — RiseByNight
        </h1>

        <p className="text-muted-foreground mb-8">
          RiseByNight is a brand operated by:
        </p>

        {/* Company Information */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Company Information</h2>
          </div>
          <div className="space-y-1 text-muted-foreground pl-7">
            <p className="font-medium text-foreground">Easy In Shape V.O.F.</p>
            <p>Loofdakstraat 10</p>
            <p>3036 JN Rotterdam</p>
            <p>The Netherlands</p>
          </div>
          <div className="mt-4 space-y-1 text-muted-foreground pl-7">
            <p><span className="text-foreground">Legal Form:</span> Vennootschap Onder Firma (V.O.F.)</p>
            <p><span className="text-foreground">Chamber of Commerce (KVK):</span> 85884197</p>
            <p><span className="text-foreground">Establishment Number:</span> 000051900572</p>
          </div>
        </section>

        {/* VAT Information */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">VAT Information</h2>
          </div>
          <div className="space-y-1 text-muted-foreground pl-7">
            <p><span className="text-foreground">Tax Number:</span> 863777867B01</p>
            <p><span className="text-foreground">VAT Identification Number:</span> NL863777867B01</p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          </div>
          <div className="space-y-1 text-muted-foreground pl-7">
            <p><span className="text-foreground">Email:</span> <a href="mailto:support@risebynight.com" className="hover:text-foreground transition-colors">support@risebynight.com</a></p>
            <p><span className="text-foreground">Website:</span> <a href="https://risebynight.com" className="hover:text-foreground transition-colors">https://risebynight.com</a></p>
            <p><span className="text-foreground">Customer Service:</span> Available Monday–Friday</p>
          </div>
        </section>

        {/* Representatives */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Representatives</h2>
          </div>
          <p className="text-muted-foreground pl-7">
            Easy In Shape V.O.F. is legally represented by its partners.
          </p>
        </section>

        {/* Disclaimer */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Disclaimer</h2>
          </div>
          <div className="space-y-4 text-muted-foreground pl-7">
            <p>
              Despite careful content control, we assume no liability for the content of external links. The operators of linked pages are solely responsible for their content.
            </p>
            <p>
              All product information on this website is provided for educational and lifestyle purposes. RiseByNight does not provide medical or therapeutic claims. Our products are not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </div>
        </section>

        {/* Copyright Notice */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Copyright className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Copyright Notice</h2>
          </div>
          <p className="text-muted-foreground pl-7">
            All content, images, texts, and media on this website are the property of RiseByNight / Easy In Shape V.O.F. and may not be reproduced without written permission.
          </p>
        </section>

        {/* Alternative Trade Name Disclosure */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Alternative Trade Name Disclosure</h2>
          </div>
          <p className="text-muted-foreground pl-7">
            RiseByNight is a commercial brand name used by Easy In Shape V.O.F. All purchases, invoices, and legal responsibilities are managed under the registered company Easy In Shape V.O.F.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Imprint;
