
import React, { useLayoutEffect, useRef } from 'react';
import { PROBLEMS } from '../constants';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Problems: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
        gsap.fromTo(".problem-card-content", 
            { 
              opacity: 0, 
              y: 30 
            },
            {
              opacity: 1, 
              y: 0,
              duration: 0.8,
              stagger: 0.15,
              ease: "power2.out",
              scrollTrigger: {
                  trigger: containerRef.current,
                  start: "top 80%",
              }
            }
        );
    }, containerRef);
    return () => {
        ctx.revert();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    
    // Throttle updates using requestAnimationFrame
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        rafRef.current = null;
    });
  };

  return (
    <section ref={containerRef} className="py-16 md:py-20 px-5 md:px-8 lg:px-16 bg-background-light dark:bg-background-dark relative overflow-hidden">
      {/* Background decorations - Reduced blur radius for performance */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[80px]"></div>
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[80px]"></div>
      </div>

      <div className="max-w-[1280px] mx-auto relative z-10">
        <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold text-[#1D1D1F] dark:text-white tracking-tight mb-4">
              বর্তমান চ্যালেঞ্জসমূহ
            </h2>
            <p className="text-[#86868B] text-lg md:text-xl font-medium max-w-2xl">
              প্রতিদিন যে সমস্যাগুলো আপনার প্রতিষ্ঠানের গতি কমিয়ে দিচ্ছে
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROBLEMS.map((problem, i) => (
            <div
              key={problem.id}
              ref={(el) => { if(el) cardsRef.current[i] = el }}
              onMouseMove={handleMouseMove}
              className="group relative rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-2xl transition-shadow duration-500"
            >
              {/* Spotlight Effect Layer */}
              <div 
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-30"
                style={{
                    background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(100, 100, 255, 0.1), transparent 40%)`
                }}
              />
              {/* Border Spotlight */}
              <div 
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-10"
                 style={{
                    background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(0, 113, 227, 0.4), transparent 40%)`,
                    maskImage: 'linear-gradient(#fff, #fff)',
                    WebkitMaskImage: 'linear-gradient(#fff, #fff)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    padding: '1px'
                }}
              />

              <div className="problem-card-content relative z-20 p-8 md:p-10 h-full flex flex-col">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 shadow-sm ${problem.bgClass} ${problem.colorClass}`}>
                  <problem.icon size={32} strokeWidth={2} />
                </div>

                <h3 className="text-2xl font-bold mb-4 text-[#1D1D1F] dark:text-white tracking-tight group-hover:text-primary transition-colors">
                  {problem.title}
                </h3>
                <p className="text-[16px] text-[#86868B] leading-relaxed font-medium group-hover:text-[#424245] dark:group-hover:text-gray-300 transition-colors">
                  {problem.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
