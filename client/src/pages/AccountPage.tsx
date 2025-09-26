export function AccountPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Account Information</h2>
          <p className="text-gray-600">View account details, limits, and connection information</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Account Management</h3>
            <p className="text-gray-500 mb-6">
              Comprehensive view of your NATS account, connection limits, and usage statistics.
            </p>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Detailed account information</li>
                  <li>• Connection limits and usage</li>
                  <li>• Permission and access control</li>
                  <li>• Resource utilization metrics</li>
                  <li>• Connection history and audit logs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}