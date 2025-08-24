import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const UIManagement = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [editingComponent, setEditingComponent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    type: "",
    message: "",
  });

  // Component types available in the system
  const componentTypes = [
    {
      value: "hero",
      label: "Hero Section",
      description: "Main banner/hero sections",
    },
    {
      value: "card",
      label: "Content Card",
      description: "Information cards and boxes",
    },
    { value: "banner", label: "Banner", description: "Promotional banners" },
    {
      value: "testimonial",
      label: "Testimonial",
      description: "Customer testimonials",
    },
    {
      value: "service",
      label: "Service Item",
      description: "Service descriptions",
    },
    {
      value: "announcement",
      label: "Announcement",
      description: "News and announcements",
    },
    {
      value: "feature",
      label: "Feature Block",
      description: "Feature highlights",
    },
    {
      value: "gallery",
      label: "Gallery Item",
      description: "Image gallery items",
    },
  ];

  // Mock data based on your ui_components table structure
  const mockComponents = [
    {
      id: "1",
      component_name: "main_hero",
      component_type: "hero",
      title: "Welcome to Our Dental Care Platform",
      content:
        "Connect with trusted dental professionals and manage your oral health journey with confidence.",
      image_url:
        "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800",
      is_active: true,
      display_order: 1,
      metadata: { version: "1.2", last_preview: "2024-08-20" },
      created_at: "2024-08-15T10:30:00Z",
      updated_at: "2024-08-20T14:22:00Z",
    },
    {
      id: "2",
      component_name: "services_card_1",
      component_type: "card",
      title: "General Dentistry",
      content:
        "Comprehensive dental care including cleanings, fillings, and preventive treatments.",
      image_url:
        "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400",
      is_active: true,
      display_order: 2,
      metadata: { category: "services", featured: true },
      created_at: "2024-08-10T09:15:00Z",
      updated_at: "2024-08-18T16:45:00Z",
    },
    {
      id: "3",
      component_name: "promo_banner",
      component_type: "banner",
      title: "New Patient Special - 50% Off First Visit",
      content:
        "Book your first appointment today and receive 50% off your initial consultation and cleaning.",
      image_url: null,
      is_active: false,
      display_order: 3,
      metadata: { expires: "2024-09-30", promotion_code: "NEW50" },
      created_at: "2024-08-05T11:00:00Z",
      updated_at: "2024-08-19T13:30:00Z",
    },
    {
      id: "4",
      component_name: "testimonial_featured",
      component_type: "testimonial",
      title: "Sarah Johnson - Satisfied Patient",
      content:
        "The platform made it so easy to find a great dentist in my area. The booking process was seamless!",
      image_url:
        "https://images.unsplash.com/photo-1494790108755-2616b612b647?w=150",
      is_active: true,
      display_order: 4,
      metadata: { rating: 5, verified: true, location: "New York" },
      created_at: "2024-08-12T14:20:00Z",
      updated_at: "2024-08-17T10:15:00Z",
    },
  ];

  // Initialize with mock data
  useEffect(() => {
    // Simulate API call delay
    setTimeout(() => {
      setComponents(mockComponents);
      setLoading(false);
    }, 800);
  }, []);

  // Filter components based on search and type
  const filteredComponents = components.filter((component) => {
    const matchesSearch =
      component.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.component_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      component.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      selectedType === "all" || component.component_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(
      () => setNotification({ show: false, type: "", message: "" }),
      3000
    );
  };

  // Handle component save
  const handleSaveComponent = async (componentData) => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (editingComponent) {
        // Update existing component
        setComponents((prev) =>
          prev.map((comp) =>
            comp.id === editingComponent.id
              ? {
                  ...comp,
                  ...componentData,
                  updated_at: new Date().toISOString(),
                }
              : comp
          )
        );
        showNotification("success", "Component updated successfully");
      } else {
        // Create new component
        const newComponent = {
          id: Date.now().toString(),
          ...componentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setComponents((prev) => [...prev, newComponent]);
        showNotification("success", "Component created successfully");
      }

      setEditingComponent(null);
      setShowCreateModal(false);
    } catch (error) {
      showNotification("error", "Failed to save component");
    } finally {
      setSaving(false);
    }
  };

  // Handle component deletion
  const handleDeleteComponent = async (componentId) => {
    if (!window.confirm("Are you sure you want to delete this component?"))
      return;

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setComponents((prev) => prev.filter((comp) => comp.id !== componentId));
      showNotification("success", "Component deleted successfully");
    } catch (error) {
      showNotification("error", "Failed to delete component");
    }
  };

  // Toggle component active status
  const toggleComponentStatus = async (componentId) => {
    try {
      setComponents((prev) =>
        prev.map((comp) =>
          comp.id === componentId
            ? {
                ...comp,
                is_active: !comp.is_active,
                updated_at: new Date().toISOString(),
              }
            : comp
        )
      );
      showNotification("success", "Component status updated");
    } catch (error) {
      showNotification("error", "Failed to update component status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          {/* Loading skeleton */}
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg p-6 border">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-fadeIn ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {notification.message}
        </div>
      )}

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              UI Components Management
            </h1>
            <p className="text-muted-foreground">
              Manage and customize UI components displayed on the public website
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search components..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="all">All Types</option>
                {componentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={18} />
              Create Component
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-foreground">
                {components.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Components
              </div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">
                {components.filter((c) => c.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">
                {components.filter((c) => !c.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Inactive</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {new Set(components.map((c) => c.component_type)).size}
              </div>
              <div className="text-sm text-muted-foreground">Types</div>
            </div>
          </div>

          {/* Components Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredComponents.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                componentTypes={componentTypes}
                onEdit={(comp) => setEditingComponent(comp)}
                onToggleStatus={toggleComponentStatus}
                onDelete={handleDeleteComponent}
              />
            ))}
          </div>

          {filteredComponents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-lg">
                No components found
              </div>
              <p className="text-muted-foreground mt-2">
                {searchTerm || selectedType !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first UI component to get started"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingComponent) && (
        <ComponentModal
          component={editingComponent}
          componentTypes={componentTypes}
          onSave={handleSaveComponent}
          onClose={() => {
            setShowCreateModal(false);
            setEditingComponent(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
};

// Component Card
const ComponentCard = ({
  component,
  componentTypes,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const componentTypeLabel =
    componentTypes.find((t) => t.value === component.component_type)?.label ||
    component.component_type;

  return (
    <div className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      {/* Image Preview */}
      {component.image_url && (
        <div className="relative h-32 overflow-hidden rounded-t-lg">
          <img
            src={component.image_url}
            alt={component.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-1 text-xs rounded-full font-medium ${
                  component.is_active
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                }`}
              >
                {component.is_active ? "Active" : "Inactive"}
              </span>
              <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                {componentTypeLabel}
              </span>
            </div>
            <h3 className="font-semibold text-foreground line-clamp-1">
              {component.title || component.component_name}
            </h3>
          </div>
        </div>

        {/* Content Preview */}
        {component.content && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {component.content}
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-1 mb-4 text-xs text-muted-foreground">
          <div>
            Name: <span className="font-mono">{component.component_name}</span>
          </div>
          <div>Order: {component.display_order}</div>
          <div>
            Updated: {new Date(component.updated_at).toLocaleDateString()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(component)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Edit3 size={14} />
            Edit
          </button>

          <button
            onClick={() => onToggleStatus(component.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
              component.is_active
                ? "bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30"
                : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
            }`}
          >
            {component.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
            {component.is_active ? "Deactivate" : "Activate"}
          </button>

          <button
            onClick={() => onDelete(component.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Component Modal
const ComponentModal = ({
  component,
  componentTypes,
  onSave,
  onClose,
  saving,
}) => {
  const [formData, setFormData] = useState({
    component_name: component?.component_name || "",
    component_type: component?.component_type || "card",
    title: component?.title || "",
    content: component?.content || "",
    image_url: component?.image_url || "",
    is_active: component?.is_active ?? true,
    display_order: component?.display_order || 0,
    metadata: component?.metadata || {},
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.component_name.trim()) {
      newErrors.component_name = "Component name is required";
    }

    if (!formData.component_type) {
      newErrors.component_type = "Component type is required";
    }

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const selectedType = componentTypes.find(
    (t) => t.value === formData.component_type
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-foreground">
              {component ? "Edit Component" : "Create Component"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Component Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Component Name *
              </label>
              <input
                type="text"
                value={formData.component_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    component_name: e.target.value,
                  }))
                }
                className={`w-full px-3 py-2 bg-input border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent ${
                  errors.component_name ? "border-red-500" : "border-border"
                }`}
                placeholder="e.g., main_hero, services_card_1"
              />
              {errors.component_name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.component_name}
                </p>
              )}
            </div>

            {/* Component Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Component Type *
              </label>
              <select
                value={formData.component_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    component_type: e.target.value,
                  }))
                }
                className={`w-full px-3 py-2 bg-input border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent ${
                  errors.component_type ? "border-red-500" : "border-border"
                }`}
              >
                {componentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
              {errors.component_type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.component_type}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className={`w-full px-3 py-2 bg-input border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent ${
                  errors.title ? "border-red-500" : "border-border"
                }`}
                placeholder="Enter component title"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={4}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="Enter component content"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    image_url: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    display_order: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                min="0"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-ring"
              />
              <label
                htmlFor="is_active"
                className="text-sm font-medium text-foreground"
              >
                Component is active
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {component ? "Update" : "Create"} Component
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UIManagement;
