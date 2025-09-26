import { StreamsPage } from '../pages/StreamsPage';

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