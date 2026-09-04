import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        theme="light"
        closeButton
        richColors
        duration={2800}
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
            padding: '12px 16px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
          },
          className: 'font-sans',
        }}
      />
      <RouterProvider router={router} />
    </>
  );
}