'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }
      if (!authData.user) {
        setError('No user data returned');
        return;
      }

      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
        setError('Error checking user profile');
        return;
      }

      if (!profile) {
        // No profile found - direct them to signup or create it automatically
        setError('Please sign up first to create an account');
        router.push('/signup');
        return;
      }

      // If profile exists, proceed to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-teal-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back</h1>
          <p className="text-gray-600 mt-1">Please enter your details to sign in</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-rose-500 focus:ring-rose-500"
              />
              <span className="ml-2 text-sm text-gray-600">Remember for 30 days</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-purple-600 hover:text-purple-500">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-teal-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-purple-600 hover:text-purple-500 font-medium">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
