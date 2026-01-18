/**
 * Visual Editor Page
 * Entry point for editing any page visually
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EditorCanvas } from '@/components/visual-editor/EditorCanvas';
import { Loader2 } from 'lucide-react';

// Map of editable pages
const editablePages: Record<string, { handle: string; path: string; name: string }> = {
  'ergonomic-pillow': {
    handle: 'ergonomic-pillow',
    path: '/products/ergonomic-pillow',
    name: 'Ergonomic Pillow Product Page',
  },
  'knee-pillow': {
    handle: 'knee-pillow',
    path: '/products/knee-pillow',
    name: 'Knee Pillow Product Page',
  },
  'sleep-mask': {
    handle: 'sleep-mask',
    path: '/products/sleep-mask',
    name: 'Sleep Mask Product Page',
  },
  'sleep-bundle': {
    handle: 'sleep-bundle',
    path: '/products/sleep-bundle',
    name: 'Sleep Bundle Product Page',
  },
  'home': {
    handle: 'home',
    path: '/',
    name: 'Homepage',
  },
};

export default function VisualEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pageParam = searchParams.get('page') || 'ergonomic-pillow';
  
  const [isLoading, setIsLoading] = useState(true);
  const pageConfig = editablePages[pageParam];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pageParam]);

  const handleClose = () => {
    navigate('/internal/ab-tests');
  };

  if (!pageConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Page not found: {pageParam}</p>
          <p className="text-sm text-muted-foreground">
            Available pages: {Object.keys(editablePages).join(', ')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorCanvas
      pageHandle={pageConfig.handle}
      pagePath={pageConfig.path}
      onClose={handleClose}
    />
  );
}
