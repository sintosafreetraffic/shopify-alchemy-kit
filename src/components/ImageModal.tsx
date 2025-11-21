import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageModal = ({ imageUrl, onClose }: ImageModalProps) => {
  const [isZoomed, setIsZoomed] = useState(false);

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
      setIsZoomed(false);
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Control buttons fixed to top right of viewport */}
      <div className="fixed top-4 right-4 md:top-8 md:right-8 flex gap-2 z-[310]">
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className="bg-white/90 rounded-full p-2 md:p-3 shadow-lg hover:bg-white transition-colors"
          aria-label={isZoomed ? "Zoom out" : "Zoom in"}
        >
          {isZoomed ? (
            <ZoomOut className="h-4 w-4 md:h-5 md:w-5 text-black" />
          ) : (
            <ZoomIn className="h-4 w-4 md:h-5 md:w-5 text-black" />
          )}
        </button>
        <button
          onClick={onClose}
          className="bg-white/90 rounded-full p-2 md:p-3 shadow-lg hover:bg-white transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 md:h-5 md:w-5 text-black" />
        </button>
      </div>
      
      <div
        className="relative max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className={`transition-transform duration-300 ${isZoomed ? 'scale-150 cursor-move overflow-auto max-h-[85vh]' : 'scale-100'}`}>
          <img
            src={imageUrl}
            alt="Product preview"
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
            draggable={isZoomed}
          />
        </div>
      </div>
    </div>
  );
};
