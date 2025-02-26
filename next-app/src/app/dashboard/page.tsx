'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    };
    checkUser();
  }, []);

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 to-teal-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-500 to-teal-500 text-transparent bg-clip-text mb-8">
          Welcome to Your Wedding Planning Dashboard
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Coming soon: Dashboard features */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Getting Started</h2>
            <p className="text-gray-600">
              Your personalized wedding planning journey begins here. Stay tuned for exciting features!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
