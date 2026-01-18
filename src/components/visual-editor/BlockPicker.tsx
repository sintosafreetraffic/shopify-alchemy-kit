/**
 * Block Picker Dialog
 * Allows users to select blocks to add to the page
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Check,
  Award,
  Heart,
  UserCheck,
  Eye,
  MessageSquare,
  Play,
  HelpCircle,
  Shield,
  ClipboardList,
  Megaphone,
  Zap,
  Bell,
  AlertTriangle,
  ShoppingCart,
  Sun,
  Type,
  Flag,
  FileText,
  Users,
  TrendingUp,
  Settings,
  Search,
} from 'lucide-react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { blockRegistry, blockCategories, getBlocksByCategory } from '@/lib/visual-editor/blockRegistry';
import type { BlockType, BlockDefinition } from '@/types/visual-editor';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Star,
  Check,
  Award,
  Heart,
  UserCheck,
  Eye,
  MessageSquare,
  Play,
  HelpCircle,
  Shield,
  ClipboardList,
  Megaphone,
  Zap,
  Bell,
  AlertTriangle,
  ShoppingCart,
  Sun,
  Type,
  Flag,
  FileText,
  Users,
  TrendingUp,
  Settings,
};

const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  hero: Star,
  content: FileText,
  'social-proof': Users,
  conversion: TrendingUp,
  utility: Settings,
};

export function BlockPicker() {
  const { editorState, addBlock, closeBlockPicker } = useVisualEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSelectBlock = (type: BlockType) => {
    if (editorState.insertPosition !== null) {
      addBlock(type, editorState.insertPosition);
    }
    closeBlockPicker();
  };

  const filteredBlocks = Object.values(blockRegistry).filter(block => {
    const matchesSearch = !searchQuery || 
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || block.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={editorState.showBlockPicker} onOpenChange={(open) => !open && closeBlockPicker()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Block</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {blockCategories.map((cat) => {
              const Icon = categoryIconMap[cat.id] || FileText;
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {cat.name}
                </Button>
              );
            })}
          </div>
          
          {/* Block grid */}
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 gap-3">
              {filteredBlocks.map((block) => {
                const Icon = iconMap[block.icon] || FileText;
                return (
                  <button
                    key={block.type}
                    onClick={() => handleSelectBlock(block.type)}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{block.name}</span>
                        {block.isLazy && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Lazy
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {block.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {filteredBlocks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No blocks found matching "{searchQuery}"
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
