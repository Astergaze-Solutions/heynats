import { formatBytes } from '../lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

export function StatsCard({ title, value, subtitle, icon, trend }: StatsCardProps) {
  const trendColor = trend?.direction === 'up'
    ? 'text-green-600'
    : trend?.direction === 'down'
      ? 'text-red-600'
      : 'text-gray-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300">
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
        <p className="text-lg font-bold text-gray-900 leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center">
            <span className={`inline-flex items-center text-xs font-medium ${trendColor}`}>
              {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'} {trend.value}
            </span>
            <span className="text-xs text-gray-500 ml-2">{trend.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConnectionStatsProps {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalBytes: number;
}

export function ConnectionStats({ totalConnections, activeConnections, totalMessages, totalBytes }: ConnectionStatsProps) {
  const activePercentage = totalConnections > 0 ? ((activeConnections / totalConnections) * 100).toFixed(1) : '0';
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatsCard
        title="Total Connections"
        value={totalConnections}
        subtitle="Connection limit"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />

      <StatsCard
        title="Active Connections"
        value={activeConnections}
        subtitle={`${activePercentage}% of total`}
        icon={
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />

      <StatsCard
        title="Total Messages"
        value={totalMessages.toLocaleString()}
        subtitle="Messages processed"
        icon={
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }
      />

      <StatsCard
        title="Data Transfer"
        value={formatBytes(totalBytes)}
        subtitle="Total data processed"
        icon={
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        }
      />
    </div>
  );
}