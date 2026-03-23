import { useState } from "react";
import { Plus, Trash2, Star, Edit2 } from "lucide-react";
import { Button } from "../ui/button";
import { useNATSContexts } from "../../hooks/useNATSContexts";
import type { NATSContext } from "../../services/types";
import { ContextForm } from "./ContextForm";

interface ContextManagerProps {
  onSelectContext?: (context: NATSContext) => void;
  onClose?: () => void;
}

export function ContextManager({ onSelectContext, onClose }: ContextManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { contexts, isLoading, error, deleteContext, setDefaultContext, refreshContexts } =
    useNATSContexts();

  const handleDeleteClick = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const handleConfirmDelete = async (id: string) => {
    await deleteContext(id);
    setShowDeleteConfirm(null);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultContext(id);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    refreshContexts();
  };

  const handleSelectContext = (context: NATSContext) => {
    if (onSelectContext) {
      onSelectContext(context);
      if (onClose) {
        onClose();
      }
    }
  };

  const handleEditClick = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading contexts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showForm ? (
        <ContextForm editingId={editingId} onClose={handleFormClose} />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Saved Contexts</h3>
            <Button
              onClick={() => {
                setEditingId(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              type="button"
            >
              <Plus className="w-4 h-4" />
              New Context
            </Button>
          </div>

          {contexts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No contexts saved yet</p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                type="button"
              >
                Create Your First Context
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {contexts.map((context) => (
                <div
                  key={context.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <button
                    className="flex-1 cursor-pointer text-left p-0 border-0 bg-transparent hover:bg-transparent"
                    onClick={() => handleSelectContext(context)}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{context.name}</h4>
                      {context.isDefault && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    {context.description && (
                      <p className="text-sm text-gray-600 mt-1">{context.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {context.host}:{context.port}
                      {context.username && ` (${context.username})`}
                    </p>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!context.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(context.id);
                          }}
                          className="p-2 text-gray-600 hover:text-yellow-600 rounded"
                          title="Set as default"
                          aria-label="Set as default context"
                          type="button"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(context.id);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 rounded"
                        title="Edit context"
                        aria-label="Edit context"
                        type="button"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(context.id);
                        }}
                        className="p-2 text-gray-600 hover:text-red-600 rounded"
                        title="Delete context"
                        aria-label="Delete context"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>

                  {showDeleteConfirm === context.id && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Delete Context?
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Are you sure you want to delete <strong>{context.name}</strong>? This
                          action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                          <Button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="text-gray-700 border-gray-300 hover:bg-gray-50"
                            type="button"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleConfirmDelete(context.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            type="button"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editingId && !showForm && <ContextForm editingId={editingId} onClose={handleFormClose} />}
    </div>
  );
}
