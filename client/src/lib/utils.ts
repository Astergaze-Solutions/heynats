import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDuration(duration: string): string {
  if (!duration || duration === "0s") return "Just now";
  
  // Handle different formats like "4m57s", "1h30m", etc.
  const matches = duration.match(/(\d+)([hms])/g);
  if (!matches) return duration;
  
  const parts = matches.map(match => {
    const [, value, unit] = match.match(/(\d+)([hms])/)!;
    const num = parseInt(value);
    switch (unit) {
      case 'h': return `${num}h`;
      case 'm': return `${num}m`;
      case 's': return `${num}s`;
      default: return match;
    }
  });
  
  return parts.join(' ');
}

export function formatTimestamp(timestamp: string): string {
  if (!timestamp) return 'N/A';
  
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    return timestamp;
  }
}

export function formatRTT(rtt: string): string {
  if (!rtt) return 'N/A';
  
  // Parse microseconds and convert to appropriate unit
  if (rtt.includes('µs')) {
    const microseconds = parseFloat(rtt.replace('µs', ''));
    if (microseconds < 1000) return `${microseconds}µs`;
    const milliseconds = microseconds / 1000;
    if (milliseconds < 1000) return `${milliseconds.toFixed(1)}ms`;
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
  
  return rtt;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'connected':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'disconnected':
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'connecting':
    case 'reconnecting':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
