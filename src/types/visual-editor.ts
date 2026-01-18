/**
 * Visual Editor Types
 * Core type definitions for the visual page editor system
 */

export type BlockType = 
  | 'hero'
  | 'features'
  | 'benefits'
  | 'pain-relief'
  | 'chiropractor'
  | 'look-inside'
  | 'reviews-wall'
  | 'reviews-carousel'
  | 'video'
  | 'faq'
  | 'guarantee'
  | 'quiz-cta'
  | 'inline-cta'
  | 'final-cta'
  | 'social-proof-toast'
  | 'exit-popup'
  | 'sticky-cart'
  | 'morning-puffiness'
  | 'custom-text'
  | 'custom-banner';

export interface BlockConfig {
  id: string;
  type: BlockType;
  visible: boolean;
  order: number;
  props: Record<string, unknown>;
  customStyles?: Record<string, string>;
}

export interface PageVariant {
  id: string;
  testId: string;
  variantKey: 'A' | 'B';
  pageHandle: string;
  pagePath: string;
  blocks: BlockConfig[];
  globalStyles?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface BlockDefinition {
  type: BlockType;
  name: string;
  description: string;
  icon: string;
  category: 'hero' | 'content' | 'social-proof' | 'conversion' | 'utility';
  component: string;
  defaultProps: Record<string, unknown>;
  editableProps: EditableProp[];
  isLazy?: boolean;
}

export interface EditableProp {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'number' | 'boolean' | 'select' | 'image';
  defaultValue: unknown;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export interface EditorState {
  isEditing: boolean;
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  isDragging: boolean;
  draggedBlockId: string | null;
  showBlockPicker: boolean;
  insertPosition: number | null;
  hasUnsavedChanges: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';
}

export interface VisualEditorStore {
  // State
  currentVariant: PageVariant | null;
  editorState: EditorState;
  originalPageBlocks: BlockConfig[];
  
  // Actions
  startEditing: (pageHandle: string, pagePath: string) => void;
  stopEditing: () => void;
  
  // Block operations
  selectBlock: (blockId: string | null) => void;
  hoverBlock: (blockId: string | null) => void;
  updateBlockProps: (blockId: string, props: Record<string, unknown>) => void;
  toggleBlockVisibility: (blockId: string) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  addBlock: (type: BlockType, position: number) => void;
  removeBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;
  
  // Picker
  openBlockPicker: (position: number) => void;
  closeBlockPicker: () => void;
  
  // Save/Load
  saveVariant: (testId: string, variantKey: 'A' | 'B') => Promise<void>;
  loadVariant: (variantId: string) => Promise<void>;
  discardChanges: () => void;
  
  // Preview
  setPreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
}
