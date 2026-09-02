import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        theme="light"
        closeButton
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            borderRadius: '14px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: '500',
          },
          className: 'font-sans',
        }}
      />
      <RouterProvider router={router} />
    </>
  );
}