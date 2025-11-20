export const PaymentMethodsBar = () => {
  const paymentMethods = [
    { name: "Visa", icon: "💳" },
    { name: "Mastercard", icon: "💳" },
    { name: "American Express", icon: "💳" },
    { name: "PayPal", icon: "🅿️" },
    { name: "Apple Pay", icon: "🍎" },
    { name: "Klarna", icon: "💰" },
  ];

  return (
    <div className="bg-secondary border-b border-border">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">
            Secure Payment Methods:
          </span>
          <div className="flex items-center gap-4">
            {/* Visa */}
            <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="32" rx="4" fill="#1434CB"/>
              <path d="M20.5 11h-3.2l-2 12h3.2l2-12zm8.3 7.7l1.7-4.7.9 4.7h-2.6zm3.6 4.3h3l-2.6-12h-2.8c-.6 0-1.1.4-1.3.9l-4.6 11.1h3.4l.7-1.9h4.2v1.9zm-8.9-3.9c0-3.2-4.4-3.4-4.3-4.8 0-.4.4-.9 1.3-1 .4-.1 1.7-.2 3.1.5l.6-2.7c-.8-.3-1.8-.5-3-.5-3.2 0-5.4 1.7-5.4 4.1 0 1.8 1.6 2.8 2.8 3.4 1.3.6 1.7 1 1.7 1.5 0 .8-.9 1.1-1.8 1.1-1.5 0-2.3-.2-3.5-.8l-.6 2.8c.8.4 2.3.7 3.8.7 3.4.1 5.6-1.6 5.6-4.3z" fill="white"/>
            </svg>

            {/* Mastercard */}
            <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="32" rx="4" fill="#EB001B"/>
              <circle cx="18" cy="16" r="9" fill="#FF5F00"/>
              <circle cx="30" cy="16" r="9" fill="#F79E1B"/>
            </svg>

            {/* Amex */}
            <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="32" rx="4" fill="#006FCF"/>
              <path d="M15 11h-4l-3 10h3l.5-1.5h2l.5 1.5h3.5l-2.5-10zm-3.3 6.5l.8-2.5.8 2.5h-1.6zm10.3-6.5h-3.5v10h6v-2.5h-2.5v-7.5zm11.5 0h-4.5v10h4.5c2.2 0 3.5-1.5 3.5-5s-1.3-5-3.5-5zm0 7.5h-1v-5h1c1 0 1.5.8 1.5 2.5s-.5 2.5-1.5 2.5z" fill="white"/>
            </svg>

            {/* PayPal */}
            <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="32" rx="4" fill="#003087"/>
              <path d="M20 11h-4c-.3 0-.5.2-.6.5l-1.9 12c0 .3.2.5.5.5h2c.3 0 .5-.2.6-.5l.5-3.2c.1-.3.3-.5.6-.5h1.3c2.8 0 4.4-1.3 4.8-4 .2-1.1 0-2-.6-2.6-.7-.7-1.8-1.2-3.2-1.2zm.5 3.9c-.2 1.4-1.2 1.4-2.2 1.4h-.6l.4-2.5c0-.2.2-.3.4-.3h.3c.8 0 1.6 0 2 .5.2.3.3.6.1.9zm11.5-.1h-2c-.2 0-.4.1-.4.3l-.1.6-.2-.2c-.5-.7-1.5-1-2.6-1-2.4 0-4.5 1.9-4.9 4.5-.2 1.3.1 2.5.8 3.3.6.8 1.5 1.1 2.6 1.1 1.8 0 2.8-1.2 2.8-1.2l-.1.6c0 .3.2.5.5.5h1.8c.3 0 .5-.2.6-.5l1.1-7c-.1-.2-.3-.5-.6-.5zm-2.9 3.9c-.2 1.2-1.1 2-2.3 2-.6 0-1.1-.2-1.4-.6-.3-.4-.4-.9-.3-1.5.2-1.2 1.1-2 2.3-2 .6 0 1 .2 1.3.6.3.4.5 1 .4 1.5z" fill="#009CDE"/>
              <path d="M37 11h-4c-.3 0-.5.2-.6.5l-1.9 12c0 .3.2.5.5.5h2.1c.2 0 .4-.2.4-.4l.5-3.3c.1-.3.3-.5.6-.5h1.3c2.8 0 4.4-1.3 4.8-4 .2-1.1 0-2-.6-2.6-.7-.7-1.8-1.2-3.1-1.2zm.5 3.9c-.2 1.4-1.2 1.4-2.2 1.4h-.6l.4-2.5c0-.2.2-.3.4-.3h.3c.8 0 1.6 0 2 .5.2.3.2.6 0 .9z" fill="#012169"/>
            </svg>

            {/* Apple Pay */}
            <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="32" rx="4" fill="black"/>
              <path d="M14.5 11.8c-.5.6-1.3 1-2.1 1-.1-.8.3-1.6.8-2.1.5-.6 1.4-1 2.1-.9.1.8-.2 1.6-.8 2zm.8 1.3c-1.2-.1-2.2.7-2.7.7-.6 0-1.5-.6-2.4-.6-1.3 0-2.4.7-3.1 1.9-1.3 2.3-.3 5.7 1 7.6.6.9 1.4 2 2.4 1.9.9 0 1.3-.6 2.4-.6 1.1 0 1.4.6 2.4.6 1 0 1.7-1 2.3-1.9.7-1 1-2 1-2.1 0 0-2-.8-2-2.9 0-1.8 1.5-2.6 1.5-2.7-.8-1.2-2.1-1.4-2.6-1.4zm8.7-.5v10h1.6v-3.4h2.2c2 0 3.4-1.4 3.4-3.3s-1.3-3.3-3.3-3.3h-3.9zm1.6 1.4h1.8c1.4 0 2.2.7 2.2 1.9s-.8 2-2.2 2h-1.8v-3.9zm7.6 8.6c1 0 2-.5 2.4-1.3h.1v1.2h1.5v-6.4c0-1.3-1-2.1-2.6-2.1-1.5 0-2.6.8-2.6 2h1.5c.1-.6.6-1 1.2-1 .7 0 1.1.3 1.1 1v.4l-1.5.1c-1.4.1-2.2.7-2.2 1.7 0 1.1.8 1.8 2.1 1.8zm.4-1.2c-.6 0-1-.3-1-.8s.4-.7 1.1-.8l1.3-.1v.5c0 .7-.6 1.2-1.4 1.2zm4.4 3.2c1.5 0 2.2-.6 2.8-2.3l2.7-7.6h-1.6l-1.8 5.8h-.1l-1.8-5.8h-1.7l2.6 7.2-.1.4c-.2.6-.5.8-1 .8-.1 0-.3 0-.4 0v1.3c.1.1.3.2.4.2z" fill="white"/>
            </svg>

            {/* Klarna */}
            <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="32" rx="4" fill="#FFB3C7"/>
              <path d="M15 11v12h2.5v-4.8l.9-1.1 2.5 5.9h3l-3.8-7.8 3.5-4.2h-3l-3.1 4.2V11H15zm9.5 0v12h2.5V11h-2.5zm5 0v1.8c.5-.7 1.3-1.1 2.2-1.1 1.7 0 2.8 1.3 2.8 3.3v7h-2.5v-6.5c0-1.1-.5-1.7-1.3-1.7-.8 0-1.4.6-1.4 1.7v6.5h-2.5V11h2.7zm10 11.2c-.6 0-1-.2-1.3-.5s-.5-.8-.5-1.4V13h-1.2v-2h1.2V9.5h2.5V11h1.5v2h-1.5v5.3c0 .3.1.5.4.5h1.1v2h-1.7v.4z" fill="#0A0B09"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
