import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
  images?: string[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export const ImageModal = ({ imageUrl, onClose, images, currentIndex = 0, onNavigate }: ImageModalProps) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const canNavigate = images && images.length > 1 && onNavigate;
  const hasPrev = canNavigate && currentIndex > 0;
  const hasNext = canNavigate && currentIndex < images.length - 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrev && onNavigate) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNext && onNavigate) {
      onNavigate(currentIndex + 1);
    }
  };

  useEffect(() => {
    if (!imageUrl) return;
    
    // Close on Escape key, navigate with arrow keys
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev && onNavigate) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext && onNavigate) onNavigate(currentIndex + 1);
    };
    
    document.addEventListener("keydown", handleKeydown);
    document.body.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "unset";
      setIsZoomed(false);
    };
  }, [imageUrl, onClose, hasPrev, hasNext, currentIndex, onNavigate]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Control buttons fixed to top right of viewport */}
      <div className="fixed top-4 right-4 md:top-8 md:right-8 flex gap-3 z-[310]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
          className="bg-white rounded-full p-3 md:p-3 shadow-xl hover:bg-gray-100 transition-colors"
          aria-label={isZoomed ? "Zoom out" : "Zoom in"}
        >
          {isZoomed ? (
            <ZoomOut className="h-6 w-6 md:h-5 md:w-5 text-black" />
          ) : (
            <ZoomIn className="h-6 w-6 md:h-5 md:w-5 text-black" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="bg-white rounded-full p-3 md:p-3 shadow-xl hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-6 w-6 md:h-5 md:w-5 text-black stroke-[2.5]" />
        </button>
      </div>

      {/* Navigation arrows */}
      {canNavigate && (
        <>
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className={`fixed left-2 md:left-6 top-1/2 -translate-y-1/2 z-[310] bg-white/90 rounded-full p-2 md:p-3 shadow-lg transition-all ${
              hasPrev ? 'hover:bg-white cursor-pointer opacity-100' : 'opacity-30 cursor-not-allowed'
            }`}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-black" />
          </button>
          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={`fixed right-2 md:right-6 top-1/2 -translate-y-1/2 z-[310] bg-white/90 rounded-full p-2 md:p-3 shadow-lg transition-all ${
              hasNext ? 'hover:bg-white cursor-pointer opacity-100' : 'opacity-30 cursor-not-allowed'
            }`}
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-black" />
          </button>
        </>
      )}

      {/* Image counter */}
      {canNavigate && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[310] bg-white/90 rounded-full px-4 py-2 text-sm font-medium text-black">
          {currentIndex + 1} / {images.length}
        </div>
      )}
      
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
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
};
