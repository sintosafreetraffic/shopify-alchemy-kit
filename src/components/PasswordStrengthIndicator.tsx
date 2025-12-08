import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthCheck {
  label: string;
  passed: boolean;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const checks = useMemo((): StrengthCheck[] => {
    return [
      { label: "At least 8 characters", passed: password.length >= 8 },
      { label: "Contains uppercase letter", passed: /[A-Z]/.test(password) },
      { label: "Contains lowercase letter", passed: /[a-z]/.test(password) },
      { label: "Contains a number", passed: /[0-9]/.test(password) },
    ];
  }, [password]);

  const passedCount = checks.filter((c) => c.passed).length;
  
  const strengthLabel = useMemo(() => {
    if (passedCount === 0) return { text: "", color: "" };
    if (passedCount === 1) return { text: "Weak", color: "text-destructive" };
    if (passedCount === 2) return { text: "Fair", color: "text-amber-500" };
    if (passedCount === 3) return { text: "Good", color: "text-primary" };
    return { text: "Strong", color: "text-green-500" };
  }, [passedCount]);

  const progressColor = useMemo(() => {
    if (passedCount <= 1) return "bg-destructive";
    if (passedCount === 2) return "bg-amber-500";
    if (passedCount === 3) return "bg-primary";
    return "bg-green-500";
  }, [passedCount]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${(passedCount / 4) * 100}%` }}
          />
        </div>
        {strengthLabel.text && (
          <span className={`text-xs font-medium ${strengthLabel.color}`}>
            {strengthLabel.text}
          </span>
        )}
      </div>

      {/* Requirements list */}
      <div className="grid grid-cols-2 gap-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              check.passed ? "text-green-500" : "text-muted-foreground"
            }`}
          >
            {check.passed ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
