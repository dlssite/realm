import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { useAuthStore } from './app/stores/auth.store';

export function App() {
  const rehydrateAuth = useAuthStore((s) => s.rehydrateAuth);
  const token = useAuthStore((s) => s.token);

  // true while we are still checking the stored token
  const [booting, setBooting] = useState(!!token);

  useEffect(() => {
    if (!token) return;
    rehydrateAuth().finally(() => setBooting(false));
  }, []); // run once on mount

  // Show nothing (or a minimal spinner) while rehydrating so the router
  // doesn't flash the login page before we know the session is valid.
  if (booting) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="w-5 h-5 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
