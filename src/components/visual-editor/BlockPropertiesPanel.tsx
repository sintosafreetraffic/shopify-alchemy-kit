/**
 * Block Properties Panel
 * Side panel for editing selected block properties
 */

import { X, Eye, EyeOff, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { blockRegistry } from '@/lib/visual-editor/blockRegistry';
import type { EditableProp } from '@/types/visual-editor';

export function BlockPropertiesPanel() {
  const {
    currentVariant,
    editorState,
    selectBlock,
    updateBlockProps,
    toggleBlockVisibility,
    duplicateBlock,
    removeBlock,
  } = useVisualEditorStore();

  const selectedBlock = currentVariant?.blocks.find(
    b => b.id === editorState.selectedBlockId
  );

  if (!selectedBlock) {
    return (
      <div className="w-80 border-l bg-card p-4 flex items-center justify-center text-muted-foreground text-sm">
        Select a block to edit its properties
      </div>
    );
  }

  const definition = blockRegistry[selectedBlock.type];
  if (!definition) return null;

  const handlePropChange = (key: string, value: unknown) => {
    updateBlockProps(selectedBlock.id, { [key]: value });
  };

  const renderPropEditor = (prop: EditableProp) => {
    const currentValue = selectedBlock.props[prop.key] ?? prop.defaultValue;

    switch (prop.type) {
      case 'text':
        return (
          <Input
            value={String(currentValue)}
            onChange={(e) => handlePropChange(prop.key, e.target.value)}
            placeholder={prop.placeholder}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={String(currentValue)}
            onChange={(e) => handlePropChange(prop.key, e.target.value)}
            placeholder={prop.placeholder}
            rows={4}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={Number(currentValue)}
            onChange={(e) => handlePropChange(prop.key, Number(e.target.value))}
          />
        );

      case 'boolean':
        return (
          <Switch
            checked={Boolean(currentValue)}
            onCheckedChange={(checked) => handlePropChange(prop.key, checked)}
          />
        );

      case 'select':
        return (
          <Select
            value={String(currentValue)}
            onValueChange={(value) => handlePropChange(prop.key, value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {prop.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'color':
        return (
          <div className="flex gap-2">
            <Input
              type="color"
              value={String(currentValue)}
              onChange={(e) => handlePropChange(prop.key, e.target.value)}
              className="w-12 h-10 p-1"
            />
            <Input
              type="text"
              value={String(currentValue)}
              onChange={(e) => handlePropChange(prop.key, e.target.value)}
              className="flex-1"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">{definition.name}</h3>
          <p className="text-xs text-muted-foreground">Edit block properties</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => selectBlock(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="p-4 border-b flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => toggleBlockVisibility(selectedBlock.id)}
        >
          {selectedBlock.visible ? (
            <>
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              Hide
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Show
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => duplicateBlock(selectedBlock.id)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            removeBlock(selectedBlock.id);
            selectBlock(null);
          }}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Properties */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {definition.editableProps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This block has no editable properties.
            </p>
          ) : (
            definition.editableProps.map((prop) => (
              <div key={prop.key} className="space-y-2">
                <Label className="text-xs font-medium">{prop.label}</Label>
                {renderPropEditor(prop)}
              </div>
            ))
          )}

          <Separator className="my-4" />

          {/* Block info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Block ID: <code className="bg-muted px-1 rounded">{selectedBlock.id}</code></p>
            <p>Type: <code className="bg-muted px-1 rounded">{selectedBlock.type}</code></p>
            <p>Order: {selectedBlock.order}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
