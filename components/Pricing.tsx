
import React from 'react';
import { Check, Sparkles } from 'lucide-react';

interface PricingProps {
  onOpenModal: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onOpenModal }) => {
  return (
    <section id="pricing" className="py-20 md:py-28 px-5 md:px-10 lg:px-20 bg-[#F5F5F7] dark:bg-black overflow-hidden relative">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-blue-400/5 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-[#1D1D1F] dark:text-white tracking-tight">
              প্রাইসিং <span className="text-primary">প্ল্যান</span>
            </h2>
            <p className="text-lg text-[#86868B] max-w-2xl mx-auto font-medium">
              আপনার প্রতিষ্ঠানের জন্য সেরা সল্যুশন
            </p>
        </div>

        <div className="flex justify-center items-center">
            <div className="relative p-8 md:p-10 rounded-[32px] flex flex-col transition-all duration-300 bg-white dark:bg-[#1C1C1E] shadow-2xl shadow-blue-900/10 border-2 border-primary max-w-md w-full hover:scale-105">
              
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles size={10} fill="currentColor" /> FREE TRIAL
              </div>

              <div className="mb-8 text-center mt-2">
                  <h3 className="text-3xl font-bold mb-3 text-[#1D1D1F] dark:text-white">
                    Get a trial account
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    Experience the full power of our platform
                  </p>
              </div>

              <div className="flex flex-col gap-4 mb-10">
                  {[
                    'AI কোয়েশ্চেন জেনারেটর', 
                    'অ্যাডভান্সড অ্যানালিটিক্স ড্যাশবোর্ড',
                    'আনলিমিটেড স্টুডেন্ট এক্সাম'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Check size={14} strokeWidth={3} />
                        </div>
                        <span className="text-base font-semibold text-[#1D1D1F] dark:text-gray-200">
                            {feature}
                        </span>
                    </div>
                  ))}
              </div>

              <button
                onClick={onOpenModal}
                className="w-full h-14 rounded-xl font-bold text-base bg-primary text-white hover:bg-blue-600 shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Start Free Trial <Sparkles size={18} />
              </button>
            </div>
        </div>
      </div>
    </section>
  );
};
