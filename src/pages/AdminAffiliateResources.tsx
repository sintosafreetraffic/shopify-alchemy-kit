import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Shield, ArrowLeft, Loader2, Plus, Pencil, Trash2, BookOpen, Filter } from "lucide-react";
import { format } from "date-fns";
import { AdminNav } from "@/components/AdminNav";

interface AffiliateResource {
  id: string;
  category: string;
  title: string;
  description: string;
  link_label: string | null;
  link_url: string | null;
  badge: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ResourceFormData {
  category: string;
  title: string;
  description: string;
  link_label: string;
  link_url: string;
  badge: string;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = ["Getting Started", "Content Ideas", "Brand Assets", "FAQ"];

const emptyFormData: ResourceFormData = {
  category: "Getting Started",
  title: "",
  description: "",
  link_label: "",
  link_url: "",
  badge: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminAffiliateResources() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<AffiliateResource[]>([]);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<AffiliateResource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<AffiliateResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadResources();
    }
  }, [isAdmin]);

  async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error) {
      console.error("Error checking admin role:", error);
      toast.error("Error verifying admin access");
      navigate("/");
      return;
    }

    if (!data) {
      toast.error("Access denied: Admin privileges required");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  }

  async function loadResources() {
    setLoading(true);
    const { data, error } = await supabase
      .from("affiliate_resources")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading resources:", error);
      toast.error("Error loading resources");
    } else {
      setResources(data || []);
    }
    setLoading(false);
  }

  const filteredResources = resources.filter(resource => {
    if (categoryFilter !== "all" && resource.category !== categoryFilter) return false;
    if (activeFilter === "active" && !resource.is_active) return false;
    if (activeFilter === "inactive" && resource.is_active) return false;
    return true;
  });

  function openCreateDialog() {
    setEditingResource(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  }

  function openEditDialog(resource: AffiliateResource) {
    setEditingResource(resource);
    setFormData({
      category: resource.category,
      title: resource.title,
      description: resource.description,
      link_label: resource.link_label || "",
      link_url: resource.link_url || "",
      badge: resource.badge || "",
      is_active: resource.is_active,
      sort_order: resource.sort_order,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        category: formData.category,
        title: formData.title.trim(),
        description: formData.description.trim(),
        link_label: formData.link_label.trim() || null,
        link_url: formData.link_url.trim() || null,
        badge: formData.badge.trim() || null,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
        updated_at: new Date().toISOString(),
      };

      if (editingResource) {
        const { error } = await supabase
          .from("affiliate_resources")
          .update(dataToSave)
          .eq("id", editingResource.id);

        if (error) throw error;
        toast.success("Resource updated successfully");
      } else {
        const { error } = await supabase
          .from("affiliate_resources")
          .insert(dataToSave);

        if (error) throw error;
        toast.success("Resource created successfully");
      }

      setDialogOpen(false);
      await loadResources();
    } catch (error) {
      console.error("Error saving resource:", error);
      toast.error("Failed to save resource");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(resource: AffiliateResource) {
    try {
      const { error } = await supabase
        .from("affiliate_resources")
        .update({ 
          is_active: !resource.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", resource.id);

      if (error) throw error;

      setResources(prev => prev.map(r => 
        r.id === resource.id ? { ...r, is_active: !r.is_active } : r
      ));
      
      toast.success(resource.is_active ? "Resource deactivated" : "Resource activated");
    } catch (error) {
      console.error("Error toggling resource:", error);
      toast.error("Failed to update resource");
    }
  }

  function confirmDelete(resource: AffiliateResource) {
    setResourceToDelete(resource);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!resourceToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("affiliate_resources")
        .delete()
        .eq("id", resourceToDelete.id);

      if (error) throw error;

      toast.success("Resource deleted successfully");
      setDeleteDialogOpen(false);
      setResourceToDelete(null);
      await loadResources();
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource");
    } finally {
      setDeleting(false);
    }
  }

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Access denied fallback
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You do not have permission to access this page. Admin privileges are required.
            </p>
            <Button onClick={() => navigate("/")}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Admin Navigation */}
        <AdminNav />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Affiliate Resources
              </h1>
              <p className="text-muted-foreground">Manage the content shown in the Affiliate Dashboard resources section</p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Resource
          </Button>
        </div>

        {/* Filters and Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active only</SelectItem>
                    <SelectItem value="inactive">Inactive only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                Showing {filteredResources.length} of {resources.length} resources
              </div>
            </CardContent>
          </Card>

          {/* Resources Table */}
          <Card className="lg:col-span-3">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No resources found</p>
                  <Button variant="link" onClick={openCreateDialog} className="mt-2">
                    Create your first resource
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Badge</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {resource.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{resource.title}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {resource.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          {resource.badge ? (
                            <Badge className="bg-primary/10 text-primary">
                              {resource.badge}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={resource.is_active ? "default" : "secondary"}>
                            {resource.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{resource.sort_order}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(resource.updated_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(resource)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActive(resource)}
                            >
                              <Switch
                                checked={resource.is_active}
                                className="pointer-events-none"
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete(resource)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? "Edit Resource" : "Create Resource"}
            </DialogTitle>
            <DialogDescription>
              {editingResource 
                ? "Update the resource details below" 
                : "Add a new resource for affiliates"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Resource title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the resource"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link Label</Label>
                <Input
                  value={formData.link_label}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_label: e.target.value }))}
                  placeholder="e.g. Open guide"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge</Label>
                <Input
                  value={formData.badge}
                  onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                  placeholder="e.g. Recommended, New"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active (visible to affiliates)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingResource ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{resourceToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
