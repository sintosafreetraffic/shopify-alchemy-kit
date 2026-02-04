import { Mail } from "lucide-react";

interface EmailContactLinkProps {
  className?: string;
}

/**
 * Simple email contact link for customer questions.
 * Provides a low-friction way for customers to reach out.
 */
export const EmailContactLink = ({ className = "" }: EmailContactLinkProps) => {
  return (
    <a 
      href="mailto:support@risebynight.com?subject=Product%20Question"
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors ${className}`}
    >
      <Mail className="w-3.5 h-3.5" />
      <span>Questions? Email us</span>
    </a>
  );
};
