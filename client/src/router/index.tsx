import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '../components/layouts/RootLayout';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { StreamsPage } from '../pages/StreamsPage';
import { StreamDetailPage } from '../pages/StreamDetailPage';
import { KeyValuePage } from '../pages/KeyValuePage';
import { KVBucketDetailPage } from '../pages/KVBucketDetailPage';
import { PublishPage } from '../pages/PublishPage';
import { SubscribePage } from '../pages/SubscribePage';
import { AccountPage } from '../pages/AccountPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'streams',
            element: <StreamsPage />,
          },
          {
            path: 'streams/:streamName',
            element: <StreamDetailPage />,
          },
          {
            path: 'kv',
            element: <KeyValuePage />,
          },
          {
            path: 'kv/:bucketName',
            element: <KVBucketDetailPage />,
          },
          {
            path: 'publish',
            element: <PublishPage />,
          },
          {
            path: 'subscribe',
            element: <SubscribePage />,
          },
          {
            path: 'account',
            element: <AccountPage />,
          },
        ],
      },
    ],
  },
]);

export default router;