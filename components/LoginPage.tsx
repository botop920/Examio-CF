
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Hexagon, ArrowRight, Loader2, AlertCircle, Lock } from 'lucide-react';
import { HERO_IMAGE_URL } from '../constants';

interface LoginPageProps {
  onBack: () => void;
  theme: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack, theme }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      let msg = err.message;
      if (msg === 'Invalid login credentials') {
        msg = 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে।';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-black">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-[10s] hover:scale-105"
          style={{ backgroundImage: `url(${HERO_IMAGE_URL})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        
        <div className="relative z-10 p-16 flex flex-col justify-between h-full text-white">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
             <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/10">
                <Hexagon className="text-white fill-white" size={24} strokeWidth={0} />
             </div>
             <span className="font-bold text-xl tracking-tight">EXAMiO</span>
          </div>

          <div className="max-w-lg">
            <h2 className="text-4xl font-bold leading-tight mb-6">
              ডিজিটাল শিক্ষা ব্যবস্থাপনার <br/> নতুন দিগন্ত
            </h2>
            <p className="text-gray-300 text-lg">
              secure, scalable, and smart exam management system.
            </p>
          </div>

          <p className="text-sm text-gray-400">© ২০২৪ EXAMiO Inc.</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 lg:hidden text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          ← ফিরে যান
        </button>

        <div className="w-full max-w-[400px]">
          <div className="mb-8 text-center lg:text-left">
            <div className="inline-block lg:hidden mb-6 p-3 bg-primary/10 rounded-2xl">
              <Hexagon className="text-primary fill-current" size={32} strokeWidth={0} />
            </div>
            <h1 className="text-3xl font-bold text-[#1D1D1F] dark:text-white mb-2 tracking-tight">
              স্বাগতম
            </h1>
            <p className="text-[#86868B] dark:text-gray-400">
              আপনার ড্যাশবোর্ড এক্সেস করতে লগইন করুন
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#1D1D1F] dark:text-gray-300 ml-1">ইমেইল এড্রেস</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-white/5 text-[#1D1D1F] dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                 <label className="text-[13px] font-semibold text-[#1D1D1F] dark:text-gray-300">পাসওয়ার্ড</label>
                 <a href="#" className="text-[12px] font-medium text-primary hover:underline">পাসওয়ার্ড ভুলে গেছেন?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-white/5 text-[#1D1D1F] dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-primary text-white h-12 rounded-xl font-bold text-[15px] shadow-lg shadow-primary/20 hover:bg-primary-dark hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  লগইন করুন
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Lock size={12} />
                <span>Account creation is restricted to Admin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
