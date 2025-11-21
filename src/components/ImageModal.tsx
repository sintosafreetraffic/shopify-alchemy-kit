import { X } from "lucide-react";
import { useEffect } from "react";

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageModal = ({ imageUrl, onClose }: ImageModalProps) => {
  useEffect(() => {
    if (!imageUrl) return;
    
    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-colors"
          aria-label="Close"
        >
          <X className="h-6 w-6 text-black" />
        </button>
        <img
          src={imageUrl}
          alt="Product preview"
          className="w-full h-auto rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
};
