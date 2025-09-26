import { Outlet } from 'react-router-dom';
import { QueryProvider } from '../../providers/QueryProvider';
import { DevTools } from '../DevTools';

export function RootLayout() {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-gray-50">
        <Outlet />
        <DevTools />
      </div>
    </QueryProvider>
  );
}