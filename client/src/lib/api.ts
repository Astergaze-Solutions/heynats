// API client functions for NATS operations
export interface ConnectionCredentials {
  host: string;
  port: string;
  username: string;
  password: string;
}

export interface ConnectionStatus {
  connected: boolean;
  host?: string;
  port?: string;
  username?: string;
}

export interface NATSInfo {
  server_info: {
    server_id: string;
    server_name: string;
    connected_url: string;
    last_error: string | null;
  };
  stats: {
    in_msgs: number;
    out_msgs: number;
    in_bytes: number;
    out_bytes: number;
    reconnects: number;
  };
  is_connected: boolean;
  connected_url: string;
}

export interface Connection {
  cid: number;
  idle: string;
  in_bytes: number;
  in_msgs: number;
  ip: string;
  kind: string;
  lang: string;
  last_activity: string;
  name: string;
  out_bytes: number;
  out_msgs: number;
  pending_bytes: number;
  port: number;
  rtt: string;
  start: string;
  subscriptions: number;
  type: string;
  uptime: string;
  version: string;
}

export interface AccountInformation {
  account: string;
  client_id: number;
  client_ip: string;
  connected_addr: string;
  connected_url: string;
  expires: string;
  header_supported: boolean;
  local_ip: string;
  max_payload: string;
  permissions: any;
  rtt: string;
  server_id: string;
  server_name: string;
  server_version: string;
  user: string;
}

export interface ConnectionLimits {
  connections: Connection[];
  limit: number;
  now: string;
  num_connections: number;
  offset: number;
  server_id: string;
  total: number;
}

export interface AccountInfo {
  account_information: AccountInformation;
  connection_limits: ConnectionLimits;
  stats: ConnectionLimits; // Same structure as connection_limits
}

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || 'An error occurred',
      response.status,
      data.details
    );
  }

  return data;
}

// NATS API functions
export const natsApi = {
  // Check connection status
  getStatus: (): Promise<ConnectionStatus> =>
    apiRequest('/nats/status'),

  // Connect to NATS server
  connect: (credentials: ConnectionCredentials): Promise<{ message: string; connected: boolean }> =>
    apiRequest('/nats/connect', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  // Disconnect from NATS server
  disconnect: (): Promise<{ message: string; connected: boolean }> =>
    apiRequest('/nats/disconnect', {
      method: 'POST',
    }),

  // Get NATS server info
  getInfo: (): Promise<NATSInfo> =>
    apiRequest('/nats/info'),

  // Get account information
  getAccountInfo: (): Promise<AccountInfo> =>
    apiRequest('/nats/account'),
};

// Health check API
export const healthApi = {
  getHealth: (): Promise<{ status: string; server: string }> =>
    apiRequest('/health'),
};

export { ApiError };