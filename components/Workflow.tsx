
import React, { useLayoutEffect, useRef } from 'react';
import { WORKFLOW_STEPS } from '../constants';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Workflow: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineContainerRef = useRef<HTMLDivElement>(null);
  const fillLineRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
        // 1. Header Animation
        gsap.fromTo(".workflow-header", 
            { y: 50, opacity: 0 }, // Start state
            {
                y: 0, 
                opacity: 1, // End state
                duration: 0.8,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 80%", // Triggers a bit earlier
                    toggleActions: "play none none reverse" // Replays on re-entry
                }
            }
        );

        // 2. Line Filling Animation
        if (fillLineRef.current && lineContainerRef.current) {
            gsap.fromTo(fillLineRef.current, 
                { scaleY: 0 },
                {
                    scaleY: 1,
                    ease: "none",
                    scrollTrigger: {
                        trigger: lineContainerRef.current,
                        start: "top 70%", 
                        end: "bottom 80%", 
                        scrub: 0.5,
                    }
                }
            );
        }

        // 3. Step Cards & Circle Activation
        const steps = gsap.utils.toArray('.workflow-step');
        steps.forEach((step: any) => {
             // Card Entrance
             gsap.fromTo(step.querySelector('.workflow-card'), 
                { opacity: 0, x: 50 }, 
                {
                    opacity: 1, 
                    x: 0, 
                    duration: 0.6,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: step,
                        start: "top 85%",
                        toggleActions: "play none none reverse"
                    }
                }
             );

             // Circle Activation
             const circle = step.querySelector('.workflow-circle');
             const number = step.querySelector('.workflow-number');
             
             ScrollTrigger.create({
                 trigger: step,
                 start: "top 85%", // Synced with card
                 onEnter: () => {
                     gsap.to(circle, { 
                         borderColor: "#0071E3", 
                         backgroundColor: "#0071E3",
                         scale: 1.1,
                         boxShadow: "0 0 20px rgba(0, 113, 227, 0.4)",
                         duration: 0.4,
                         overwrite: true 
                     });
                     gsap.to(number, { color: "#ffffff", duration: 0.4, overwrite: true });
                 },
                 onLeaveBack: () => {
                     gsap.to(circle, { 
                         borderColor: "#333", 
                         backgroundColor: "#111",
                         scale: 1,
                         boxShadow: "none",
                         duration: 0.4,
                         overwrite: true 
                     });
                     gsap.to(number, { color: "#6b7280", duration: 0.4, overwrite: true });
                 }
             });
        });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="workflow" ref={containerRef} className="py-12 md:py-16 relative overflow-hidden bg-[#050505]">
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.2]"
           style={{
               backgroundImage: `linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)`,
               backgroundSize: '40px 40px',
               maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
               WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
           }}
      ></div>
      
      {/* Glow Effect */}
      <div className="absolute top-[20%] right-0 w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-[1000px] mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="workflow-header mb-12 max-w-2xl opacity-0 translate-y-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-white leading-tight">
                পরীক্ষা নিন <span className="text-primary">স্মার্টলি</span>,<br/> ধাপে ধাপে।
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
                জটিল প্রক্রিয়াকে আমরা করেছি সহজ। মাত্র ৫টি ধাপে আপনার প্রতিষ্ঠানের সম্পূর্ণ এক্সাম ম্যানেজমেন্ট সিস্টেম সেটআপ করুন।
            </p>
        </div>

        {/* Timeline Container */}
        <div ref={lineContainerRef} className="relative">
            {/* Base Vertical Line */}
            <div className="absolute left-[19px] md:left-[31px] top-2 bottom-10 w-[2px] bg-[#222] z-0 rounded-full"></div>
            
            {/* Animated Fill Line */}
            <div 
                ref={fillLineRef} 
                className="absolute left-[19px] md:left-[31px] top-2 bottom-10 w-[2px] bg-gradient-to-b from-primary to-blue-600 z-0 rounded-full shadow-[0_0_15px_rgba(0,113,227,0.5)] origin-top"
            ></div>

            <div className="space-y-12">
                {WORKFLOW_STEPS.map((step, index) => (
                    <div key={step.id} className="workflow-step relative pl-12 md:pl-20 group">
                        
                        {/* Timeline Node (Number) */}
                        <div className="absolute left-0 top-1.5 md:top-1 z-10">
                             <div className="workflow-circle w-10 h-10 md:w-16 md:h-16 rounded-full bg-[#111] border-2 border-[#333] flex items-center justify-center transition-all duration-500 z-10 relative">
                                 <span className="workflow-number text-gray-500 text-sm md:text-xl font-bold transition-all duration-300">
                                     {index + 1}
                                 </span>
                             </div>
                        </div>

                        {/* Content Card */}
                        <div className="workflow-card w-full sm:w-fit max-w-2xl opacity-0 translate-x-12"> 
                             <h3 className="text-xl md:text-3xl font-bold text-white mb-4 group-hover:text-primary transition-colors duration-300">
                                {step.title}
                             </h3>
                             <div className="relative p-5 md:p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 hover:border-primary/50 transition-all duration-300 shadow-xl group-hover:shadow-[0_0_30px_rgba(0,113,227,0.15)] overflow-hidden">
                                {/* Inner Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-medium relative z-10">
                                    {step.description}
                                </p>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </section>
  );
};
