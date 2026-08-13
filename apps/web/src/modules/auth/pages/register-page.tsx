import { API_BASE } from '@/lib/api';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../../app/stores/auth.store';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, workspaceName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
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
          <img src="/logo.png" alt="Realm" className="w-12 h-12 mx-auto mb-4 rounded-xl" />
          <h2 className="text-2xl font-bold tracking-tight">Create Workspace</h2>
          <p className="text-xs text-[#a1a1aa] mt-2">Initialize your modular workspace OS</p>
        </div>

        {error && (
          <div className="bg-[#27171a] border border-[#7f1d1d] text-[#f87171] text-xs p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Your Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
              placeholder="Alex Johnson"
            />
          </div>

          <div>
            <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Email address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
              placeholder="alex@company.com"
            />
          </div>

          <div>
            <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Workspace Name</label>
            <input 
              type="text" 
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
              placeholder="Acme Corp"
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
              placeholder="Min. 8 characters"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-[#fafafa] text-sm py-2 rounded font-medium disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Bootstrapping...' : 'Create Workspace'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <span className="text-[#a1a1aa]">Already have an account? </span>
          <Link to="/auth/login" className="text-[#7c3aed] hover:underline font-medium">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
export { RegisterPage };
