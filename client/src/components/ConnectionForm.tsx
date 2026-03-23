import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import type { ConnectionCredentials } from "../lib/api";
import { useNATSContexts } from "../hooks/useNATSContexts";
import type { NATSContext } from "../services/types";
import { ContextManager } from "./contexts/ContextManager";
import { History } from "lucide-react";

interface ConnectionFormProps {
  onConnect: (credentials: ConnectionCredentials) => Promise<void>;
  isLoading: boolean;
}

export function ConnectionForm({ onConnect, isLoading }: ConnectionFormProps) {
  const [credentials, setCredentials] = useState<ConnectionCredentials>({
    host: "localhost",
    port: "4222",
    username: "",
    password: "",
  });
  const [saveConnection, setSaveConnection] = useState(false);
  const [showContextManager, setShowContextManager] = useState(false);
  const { getDefaultContext } = useNATSContexts();

  // Load default context on component mount
  useEffect(() => {
    const loadDefaultContext = async () => {
      const defaultContextResult = await getDefaultContext();
      if (defaultContextResult.success && defaultContextResult.data) {
        const context = defaultContextResult.data;
        setCredentials({
          host: context.host,
          port: context.port,
          username: context.username,
          password: context.password,
        });
        setSaveConnection(true);
      } else {
        // Fallback to localStorage if no context is set
        const savedCredentials = localStorage.getItem("nats-connection");
        if (savedCredentials) {
          try {
            const parsed = JSON.parse(savedCredentials);
            setCredentials(parsed);
            setSaveConnection(true);
          } catch (error) {
            console.error("Failed to parse saved credentials:", error);
          }
        }
      }
    };

    loadDefaultContext();
  }, [getDefaultContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Save credentials to localStorage if checkbox is checked
    if (saveConnection) {
      localStorage.setItem("nats-connection", JSON.stringify(credentials));
    } else {
      localStorage.removeItem("nats-connection");
    }

    await onConnect(credentials);
  };

  const handleInputChange = (field: keyof ConnectionCredentials, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectContext = (context: NATSContext) => {
    setCredentials({
      host: context.host,
      port: context.port,
      username: context.username,
      password: context.password,
    });
    setSaveConnection(true);
    setShowContextManager(false);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Connect to NATS Server
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your NATS server connection details
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="host" className="block text-sm font-medium text-gray-700">
                  Host
                </label>
                <input
                  id="host"
                  name="host"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="localhost"
                  value={credentials.host}
                  onChange={(e) => handleInputChange("host", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                  Port
                </label>
                <input
                  id="port"
                  name="port"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="4222"
                  value={credentials.port}
                  onChange={(e) => handleInputChange("port", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username (optional)
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={credentials.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password (optional)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="save-connection"
                name="save-connection"
                type="checkbox"
                checked={saveConnection}
                onChange={(e) => setSaveConnection(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="save-connection" className="ml-2 block text-sm text-gray-700">
                Save connection information
              </label>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  "Connect to NATS"
                )}
              </Button>

              <button
                type="button"
                onClick={() => setShowContextManager(true)}
                disabled={isLoading}
                className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                aria-label="Manage saved contexts"
              >
                <History size={18} />
                Manage Contexts
              </button>
            </div>
          </form>
        </div>
      </div>

      {showContextManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">NATS Contexts</h2>
              <button
                onClick={() => setShowContextManager(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close context manager"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <ContextManager
                onSelectContext={handleSelectContext}
                onClose={() => setShowContextManager(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
