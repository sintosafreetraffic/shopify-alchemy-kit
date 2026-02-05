 import { useState } from "react";
 import { ChevronDown, Tag, Loader2, Check, X } from "lucide-react";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 
 interface DiscountCodeInputProps {
   onApply?: (code: string) => void;
 }
 
 export function DiscountCodeInput({ onApply }: DiscountCodeInputProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [code, setCode] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
   const [message, setMessage] = useState("");
 
   const handleApply = async () => {
     if (!code.trim()) return;
 
     setIsLoading(true);
     setStatus("idle");
     setMessage("");
 
     // Simulate validation delay
     await new Promise((resolve) => setTimeout(resolve, 800));
 
     // Placeholder validation - can be extended for real Shopify discount codes
     const trimmedCode = code.trim().toUpperCase();
     
     // For now, accept some sample codes for demo purposes
     const validCodes = ["WELCOME10", "SAVE20", "FREESHIP"];
     
     if (validCodes.includes(trimmedCode)) {
       setStatus("success");
       setMessage("Code applied successfully!");
       onApply?.(trimmedCode);
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
 
   return (
     <Collapsible open={isOpen} onOpenChange={setIsOpen}>
       <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1">
         <Tag className="w-3.5 h-3.5" />
         <span>Have a promo code?</span>
         <ChevronDown
           className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${
             isOpen ? "rotate-180" : ""
           }`}
         />
       </CollapsibleTrigger>
 
       <CollapsibleContent className="pt-2">
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
 
         {/* Status message */}
         {message && (
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