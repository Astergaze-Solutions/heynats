import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useNATSContexts } from "../../hooks/useNATSContexts";
import type { NATSContext } from "../../services/types";

interface ContextFormProps {
  editingId?: string | null;
  onClose: () => void;
}

export function ContextForm({ editingId, onClose }: ContextFormProps) {
  const { contexts, addContext, updateContext } = useNATSContexts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<NATSContext>>({
    name: "",
    description: "",
    host: "localhost",
    port: "4222",
    username: "",
    password: "",
  });

  // Load existing context if editing
  useEffect(() => {
    if (editingId) {
      const context = contexts.find((ctx) => ctx.id === editingId);
      if (context) {
        setFormData({
          name: context.name,
          description: context.description,
          host: context.host,
          port: context.port,
          username: context.username,
          password: context.password,
        });
      }
    }
  }, [editingId, contexts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim() || !formData.host?.trim() || !formData.port?.trim()) {
      alert("Please fill in all required fields (Name, Host, Port)");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        // Update existing context
        const result = await updateContext(editingId, {
          name: formData.name,
          description: formData.description,
          host: formData.host,
          port: formData.port,
          username: formData.username || "",
          password: formData.password || "",
        });

        if (result.success) {
          onClose();
        }
      } else {
        // Create new context
        const newContext: NATSContext = {
          id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: formData.name!,
          description: formData.description,
          host: formData.host!,
          port: formData.port!,
          username: formData.username || "",
          password: formData.password || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDefault: contexts.length === 0,
        };

        const result = await addContext(newContext);

        if (result.success) {
          onClose();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {editingId ? "Edit Context" : "Add New Context"}
      </h3>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Context Name <span className="text-red-500">*</span>
        </label>
        <Input
          id="name"
          type="text"
          required
          placeholder="e.g., Production, Development, Local"
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <Textarea
          id="description"
          placeholder="Optional description for this context"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isSubmitting}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-2">
            Host <span className="text-red-500">*</span>
          </label>
          <Input
            id="host"
            type="text"
            required
            placeholder="localhost or IP address"
            value={formData.host || ""}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
            Port <span className="text-red-500">*</span>
          </label>
          <Input
            id="port"
            type="text"
            required
            placeholder="4222"
            value={formData.port || ""}
            onChange={(e) => setFormData({ ...formData, port: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <Input
            id="username"
            type="text"
            placeholder="Optional"
            value={formData.username || ""}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Optional"
            value={formData.password || ""}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6">
        <Button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : editingId ? "Update Context" : "Save Context"}
        </Button>
      </div>
    </form>
  );
}
