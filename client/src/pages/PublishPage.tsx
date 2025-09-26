export function PublishPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Publish Messages</h2>
          <p className="text-gray-600">Send messages to NATS subjects</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Message Publishing</h3>
            <p className="text-gray-500 mb-6">
              Publish messages to any NATS subject with custom headers and payload formatting.
            </p>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Subject targeting and wildcards</li>
                  <li>• Message payload editor with JSON/text support</li>
                  <li>• Custom headers configuration</li>
                  <li>• Request-Reply pattern support</li>
                  <li>• Batch publishing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}