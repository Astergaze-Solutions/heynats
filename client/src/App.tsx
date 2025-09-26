import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";

interface User {
  id: number;
  name: string;
  email: string;
}

interface ApiResponse {
  message: string;
  time: string;
}

interface UsersResponse {
  users: User[];
  count: number;
}

function App() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchApiData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/');
      const data: ApiResponse = await response.json();
      setApiData(data);
    } catch (error) {
      console.error('Error fetching API data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data: UsersResponse = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl text-green-500 mb-4 font-bold">
          React + Gin Server
        </h1>
        <p className="text-gray-600 mb-6">
          ShadeCN initialized with React 19 and TailwindCSS 4
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* API Status Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-xl font-semibold mb-4">API Status</h2>
          {apiData ? (
            <div className="space-y-2">
              <p><strong>Message:</strong> {apiData.message}</p>
              <p><strong>Time:</strong> {apiData.time}</p>
            </div>
          ) : (
            <p className="text-gray-500">Loading...</p>
          )}
          <Button 
            onClick={fetchApiData} 
            className="mt-4"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh API Data'}
          </Button>
        </div>

        {/* Users Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          {users.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {users.map(user => (
                <div key={user.id} className="p-2 bg-gray-50 rounded">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No users loaded</p>
          )}
          <Button 
            onClick={fetchUsers} 
            className="mt-4"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load Users'}
          </Button>
        </div>
      </div>

      <div className="text-center mt-8">
        <Button 
          onClick={() => window.open('/api/health', '_blank')}
          variant="outline"
        >
          Check Health Endpoint
        </Button>
      </div>
    </div>
  );
}

export default App;
