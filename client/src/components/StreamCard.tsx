import type { Stream } from "../lib/api";
import { formatBytes, formatTimestamp } from "../lib/utils";
import { Button } from "./ui/button";

interface StreamCardProps {
  stream: Stream;
  onViewDetails: (stream: Stream) => void;
  onViewStreamData?: (streamName: string) => void;
  onDelete?: (streamName: string) => void;
}

export function StreamCard({ stream, onViewDetails, onViewStreamData, onDelete }: StreamCardProps) {
  const { config, state, created } = stream;

  const getStorageIcon = (storage: string) => {
    if (storage === "file") {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>File storage</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <title>Memory storage</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002 2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
        />
      </svg>
    );
  };

  const getRetentionBadge = (retention: string) => {
    const colors = {
      limits: "bg-blue-100 text-blue-800",
      interest: "bg-green-100 text-green-800",
      workqueue: "bg-purple-100 text-purple-800",
    };
    return colors[retention as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {config?.name || "Unknown Stream"}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRetentionBadge(config?.retention || "unknown")}`}
            >
              {config?.retention || "Unknown"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              {getStorageIcon(config?.storage || "unknown")}
              <span>{config?.storage || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <title>Created time</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{formatTimestamp(created || "")}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
            <span className="font-medium">Subjects:</span>
            <div className="flex flex-wrap gap-1">
              {config?.subjects?.slice(0, 3).map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                >
                  {subject}
                </span>
              ))}
              {(config?.subjects?.length || 0) > 3 && (
                <span className="text-xs text-gray-500">
                  +{(config?.subjects?.length || 0) - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          {onViewStreamData && config?.name && (
            <Button variant="outline" size="sm" onClick={() => onViewStreamData(config.name || "")}>
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <title>View stream data</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              View
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onViewDetails(stream)}>
            View Details
          </Button>
          {onDelete && config?.name && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(config.name || "")}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Stream Statistics */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {(state?.messages || 0)?.toLocaleString() || "N/A"}
          </div>
          <div className="text-xs text-gray-500">Messages</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{formatBytes(state?.bytes || 0)}</div>
          <div className="text-xs text-gray-500">Size</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{state?.consumer_count || 0}</div>
          <div className="text-xs text-gray-500">Consumers</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{config?.subjects?.length || 0}</div>
          <div className="text-xs text-gray-500">Subjects</div>
        </div>
      </div>
    </div>
  );
}
