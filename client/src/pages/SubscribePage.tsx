export function SubscribePage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Subscribe to Messages</h2>
          <p className="text-gray-600">Listen to NATS subjects and view incoming messages</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Message Subscription</h3>
            <p className="text-gray-500 mb-6">
              Subscribe to subjects and monitor real-time message flow with advanced filtering options.
            </p>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Real-time message monitoring</li>
                  <li>• Subject wildcards and pattern matching</li>
                  <li>• Message filtering and search</li>
                  <li>• Queue group subscriptions</li>
                  <li>• Export message history</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}