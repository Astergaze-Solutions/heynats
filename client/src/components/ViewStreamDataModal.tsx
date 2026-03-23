import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { streamsApi } from "../lib/api";
import type { StreamMessage } from "../lib/api";
import { Button } from "./ui/button";
import { formatTimestamp } from "../lib/utils";

interface ViewStreamDataModalProps {
  streamName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewStreamDataModal({ streamName, isOpen, onClose }: ViewStreamDataModalProps) {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<StreamMessage | null>(null);

  const {
    data: messagesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["streamMessages", streamName, offset, limit, searchTerm],
    queryFn: () => streamsApi.getStreamMessages(streamName, offset, limit, searchTerm),
    enabled: isOpen,
  });

  useEffect(() => {
    setOffset(0);
  }, []);

  if (!isOpen) return null;

  const messages = messagesData?.messages || [];
  const total = messagesData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  // Server-side search is now handled, no client-side filtering needed
  const displayMessages = messages;

  const handlePreviousPage = () => {
    if (offset > 0) {
      setOffset(offset - 1);
    }
  };

  const handleNextPage = () => {
    if ((offset + 1) * limit < total) {
      setOffset(offset + 1);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
              Page {currentPage} of {totalPages || 1} | Showing {displayMessages.length} of {total}{" "}
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
          ) : displayMessages.length === 0 ? (
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
              {displayMessages.map((msg) => (
                <button
                  type="button"
                  key={msg.sequence}
                  onClick={() => setSelectedMessage(msg)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedMessage(msg);
                    }
                  }}
                  className="w-full p-4 hover:bg-gray-50 cursor-pointer transition-colors text-left"
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
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} messages
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || isLoading}
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
                disabled={currentPage >= totalPages || isLoading}
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

        {/* Message Detail Panel */}
        {selectedMessage && (
          <div className="border-t border-gray-200 bg-gray-50 p-4 max-h-48 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Message Details</h3>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close message details"
              >
                <svg
                  className="w-5 h-5"
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
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="detail-subject"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Subject
                </label>
                <div
                  id="detail-subject"
                  className="p-2 bg-white rounded border border-gray-300 font-mono text-sm break-all"
                >
                  {selectedMessage.subject}
                </div>
              </div>
              <div>
                <label
                  htmlFor="detail-data"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Data
                </label>
                <div
                  id="detail-data"
                  className="p-2 bg-white rounded border border-gray-300 font-mono text-sm break-all max-h-24 overflow-auto"
                >
                  {selectedMessage.data}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="detail-sequence"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Sequence
                  </label>
                  <div
                    id="detail-sequence"
                    className="p-2 bg-white rounded border border-gray-300 text-sm"
                  >
                    {selectedMessage.sequence}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="detail-timestamp"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Timestamp
                  </label>
                  <div
                    id="detail-timestamp"
                    className="p-2 bg-white rounded border border-gray-300 text-sm"
                  >
                    {formatTimestamp(selectedMessage.timestamp)}
                  </div>
                </div>
              </div>
              {selectedMessage.headers && Object.keys(selectedMessage.headers).length > 0 && (
                <div>
                  <label
                    htmlFor="detail-headers"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Headers
                  </label>
                  <div
                    id="detail-headers"
                    className="p-2 bg-white rounded border border-gray-300 text-sm space-y-1 max-h-20 overflow-auto"
                  >
                    {Object.entries(selectedMessage.headers).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
