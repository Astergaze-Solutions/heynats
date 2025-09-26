export function StreamsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Streams</h2>
          <p className="text-gray-600">Manage JetStream streams and consumers</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Stream Management</h3>
            <p className="text-gray-500 mb-6">
              Create, configure, and monitor JetStream streams. View stream information, manage consumers, and monitor message flow.
            </p>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Stream creation and configuration</li>
                  <li>• Consumer management</li>
                  <li>• Message replay and monitoring</li>
                  <li>• Stream statistics and metrics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}