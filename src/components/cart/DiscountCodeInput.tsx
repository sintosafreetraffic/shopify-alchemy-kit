 import { useState } from "react";
 import { ChevronDown, Tag, Loader2, Check, X } from "lucide-react";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 
 interface DiscountInfo {
   code: string;
   type: "percentage" | "fixed";
   value: number;
 }
 
 interface DiscountCodeInputProps {
   onApply?: (discount: DiscountInfo) => void;
   onRemove?: () => void;
   appliedDiscount?: DiscountInfo | null;
 }
 
 const VALID_CODES: Record<string, DiscountInfo> = {
   "WELCOME10": { code: "WELCOME10", type: "percentage", value: 10 },
   "SAVE20": { code: "SAVE20", type: "percentage", value: 20 },
   "FREESHIP": { code: "FREESHIP", type: "fixed", value: 0 },
 };
 
 export function DiscountCodeInput({ onApply, onRemove, appliedDiscount }: DiscountCodeInputProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [code, setCode] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
   const [message, setMessage] = useState("");
 
   // If there's an applied discount, show it expanded
   const effectiveIsOpen = isOpen || !!appliedDiscount;
 
   const handleApply = async () => {
     if (!code.trim()) return;
 
     setIsLoading(true);
     setStatus("idle");
     setMessage("");
 
     // Simulate validation delay
     await new Promise((resolve) => setTimeout(resolve, 800));
 
     const trimmedCode = code.trim().toUpperCase();
     const discount = VALID_CODES[trimmedCode];
 
     if (discount) {
       setStatus("success");
       setMessage("Code applied successfully!");
       onApply?.(discount);
     } else {
       setStatus("error");
       setMessage("Invalid or expired code");
     }
 
     setIsLoading(false);
   };
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === "Enter" && !isLoading) {
       handleApply();
     }
   };
 
   const handleRemove = () => {
     setCode("");
     setStatus("idle");
     setMessage("");
     onRemove?.();
   };
 
   return (
     <Collapsible open={effectiveIsOpen} onOpenChange={setIsOpen}>
       <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1">
         <Tag className="w-3.5 h-3.5" />
         <span>{appliedDiscount ? `Code: ${appliedDiscount.code}` : "Have a promo code?"}</span>
         <ChevronDown
           className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${
             effectiveIsOpen ? "rotate-180" : ""
           }`}
         />
       </CollapsibleTrigger>
 
       <CollapsibleContent className="pt-2">
         {appliedDiscount ? (
           <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
             <div className="flex items-center gap-2">
               <Check className="w-4 h-4 text-green-600" />
               <span className="text-sm font-medium text-green-700 dark:text-green-400">
                 {appliedDiscount.code}
                 {appliedDiscount.type === "percentage" && ` (-${appliedDiscount.value}%)`}
               </span>
             </div>
             <Button
               variant="ghost"
               size="sm"
               onClick={handleRemove}
               className="h-7 px-2 text-muted-foreground hover:text-destructive"
             >
               <X className="w-4 h-4" />
             </Button>
           </div>
         ) : (
           <div className="flex gap-2">
             <Input
               type="text"
               placeholder="Enter code"
               value={code}
               onChange={(e) => {
                 setCode(e.target.value);
                 if (status !== "idle") {
                   setStatus("idle");
                   setMessage("");
                 }
               }}
               onKeyDown={handleKeyDown}
               className="h-9 text-sm"
               disabled={isLoading}
             />
             <Button
               onClick={handleApply}
               disabled={isLoading || !code.trim()}
               size="sm"
               className="h-9 px-4"
             >
               {isLoading ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : (
                 "Apply"
               )}
             </Button>
           </div>
         )}
 
         {/* Status message - only show when no applied discount */}
         {message && !appliedDiscount && (
           <div
             className={`flex items-center gap-1.5 mt-2 text-xs ${
               status === "success" ? "text-green-600" : "text-destructive"
             }`}
           >
             {status === "success" ? (
               <Check className="w-3.5 h-3.5" />
             ) : (
               <X className="w-3.5 h-3.5" />
             )}
             <span>{message}</span>
           </div>
         )}
       </CollapsibleContent>
     </Collapsible>
   );
 }