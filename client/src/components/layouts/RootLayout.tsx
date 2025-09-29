import { Outlet } from 'react-router-dom';
import { QueryProvider } from '../../providers/QueryProvider';
import { DevTools } from '../DevTools';
import { Toaster } from 'sonner';

export function RootLayout() {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-gray-50 overflow-hidden">
        <Outlet />
        <DevTools />
        <Toaster 
          richColors 
          position="top-right" 
          expand={true}
          visibleToasts={5}
          closeButton={true}
          toastOptions={{
            style: {
              fontSize: '14px',
            },
            className: 'whitespace-pre-line', // Allow line breaks in error messages
          }}
        />
      </div>
    </QueryProvider>
  );
}