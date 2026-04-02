'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Heart, User, Lock } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
    checkIfInitialized();
  }, [status, router]);

  const checkIfInitialized = async () => {
    try {
      const res = await fetch('/api/setup');
      const data = await res.json();
      setAppInitialized(data.hasUsers);
    } catch (error) {
      console.error('Failed to check setup status:', error);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/login');
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (error) {
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (appInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <Heart className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">App Already Setup</h1>
          <p className="text-gray-600 mb-6">An account has already been created. Please login to continue.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Heart className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Welcome to Woodbury Diet App</h1>
          <p className="text-gray-600 mt-2">Create your account to get started</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Choose a username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="At least 6 characters"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
          <p className="text-sm text-emerald-800">
            <strong>Default diet settings:</strong> Low-carb paleo, ~1400 calories/day, 50g net carb limit, GPA disease considerations included.
          </p>
        </div>
      </div>
    </div>
  );
}
