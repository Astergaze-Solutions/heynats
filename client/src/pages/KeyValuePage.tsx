export function KeyValuePage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Key-Value Store</h2>
          <p className="text-gray-600">Manage NATS Key-Value buckets and operations</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Key-Value Management</h3>
            <p className="text-gray-500 mb-6">
              Create and manage Key-Value buckets, perform get/set/delete operations, and monitor KV store usage.
            </p>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Bucket creation and management</li>
                  <li>• Key-value operations (GET, PUT, DELETE)</li>
                  <li>• Bucket statistics and monitoring</li>
                  <li>• Key history and versioning</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}