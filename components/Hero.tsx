
import React, { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { HERO_IMAGE_URL, HERO_IMAGE_DARK_URL } from '../constants';
import gsap from 'gsap';

interface HeroProps {
  onOpenModal: () => void;
  theme: string;
}

export const Hero: React.FC<HeroProps> = ({ onOpenModal, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blurAmount, setBlurAmount] = React.useState(0);

  const scrollToWorkflow = () => {
    document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 1000) {
        setBlurAmount(Math.min(scrollY / 50, 8)); // Max 8px blur
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Animation Context
    const ctx = gsap.context(() => {
        // 1. Initial Entry Animation
        gsap.fromTo('.hero-animate', 
            { opacity: 0, y: 40 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 1, 
                stagger: 0.15, 
                ease: "power3.out",
                delay: 0.2
            }
        );

        // 2. Text Loop Animation
        const phrases = [
            "খাতা দেখুন <span class='text-primary'>Ai</span> দিয়ে",
            "ফলাফল দিন মুহূর্তে",
            "প্রশ্ন তৈরি করুন <span class='text-primary'>Ai</span> দিয়ে"
        ];

        const textElement = document.querySelector(".dynamic-text");
        
        if (textElement) {
            const tl = gsap.timeline({ repeat: -1 });
            
            phrases.forEach((phrase) => {
                tl.to(textElement, {
                    y: -20, // Slide Up Out
                    opacity: 0,
                    duration: 0.5,
                    ease: "power2.in",
                    delay: 2.0 
                })
                .call(() => {
                    textElement.innerHTML = phrase;
                })
                .set(textElement, { y: 20 }) // Prepare at bottom
                .to(textElement, {
                    y: 0, // Slide Up In
                    opacity: 1,
                    duration: 0.8,
                    ease: "power2.out"
                });
            });
        }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={containerRef}
      className="relative w-full flex items-center pt-24 pb-12 md:py-20 overflow-hidden 
      min-h-[80vh] md:min-h-[85vh]"
    >
      {/* Background Container */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {/* Light Mode Layer */}
          <div 
            className={`absolute inset-0 bg-no-repeat bg-cover bg-[25%_center] md:bg-center transition-opacity duration-700 ease-in-out will-change-transform
            ${theme === 'dark' ? 'opacity-0' : 'opacity-100'}`}
            style={{ 
              backgroundImage: `url(${HERO_IMAGE_URL})`,
              filter: `blur(${blurAmount}px)`,
              transform: `scale(${1 + blurAmount/200})`
            }}
          />

          {/* Dark Mode Layer */}
          <div 
            className={`absolute inset-0 bg-no-repeat bg-cover bg-[25%_center] md:bg-center transition-opacity duration-700 ease-in-out will-change-transform
            ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
              backgroundImage: `url(${HERO_IMAGE_DARK_URL})`,
              filter: `blur(${blurAmount}px)`,
              transform: `scale(${1 + blurAmount/200})`
            }}
          />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background-light/95 via-background-light/60 to-transparent dark:from-background-dark/95 dark:via-background-dark/60 pointer-events-none transition-colors duration-500 z-10"></div>

      {/* Content Container */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-16 w-full relative z-20 h-full flex flex-col justify-center">
        <div className="max-w-full md:max-w-3xl flex flex-col items-start text-left gap-6 md:gap-8">
           
           <div className="hero-animate inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10 backdrop-blur-md mb-2 shadow-sm cursor-default hover:scale-105 transition-transform opacity-0">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[11px] uppercase tracking-wide font-bold text-primary">নতুন আপডেট</span>
              <span className="w-px h-3 bg-black/10 dark:bg-white/20"></span>
              <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-white">AI গ্রেডিং এখন ১০x ফাস্ট</span>
           </div>

           {/* Reduced text size for PC */}
           <h1 className="hero-animate text-4xl sm:text-5xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[#1D1D1F] dark:text-white leading-[1.15] md:leading-[1.1] transition-colors duration-300 opacity-0">
            পরীক্ষা নিন <span className="text-primary relative inline-block">স্মার্টলি</span>, <br /> 
            <span className="block h-[1.2em] overflow-hidden">
                <span className="dynamic-text block bg-clip-text text-transparent bg-gradient-to-r from-[#1D1D1F] to-[#424245] dark:from-white dark:to-gray-300 pb-2">
                    প্রশ্ন তৈরি করুন <span className='text-primary'>Ai</span> দিয়ে
                </span>
            </span>
          </h1>
          
          <p className="hero-animate text-lg md:text-xl leading-relaxed text-[#424245] dark:text-gray-300 font-medium max-w-lg transition-colors duration-300 opacity-0">
            কোচিং সেন্টারের জন্য তৈরি বাংলাদেশের #১ এক্সাম ম্যানেজমেন্ট প্ল্যাটফর্ম। MCQ থেকে লিখিত পরীক্ষা - সব এখন এক অ্যাপে।
          </p>

          <div className="hero-animate flex flex-col sm:flex-row gap-4 sm:gap-5 w-full sm:w-auto mt-4 opacity-0">
            <button 
              onClick={onOpenModal}
              className="bg-[#1D1D1F] dark:bg-white text-white dark:text-black rounded-full h-12 md:h-14 px-8 md:px-10 text-[15px] md:text-[16px] font-semibold hover:bg-black dark:hover:bg-gray-200 active:scale-95 transition-all w-full sm:w-auto shadow-xl shadow-black/10 dark:shadow-white/5"
            >
              বিনামূল্যে শুরু করুন
            </button>
            <button 
              onClick={scrollToWorkflow}
              className="group bg-white/80 md:bg-white dark:bg-white/10 text-[#1D1D1F] dark:text-white rounded-full h-12 md:h-14 px-8 md:px-10 text-[15px] md:text-[16px] font-semibold border border-[#E5E5EA] dark:border-white/10 hover:border-[#D1D1D6] dark:hover:border-white/30 active:scale-95 transition-all w-full sm:w-auto flex items-center justify-center gap-2 shadow-sm backdrop-blur-sm"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-white/20 flex items-center justify-center text-primary dark:text-white group-hover:bg-primary group-hover:text-white transition-colors">
                <Play size={10} fill="currentColor" />
              </div>
              কিভাবে কাজ করে
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
