import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../../app/stores/auth.store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      setAuth(data.user, data.workspace, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#fafafa] font-sans px-4">
      <div className="w-full max-w-sm bg-[#0c0c0e] border border-[#1f1f23] rounded-lg p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-xs text-[#a1a1aa] mt-2">Sign in to your Realm workspace</p>
        </div>

        {error && (
          <div className="bg-[#27171a] border border-[#7f1d1d] text-[#f87171] text-xs p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Email address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-[#fafafa] text-sm py-2 rounded font-medium disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <span className="text-[#a1a1aa]">Don't have an account? </span>
          <Link to="/auth/register" className="text-[#7c3aed] hover:underline font-medium">Register workspace</Link>
        </div>
      </div>
    </div>
  );
}
export { LoginPage };
