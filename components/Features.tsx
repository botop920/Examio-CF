
import React, { useLayoutEffect, useRef } from 'react';
import { FEATURES } from '../constants';
import { ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Features: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
      const ctx = gsap.context(() => {
          gsap.fromTo(".feature-card", 
            { 
              opacity: 0, 
              y: 50 
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              stagger: 0.1,
              ease: "power2.out",
              scrollTrigger: {
                  trigger: containerRef.current,
                  start: "top 90%",
              }
            }
          );
      }, containerRef);
      return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={containerRef} className="py-16 md:py-20 px-5 md:px-10 lg:px-20 bg-white dark:bg-black">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-[#1D1D1F] dark:text-white tracking-tight mb-4">
              স্মার্ট ফিচারস
            </h2>
            <p className="text-lg text-[#86868B] font-medium">
              আধুনিক সব টুলস, যা আপনার প্রতিষ্ঠানকে এগিয়ে রাখবে।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.id}
              className={`feature-card group relative p-8 md:p-10 rounded-[32px] bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-transparent hover:border-black/5 dark:hover:border-white/10 transition-all duration-500 overflow-hidden hover:bg-[#EAEAEA] dark:hover:bg-[#2C2C2E]
              ${index === 0 || index === 3 ? 'md:col-span-2' : ''}`}
            >
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black/40 flex items-center justify-center text-[#1D1D1F] dark:text-white shadow-sm group-hover:scale-110 transition-transform duration-500 group-hover:shadow-md">
                      <feature.icon size={28} strokeWidth={1.5} />
                    </div>
                    
                    <div className="w-10 h-10 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                        <ArrowUpRight size={20} className="text-primary dark:text-white" />
                    </div>
                </div>
                
                <div className="mt-auto">
                    <h3 className="text-2xl font-bold mb-3 text-[#1D1D1F] dark:text-white tracking-tight group-hover:translate-x-1 transition-transform duration-500">
                      {feature.title}
                    </h3>
                    <p className="text-[#86868B] font-medium leading-relaxed text-[16px] group-hover:text-[#1D1D1F] dark:group-hover:text-gray-300 transition-colors duration-500">
                      {feature.description}
                    </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
