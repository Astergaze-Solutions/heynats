import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { streamsApi } from "../lib/api";
import type { StreamMessage } from "../lib/api";
import { Button } from "./ui/button";
import { formatTimestamp } from "../lib/utils";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";

interface ViewStreamDataModalProps {
  streamName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Utility functions
function formatJSON(data: string): string {
  try {
    const parsed = JSON.parse(data);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return data;
  }
}

function isValidJSON(data: string): boolean {
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}

// JSON Recursive Node Component
interface JsonNodeProps {
  name?: string;
  value: unknown;
  isLast: boolean;
  defaultExpanded?: boolean;
}

function JsonNode({ name, value, isLast, defaultExpanded = false }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Helper to render property key
  const renderKey = () => {
    if (!name) return null;
    return (
      <span className="mr-1">
        <span className="text-purple-600">"{name}"</span>
        <span className="text-gray-600">:</span>
      </span>
    );
  };

  // Helper to render trailing comma
  const renderComma = () => {
    if (!isLast) return <span className="text-gray-600">,</span>;
    return null;
  };

  if (value === null) {
    return (
      <div className="font-mono text-sm leading-6">
        {renderKey()}
        <span className="text-gray-500">null</span>
        {renderComma()}
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div className="font-mono text-sm leading-6">
        {renderKey()}
        <span className="text-orange-600">{value.toString()}</span>
        {renderComma()}
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div className="font-mono text-sm leading-6">
        {renderKey()}
        <span className="text-blue-600">{value}</span>
        {renderComma()}
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <div className="font-mono text-sm leading-6">
        {renderKey()}
        <span className="text-green-600">"{value}"</span>
        {renderComma()}
      </div>
    );
  }

  // Arrays and Objects
  if (typeof value === "object") {
    const isArray = Array.isArray(value);
    const keys = Object.keys(value as object);
    const isEmpty = keys.length === 0;
    const openChar = isArray ? "[" : "{";
    const closeChar = isArray ? "]" : "}";
    const itemCount = keys.length;

    if (isEmpty) {
      return (
        <div className="font-mono text-sm leading-6">
          {renderKey()}
          <span className="text-gray-600">
            {openChar}
            {closeChar}
          </span>
          {renderComma()}
        </div>
      );
    }

    return (
      <div className="font-mono text-sm leading-6">
        <div className="flex items-start">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mr-1 mt-1 p-0.5 hover:bg-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </button>

          <div className="flex-1">
            <span>
              {renderKey()}
              <span className="text-gray-600">{openChar}</span>
            </span>

            {!expanded && (
              <>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="px-1 text-gray-400 hover:text-gray-600 text-xs bg-gray-50 rounded mx-1"
                >
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </button>
                <span className="text-gray-600">{closeChar}</span>
                {renderComma()}
              </>
            )}
          </div>
        </div>

        {expanded && (
          <div>
            <div className="pl-6 border-l border-gray-200 ml-2.5">
              {keys.map((key, index) => (
                <JsonNode
                  key={key}
                  name={isArray ? undefined : key}
                  value={(value as Record<string, unknown>)[key]}
                  isLast={index === keys.length - 1}
                  defaultExpanded={false}
                />
              ))}
            </div>
            <div className="ml-5">
              <span className="text-gray-600">{closeChar}</span>
              {renderComma()}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="font-mono text-sm leading-6">
      {renderKey()}
      <span className="text-gray-800">{String(value)}</span>
      {renderComma()}
    </div>
  );
}

// JSON Viewer Component
function JsonViewer({ data }: { data: unknown }) {
  // We can treat the root as a "value" with no name and isLast=true
  return (
    <div className="w-full">
      <JsonNode value={data} isLast={true} defaultExpanded={true} />
    </div>
  );
}

// Code Display Component with Copy
interface CodeDisplayProps {
  code: string;
  maxHeight?: string;
}

function CodeDisplay({ code, maxHeight = "max-h-64" }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors z-10"
        title="Copy to clipboard"
        type="button"
      >
        <Copy className="w-4 h-4" />
      </button>
      {copied && (
        <div className="absolute top-2 right-12 px-2 py-1 bg-green-500 text-white text-xs rounded">
          Copied!
        </div>
      )}
      <pre
        className={`p-3 bg-gray-900 text-gray-100 rounded border border-gray-700 font-mono text-sm overflow-auto ${maxHeight}`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Message Detail Modal
interface MessageDetailModalProps {
  message: StreamMessage | null;
  isOpen: boolean;
  onClose: () => void;
}

function MessageDetailModal({ message, isOpen, onClose }: MessageDetailModalProps) {
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  if (!isOpen || !message) return null;

  const isMessageJSON = isValidJSON(message.data);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Message Details - Sequence #{message.sequence}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{message.subject}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Subject */}
          <div>
            <label
              htmlFor="detail-subject"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Subject
            </label>
            <div
              id="detail-subject"
              className="p-3 bg-gray-50 rounded border border-gray-300 font-mono text-sm break-all"
            >
              {message.subject}
            </div>
          </div>

          {/* Data Payload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="detail-data" className="block text-sm font-medium text-gray-700">
                Data Payload
                {isMessageJSON && (
                  <span className="ml-2 text-xs font-normal text-green-600">(JSON)</span>
                )}
              </label>
              {isMessageJSON && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("formatted")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === "formatted"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    type="button"
                  >
                    Formatted
                  </button>
                  <button
                    onClick={() => setViewMode("raw")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === "raw"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    type="button"
                  >
                    Raw
                  </button>
                </div>
              )}
            </div>

            <div id="detail-data">
              {viewMode === "formatted" && isMessageJSON ? (
                <div className="p-4 bg-gray-50 rounded border border-gray-300 overflow-auto max-h-96">
                  <JsonViewer data={JSON.parse(message.data)} />
                </div>
              ) : (
                <CodeDisplay
                  code={isMessageJSON ? formatJSON(message.data) : message.data}
                  maxHeight="max-h-96"
                />
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="detail-sequence"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Sequence
              </label>
              <div
                id="detail-sequence"
                className="p-3 bg-gray-50 rounded border border-gray-300 text-sm font-mono"
              >
                {message.sequence}
              </div>
            </div>
            <div>
              <label htmlFor="detail-size" className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <div
                id="detail-size"
                className="p-3 bg-gray-50 rounded border border-gray-300 text-sm font-mono"
              >
                {message.size} bytes
              </div>
            </div>
            <div>
              <label
                htmlFor="detail-timestamp"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Timestamp
              </label>
              <div
                id="detail-timestamp"
                className="p-3 bg-gray-50 rounded border border-gray-300 text-sm font-mono"
              >
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>

          {/* Headers */}
          {message.headers && Object.keys(message.headers).length > 0 && (
            <div>
              <label
                htmlFor="detail-headers"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Headers ({Object.keys(message.headers).length})
              </label>
              <div
                id="detail-headers"
                className="p-3 bg-gray-50 rounded border border-gray-300 space-y-2 max-h-48 overflow-auto"
              >
                {Object.entries(message.headers).map(([key, value]) => (
                  <div key={key} className="text-sm border-b border-gray-200 pb-2 last:border-b-0">
                    <span className="font-medium text-gray-700">{key}</span>
                    <span className="text-gray-500 mx-2">:</span>
                    <span className="text-gray-600 break-all">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ViewStreamDataModal({ streamName, isOpen, onClose }: ViewStreamDataModalProps) {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<StreamMessage | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const {
    data: messagesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["streamMessages", streamName, offset, limit, searchTerm],
    queryFn: () => streamsApi.getStreamMessages(streamName, offset * limit, limit, searchTerm),
    enabled: isOpen,
  });

  useEffect(() => {
    // Reset offset when modal opens
    if (isOpen) {
      setOffset(0);
    }
  }, [isOpen]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setOffset(0); // Reset pagination on search
  };

  if (!isOpen) return null;

  const messages = messagesData?.messages || [];
  const total = messagesData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = offset + 1;

  const handlePreviousPage = () => {
    if (offset > 0) {
      setOffset(offset - 1);
      setSelectedMessage(null);
    }
  };

  const handleNextPage = () => {
    if (offset + 1 < totalPages) {
      setOffset(offset + 1);
      setSelectedMessage(null);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
    setSelectedMessage(null);
  };

  const handleMessageClick = (msg: StreamMessage) => {
    setSelectedMessage(msg);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Stream Data: {streamName}</h2>
            <p className="text-sm text-gray-600">Total Messages: {total.toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <title>Close</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  id="stream-search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by subject or data..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  aria-label="Search messages"
                />
              </div>
            </div>

            {/* Limit selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="limit-select" className="text-sm font-medium text-gray-700">
                Messages per page:
              </label>
              <select
                id="limit-select"
                value={limit}
                onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Select number of messages per page"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              aria-label="Refresh messages"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </Button>
          </div>

          {/* Pagination Info */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {currentPage} of {totalPages || 1} | Showing {messages.length} of {total}{" "}
              messages
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <svg
                  className="animate-spin h-5 w-5 text-gray-500"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-gray-500">Loading messages...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading messages</h3>
                    <p className="mt-2 text-sm text-red-700">
                      {error instanceof Error ? error.message : "Failed to load messages"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-blue-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-700 font-medium">No messages found</p>
                <p className="text-gray-600 text-sm mt-1">
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "This stream has no messages yet"}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {messages.map((msg) => (
                <button
                  type="button"
                  key={msg.sequence}
                  onClick={() => handleMessageClick(msg)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleMessageClick(msg);
                    }
                  }}
                  className="w-full p-4 hover:bg-blue-50 cursor-pointer transition-colors text-left"
                  aria-label={`Message ${msg.sequence} from ${msg.subject}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          #{msg.sequence}
                        </span>
                        <span className="font-mono text-sm font-medium text-gray-900 truncate">
                          {msg.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Size: {msg.size} bytes</span>
                        <span>{formatTimestamp(msg.timestamp)}</span>
                      </div>
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 truncate font-mono">
                        {msg.data.substring(0, 100)}
                        {msg.data.length > 100 ? "..." : ""}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {total > 0 && !isLoading && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {offset * limit + 1} to {Math.min((offset + 1) * limit, total)} of {total}{" "}
              messages
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={offset === 0 || isLoading}
                aria-label="Previous page"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Previous
              </Button>
              <span className="text-sm font-medium text-gray-700 min-w-fit">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={offset + 1 >= totalPages || isLoading}
                aria-label="Next page"
              >
                Next
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      <MessageDetailModal
        message={selectedMessage}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}
