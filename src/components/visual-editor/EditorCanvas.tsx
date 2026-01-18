/**
 * Editor Canvas
 * Main editing area that wraps the page content
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { EditorToolbar } from './EditorToolbar';
import { BlockPropertiesPanel } from './BlockPropertiesPanel';
import { BlockPicker } from './BlockPicker';
import { BlockRenderer, pageToBlocks } from './BlockRenderer';
import { AddBlockButton } from './BlockWrapper';

interface EditorCanvasProps {
  pageHandle: string;
  pagePath: string;
  children?: React.ReactNode;
  onClose: () => void;
}

export function EditorCanvas({ pageHandle, pagePath, children, onClose }: EditorCanvasProps) {
  const {
    currentVariant,
    editorState,
    startEditing,
    selectBlock,
  } = useVisualEditorStore();

  // Initialize editor with page blocks
  useEffect(() => {
    const initialBlocks = pageToBlocks(pageHandle);
    startEditing(pageHandle, pagePath, initialBlocks);
  }, [pageHandle, pagePath, startEditing]);

  // Preview width based on mode
  const previewWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }[editorState.previewMode];

  // Click outside to deselect
  const handleCanvasClick = () => {
    if (editorState.selectedBlockId) {
      selectBlock(null);
    }
  };

  if (!currentVariant) {
    return <div className="flex items-center justify-center h-screen">Loading editor...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toolbar */}
      <EditorToolbar onClose={onClose} />

      {/* Main content area */}
      <div className="flex pt-14">
        {/* Canvas */}
        <div
          className="flex-1 overflow-auto"
          onClick={handleCanvasClick}
          style={{ height: 'calc(100vh - 56px)' }}
        >
          <div
            className={cn(
              'mx-auto bg-background shadow-lg transition-all duration-300',
              editorState.previewMode !== 'desktop' && 'rounded-lg my-4'
            )}
            style={{
              width: previewWidth,
              maxWidth: '100%',
              minHeight: 'calc(100vh - 56px)',
            }}
          >
            {/* Add block at top */}
            <AddBlockButton position={0} />

            {/* Render blocks */}
            <BlockRenderer blocks={currentVariant.blocks} isEditing />
          </div>
        </div>

        {/* Properties panel */}
        {editorState.selectedBlockId && <BlockPropertiesPanel />}
      </div>

      {/* Block picker dialog */}
      <BlockPicker />
    </div>
  );
}
