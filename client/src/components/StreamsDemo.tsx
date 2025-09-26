import { StreamsPage } from '../pages/StreamsPage';
import { Stream } from '../lib/api';

// Mock data for demonstration
const mockStreams: Stream[] = [
  {
    config: {
      name: "hello_stream",
      subjects: ["hello.world"],
      retention: "limits",
      max_consumers: -1,
      max_msgs: -1,
      max_bytes: -1,
      discard: "old",
      max_age: 0,
      max_msgs_per_subject: -1,
      max_msg_size: -1,
      storage: "file",
      num_replicas: 1,
      duplicate_window: 120000000000,
      compression: "none",
      allow_direct: true,
      mirror_direct: false,
      consumer_limits: {},
      metadata: {
        "_nats.req.level": "0"
      },
      allow_msg_ttl: false
    },
    created: "2025-09-26T11:22:59.69819726Z",
    state: {
      messages: 1234,
      bytes: 524288,
      first_seq: 1,
      first_ts: "2025-09-26T11:23:00Z",
      last_seq: 1234,
      last_ts: "2025-09-26T12:45:30Z",
      consumer_count: 3,
      deleted: null,
      num_deleted: 0,
      num_subjects: 1,
      subjects: null
    }
  },
  {
    config: {
      name: "orders_stream",
      subjects: ["orders.*", "orders.created", "orders.updated", "orders.deleted"],
      retention: "interest",
      max_consumers: 10,
      max_msgs: 100000,
      max_bytes: 104857600, // 100MB
      discard: "old",
      max_age: 86400000000000, // 24 hours in nanoseconds
      max_msgs_per_subject: 10000,
      max_msg_size: 1048576, // 1MB
      storage: "file",
      num_replicas: 3,
      duplicate_window: 300000000000, // 5 minutes
      compression: "s2",
      allow_direct: false,
      mirror_direct: false,
      consumer_limits: {},
      metadata: {},
      allow_msg_ttl: true
    },
    created: "2025-09-26T10:15:30.123456Z",
    state: {
      messages: 45678,
      bytes: 23456789,
      first_seq: 1,
      first_ts: "2025-09-26T10:16:00Z",
      last_seq: 45678,
      last_ts: "2025-09-26T13:22:15Z",
      consumer_count: 7,
      deleted: null,
      num_deleted: 23,
      num_subjects: 4,
      subjects: {
        "orders.created": 15234,
        "orders.updated": 20123,
        "orders.deleted": 8321,
        "orders.shipped": 2000
      }
    }
  },
  {
    config: {
      name: "metrics_stream",
      subjects: ["metrics.cpu", "metrics.memory", "metrics.disk", "metrics.network"],
      retention: "workqueue",
      max_consumers: 5,
      max_msgs: 1000000,
      max_bytes: -1,
      discard: "new",
      max_age: 3600000000000, // 1 hour
      max_msgs_per_subject: -1,
      max_msg_size: 4096,
      storage: "memory",
      num_replicas: 1,
      duplicate_window: 60000000000, // 1 minute
      compression: "none",
      allow_direct: true,
      mirror_direct: false,
      consumer_limits: {},
      metadata: {
        "department": "infrastructure",
        "team": "platform"
      },
      allow_msg_ttl: false
    },
    created: "2025-09-26T09:30:45.987654Z",
    state: {
      messages: 892340,
      bytes: 89234000,
      first_seq: 892341,
      first_ts: "2025-09-26T12:30:45Z",
      last_seq: 1784680,
      last_ts: "2025-09-26T13:30:44Z",
      consumer_count: 2,
      deleted: null,
      num_deleted: 0,
      num_subjects: 4,
      subjects: null
    }
  }
];

export function StreamsDemo() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">NATS Streams Demo</h1>
          <p className="text-blue-100">This is a demonstration of the Streams interface with mock data</p>
        </div>
      </div>
      
      {/* Mock the QueryProvider wrapper */}
      <div className="mock-query-provider">
        <StreamsPage />
      </div>
    </div>
  );
}

// You can replace the StreamsPage import and mock the API calls
// For a working demo, you would need to modify the StreamsPage to accept props
// or create a separate demo version