/**
 * Block Wrapper
 * Overlay around each block with selection, drag, and action controls
 */

import { useState, useRef } from 'react';
import { GripVertical, Plus, Eye, EyeOff, Settings, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { blockRegistry } from '@/lib/visual-editor/blockRegistry';
import type { BlockConfig } from '@/types/visual-editor';

interface BlockWrapperProps {
  block: BlockConfig;
  index: number;
  children: React.ReactNode;
}

export function BlockWrapper({ block, index, children }: BlockWrapperProps) {
  const {
    editorState,
    selectBlock,
    hoverBlock,
    toggleBlockVisibility,
    duplicateBlock,
    removeBlock,
    openBlockPicker,
    reorderBlocks,
  } = useVisualEditorStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isSelected = editorState.selectedBlockId === block.id;
  const isHovered = editorState.hoveredBlockId === block.id;
  const definition = blockRegistry[block.type];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('blockId', block.id);
    e.dataTransfer.setData('blockIndex', String(index));
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const midY = rect.top + rect.height / 2;
    setDragOverPosition(e.clientY < midY ? 'above' : 'below');
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('blockIndex'), 10);
    const targetIndex = dragOverPosition === 'above' ? index : index + 1;

    if (draggedIndex !== targetIndex && draggedIndex !== targetIndex - 1) {
      reorderBlocks(draggedIndex, targetIndex > draggedIndex ? targetIndex - 1 : targetIndex);
    }

    setDragOverPosition(null);
  };

  if (!editorState.isEditing) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative group transition-all',
        isDragging && 'opacity-50',
        !block.visible && 'opacity-40'
      )}
      onMouseEnter={() => hoverBlock(block.id)}
      onMouseLeave={() => hoverBlock(null)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop indicator above */}
      {dragOverPosition === 'above' && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-primary rounded-full z-50" />
      )}

      {/* Selection/hover outline */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none transition-all z-40',
          isSelected && 'ring-2 ring-primary ring-offset-2',
          isHovered && !isSelected && 'ring-1 ring-primary/50'
        )}
      />

      {/* Block label */}
      {(isHovered || isSelected) && (
        <div className="absolute -top-7 left-2 z-50 flex items-center gap-1">
          <span className="text-xs font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded">
            {definition?.name || block.type}
          </span>
          {!block.visible && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
              Hidden
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(isHovered || isSelected) && (
        <div className="absolute -top-7 right-2 z-50 flex items-center gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-6 w-6"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-6 w-6"
            onClick={() => toggleBlockVisibility(block.id)}
          >
            {block.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-6 w-6"
            onClick={() => selectBlock(block.id)}
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-6 w-6"
            onClick={() => duplicateBlock(block.id)}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-6 w-6"
            onClick={() => removeBlock(block.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Add block button (between blocks) */}
      {(isHovered || isSelected) && (
        <button
          onClick={() => openBlockPicker(index + 1)}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      {/* Drop indicator below */}
      {dragOverPosition === 'below' && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-full z-50" />
      )}

      {/* Click to select */}
      <div
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          selectBlock(block.id);
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Add Block Button - Standalone button to add first block or between sections
 */
export function AddBlockButton({ position }: { position: number }) {
  const { editorState, openBlockPicker } = useVisualEditorStore();

  if (!editorState.isEditing) return null;

  return (
    <div className="flex items-center justify-center py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => openBlockPicker(position)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Block
      </Button>
    </div>
  );
}
