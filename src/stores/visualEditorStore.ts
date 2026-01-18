/**
 * Visual Editor Store
 * Zustand store for managing visual editor state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  BlockConfig, 
  PageVariant, 
  EditorState, 
  BlockType 
} from '@/types/visual-editor';
import type { Json } from '@/integrations/supabase/types';
import { blockRegistry } from '@/lib/visual-editor/blockRegistry';
import { supabase } from '@/integrations/supabase/client';

// Generate simple unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

interface VisualEditorStore {
  // State
  currentVariant: PageVariant | null;
  editorState: EditorState;
  originalPageBlocks: BlockConfig[];
  savedVariants: PageVariant[];
  
  // Actions
  startEditing: (pageHandle: string, pagePath: string, initialBlocks: BlockConfig[]) => void;
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
  saveVariant: (testId: string, testName: string) => Promise<{ success: boolean; variantId?: string; error?: string }>;
  loadVariant: (variantId: string) => Promise<void>;
  discardChanges: () => void;
  
  // Preview
  setPreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  
  // Get blocks for rendering
  getOrderedBlocks: () => BlockConfig[];
}

const defaultEditorState: EditorState = {
  isEditing: false,
  selectedBlockId: null,
  hoveredBlockId: null,
  isDragging: false,
  draggedBlockId: null,
  showBlockPicker: false,
  insertPosition: null,
  hasUnsavedChanges: false,
  previewMode: 'desktop',
};

export const useVisualEditorStore = create<VisualEditorStore>()(
  persist(
    (set, get) => ({
      currentVariant: null,
      editorState: defaultEditorState,
      originalPageBlocks: [],
      savedVariants: [],
      
      startEditing: (pageHandle, pagePath, initialBlocks) => {
        const variant: PageVariant = {
          id: generateId(),
          testId: '',
          variantKey: 'B',
          pageHandle,
          pagePath,
          blocks: [...initialBlocks],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: false,
        };
        
        set({
          currentVariant: variant,
          originalPageBlocks: [...initialBlocks],
          editorState: {
            ...defaultEditorState,
            isEditing: true,
          },
        });
      },
      
      stopEditing: () => {
        set({
          editorState: defaultEditorState,
        });
      },
      
      selectBlock: (blockId) => {
        set(state => ({
          editorState: {
            ...state.editorState,
            selectedBlockId: blockId,
          },
        }));
      },
      
      hoverBlock: (blockId) => {
        set(state => ({
          editorState: {
            ...state.editorState,
            hoveredBlockId: blockId,
          },
        }));
      },
      
      updateBlockProps: (blockId, newProps) => {
        set(state => {
          if (!state.currentVariant) return state;
          
          const updatedBlocks = state.currentVariant.blocks.map(block =>
            block.id === blockId
              ? { ...block, props: { ...block.props, ...newProps } }
              : block
          );
          
          return {
            currentVariant: {
              ...state.currentVariant,
              blocks: updatedBlocks,
              updatedAt: new Date().toISOString(),
            },
            editorState: {
              ...state.editorState,
              hasUnsavedChanges: true,
            },
          };
        });
      },
      
      toggleBlockVisibility: (blockId) => {
        set(state => {
          if (!state.currentVariant) return state;
          
          const updatedBlocks = state.currentVariant.blocks.map(block =>
            block.id === blockId
              ? { ...block, visible: !block.visible }
              : block
          );
          
          return {
            currentVariant: {
              ...state.currentVariant,
              blocks: updatedBlocks,
              updatedAt: new Date().toISOString(),
            },
            editorState: {
              ...state.editorState,
              hasUnsavedChanges: true,
            },
          };
        });
      },
      
      reorderBlocks: (fromIndex, toIndex) => {
        set(state => {
          if (!state.currentVariant) return state;
          
          const blocks = [...state.currentVariant.blocks];
          const [movedBlock] = blocks.splice(fromIndex, 1);
          blocks.splice(toIndex, 0, movedBlock);
          
          // Update order values
          const updatedBlocks = blocks.map((block, index) => ({
            ...block,
            order: index,
          }));
          
          return {
            currentVariant: {
              ...state.currentVariant,
              blocks: updatedBlocks,
              updatedAt: new Date().toISOString(),
            },
            editorState: {
              ...state.editorState,
              hasUnsavedChanges: true,
            },
          };
        });
      },
      
      addBlock: (type, position) => {
        set(state => {
          if (!state.currentVariant) return state;
          
          const definition = blockRegistry[type];
          if (!definition) return state;
          
          const newBlock: BlockConfig = {
            id: generateId(),
            type,
            visible: true,
            order: position,
            props: { ...definition.defaultProps },
          };
          
          const blocks = [...state.currentVariant.blocks];
          blocks.splice(position, 0, newBlock);
          
          // Re-index orders
          const updatedBlocks = blocks.map((block, index) => ({
            ...block,
            order: index,
          }));
          
          return {
            currentVariant: {
              ...state.currentVariant,
              blocks: updatedBlocks,
              updatedAt: new Date().toISOString(),
            },
            editorState: {
              ...state.editorState,
              hasUnsavedChanges: true,
              showBlockPicker: false,
              insertPosition: null,
            },
          };
        });
      },
      
      removeBlock: (blockId) => {
        set(state => {
          if (!state.currentVariant) return state;
          
          const updatedBlocks = state.currentVariant.blocks
            .filter(block => block.id !== blockId)
            .map((block, index) => ({ ...block, order: index }));
          
          return {
            currentVariant: {
              ...state.currentVariant,
              blocks: updatedBlocks,
              updatedAt: new Date().toISOString(),
            },
            editorState: {
              ...state.editorState,
              hasUnsavedChanges: true,
              selectedBlockId: state.editorState.selectedBlockId === blockId 
                ? null 
                : state.editorState.selectedBlockId,
            },
          };
        });
      },
      
      duplicateBlock: (blockId) => {
        set(state => {
          if (!state.currentVariant) return state;
          
          const blockIndex = state.currentVariant.blocks.findIndex(b => b.id === blockId);
          if (blockIndex === -1) return state;
          
          const originalBlock = state.currentVariant.blocks[blockIndex];
          const duplicatedBlock: BlockConfig = {
            ...originalBlock,
            id: generateId(),
            order: blockIndex + 1,
          };
          
          const blocks = [...state.currentVariant.blocks];
          blocks.splice(blockIndex + 1, 0, duplicatedBlock);
          
          const updatedBlocks = blocks.map((block, index) => ({
            ...block,
            order: index,
          }));
          
          return {
            currentVariant: {
              ...state.currentVariant,
              blocks: updatedBlocks,
              updatedAt: new Date().toISOString(),
            },
            editorState: {
              ...state.editorState,
              hasUnsavedChanges: true,
            },
          };
        });
      },
      
      openBlockPicker: (position) => {
        set(state => ({
          editorState: {
            ...state.editorState,
            showBlockPicker: true,
            insertPosition: position,
          },
        }));
      },
      
      closeBlockPicker: () => {
        set(state => ({
          editorState: {
            ...state.editorState,
            showBlockPicker: false,
            insertPosition: null,
          },
        }));
      },
      
      saveVariant: async (testId, testName) => {
        const state = get();
        if (!state.currentVariant) {
          return { success: false, error: 'No variant to save' };
        }
        
        try {
          // Serialize blocks to JSON-compatible format
          const serializedBlocks = state.currentVariant.blocks.map(block => ({
            id: block.id,
            type: block.type,
            visible: block.visible,
            order: block.order,
            props: block.props as Record<string, Json>,
            customStyles: block.customStyles,
          }));
          
          const variantConfig: Json = {
            id: state.currentVariant.id,
            pageHandle: state.currentVariant.pageHandle,
            pagePath: state.currentVariant.pagePath,
            blocks: serializedBlocks as unknown as Json,
            createdAt: state.currentVariant.createdAt,
            updatedAt: new Date().toISOString(),
          };
          
          // Save to ab_tests table as variant_b_config
          const { error } = await supabase
            .from('ab_tests')
            .update({
              variant_b_config: variantConfig,
            })
            .eq('id', testId);
          
          if (error) throw error;
          
          // Update local state
          const savedVariant: PageVariant = {
            ...state.currentVariant,
            testId,
            isActive: true,
            updatedAt: new Date().toISOString(),
          };
          
          set(state => ({
            currentVariant: savedVariant,
            savedVariants: [
              ...state.savedVariants.filter(v => v.id !== savedVariant.id),
              savedVariant,
            ],
            editorState: {
              ...state.editorState,
              hasUnsavedChanges: false,
            },
          }));
          
          return { success: true, variantId: savedVariant.id };
        } catch (error) {
          console.error('[VisualEditor] Save error:', error);
          return { success: false, error: String(error) };
        }
      },
      
      loadVariant: async (variantId) => {
        const state = get();
        const savedVariant = state.savedVariants.find(v => v.id === variantId);
        
        if (savedVariant) {
          set({
            currentVariant: savedVariant,
            originalPageBlocks: savedVariant.blocks,
            editorState: {
              ...state.editorState,
              isEditing: true,
              hasUnsavedChanges: false,
            },
          });
        }
      },
      
      discardChanges: () => {
        set(state => ({
          currentVariant: state.currentVariant ? {
            ...state.currentVariant,
            blocks: [...state.originalPageBlocks],
          } : null,
          editorState: {
            ...state.editorState,
            hasUnsavedChanges: false,
            selectedBlockId: null,
          },
        }));
      },
      
      setPreviewMode: (mode) => {
        set(state => ({
          editorState: {
            ...state.editorState,
            previewMode: mode,
          },
        }));
      },
      
      getOrderedBlocks: () => {
        const state = get();
        if (!state.currentVariant) return [];
        return [...state.currentVariant.blocks]
          .filter(b => b.visible)
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: 'visual-editor-store',
      partialize: (state) => ({
        savedVariants: state.savedVariants,
      }),
    }
  )
);
