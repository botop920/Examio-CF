
import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface CtaProps {
  onOpenModal: () => void;
}

export const Cta: React.FC<CtaProps> = ({ onOpenModal }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
        gsap.from(".cta-content", {
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top 80%",
            },
            scale: 0.95,
            opacity: 0,
            duration: 1,
            ease: "power2.out"
        });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleCall = () => {
    window.location.href = 'tel:+8801700000000';
  };

  return (
    <section ref={containerRef} className="px-5 md:px-10 lg:px-20 py-12 md:py-16 bg-white dark:bg-black">
      <div className="cta-content max-w-[1280px] mx-auto rounded-[32px] bg-primary dark:bg-primary-dark p-8 md:p-16 text-center text-white relative overflow-hidden opacity-100">
        
        <div className="relative z-10 flex flex-col items-center gap-8">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
            আজই শুরু হোক আপনার স্মার্ট যাত্রা
          </h2>
          <p className="text-base md:text-lg text-white/90 max-w-2xl font-medium">
            ১০০০+ কোচিং সেন্টার আমাদের উপর আস্থা রেখেছে। আপনিও যুক্ত হোন।
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
            <button 
              onClick={onOpenModal}
              className="bg-white text-primary rounded-full h-12 md:h-14 px-8 md:px-10 text-[15px] md:text-lg font-bold hover:bg-gray-100 active:scale-95 transition-all shadow-sm w-full sm:w-auto"
            >
              ফ্রি ডেমো বুক করুন
            </button>
            <button 
              onClick={handleCall}
              className="bg-black/20 border border-white/20 text-white rounded-full h-12 md:h-14 px-8 md:px-10 text-[15px] md:text-lg font-bold hover:bg-black/30 active:scale-95 transition-all w-full sm:w-auto"
            >
              কল করুন
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
