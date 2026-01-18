/**
 * Editor Toolbar
 * Top toolbar with editor actions
 */

import { useState } from 'react';
import {
  Save,
  X,
  Undo2,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditorToolbarProps {
  onClose: () => void;
}

export function EditorToolbar({ onClose }: EditorToolbarProps) {
  const {
    currentVariant,
    editorState,
    discardChanges,
    setPreviewMode,
    saveVariant,
    stopEditing,
  } = useVisualEditorStore();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch active tests
  const { data: activeTests } = useQuery({
    queryKey: ['ab-tests-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_tests')
        .select('id, name, status, impact_zone')
        .in('status', ['draft', 'running'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleSave = async () => {
    if (!selectedTestId) {
      toast.error('Please select a test');
      return;
    }

    const selectedTest = activeTests?.find(t => t.id === selectedTestId);
    if (!selectedTest) return;

    setIsSaving(true);
    try {
      const result = await saveVariant(selectedTestId, selectedTest.name);
      if (result.success) {
        toast.success('Variant saved successfully!');
        setShowSaveDialog(false);
      } else {
        toast.error(result.error || 'Failed to save variant');
      }
    } catch (error) {
      toast.error('Failed to save variant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (editorState.hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to exit?')) {
        stopEditing();
        onClose();
      }
    } else {
      stopEditing();
      onClose();
    }
  };

  return (
    <>
      <div className="h-14 bg-background border-b flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Visual Editor</span>
            {editorState.hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved
              </Badge>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Preview modes */}
          <div className="flex items-center gap-1">
            <Button
              variant={editorState.previewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={editorState.previewMode === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPreviewMode('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={editorState.previewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editorState.hasUnsavedChanges && (
            <Button variant="ghost" size="sm" onClick={discardChanges}>
              <Undo2 className="h-4 w-4 mr-1.5" />
              Discard
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={!editorState.hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save Variant
          </Button>

          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Variant B</DialogTitle>
            <DialogDescription>
              Select an A/B test to save this page variant to. The variant will be 
              automatically served to users assigned to Variant B.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Test</Label>
              <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a test..." />
                </SelectTrigger>
                <SelectContent>
                  {activeTests?.map((test) => (
                    <SelectItem key={test.id} value={test.id}>
                      <div className="flex items-center gap-2">
                        <span>{test.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {test.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentVariant && (
              <div className="text-sm text-muted-foreground">
                <p>Page: <code className="bg-muted px-1 rounded">{currentVariant.pagePath}</code></p>
                <p>Blocks: {currentVariant.blocks.length}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !selectedTestId}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Save Variant
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
