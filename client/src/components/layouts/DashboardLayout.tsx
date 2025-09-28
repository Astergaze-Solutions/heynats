import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Button } from '../ui/button';
import { useConnectionStatus, useAccountInfo, useDisconnectFromNATS } from '../../hooks/useNATS';

export function DashboardLayout() {
  const navigate = useNavigate();
  const { data: status } = useConnectionStatus();
  const { data: accountInfo } = useAccountInfo(status?.connected);
  const disconnectMutation = useDisconnectFromNATS();

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Disconnect failed:', error);
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col mx-5 py-3">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 p-4 py-3 mx-3">
            <div className="flex justify-between items-center">
              <div className="">
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {accountInfo?.account_information ? (
                    <>
                      Connected as{' '}
                      <span className="font-medium">{accountInfo.account_information.user}</span>{' '}
                      • Account: {accountInfo.account_information.account}
                    </>
                  ) : (
                    'Managing NATS server connections and monitoring'
                  )}
                </p>
              </div>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                disabled={disconnectMutation.isPending}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}