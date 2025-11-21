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
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Control buttons in top right */}
        <div className="absolute -top-14 right-0 flex gap-2">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-colors"
            aria-label={isZoomed ? "Zoom out" : "Zoom in"}
          >
            {isZoomed ? (
              <ZoomOut className="h-5 w-5 text-black" />
            ) : (
              <ZoomIn className="h-5 w-5 text-black" />
            )}
          </button>
          <button
            onClick={onClose}
            className="bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-black" />
          </button>
        </div>
        
        <div className={`overflow-auto max-h-[85vh] rounded-lg transition-transform duration-300 ${isZoomed ? 'scale-150 cursor-move' : 'scale-100'}`}>
          <img
            src={imageUrl}
            alt="Product preview"
            className="w-full h-auto rounded-lg shadow-2xl"
            draggable={isZoomed}
          />
        </div>
      </div>
    </div>
  );
};
