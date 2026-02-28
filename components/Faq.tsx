
import React, { useState, useLayoutEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQS } from '../constants';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Faq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
        // Using fromTo ensures the end state (opacity: 1) is always reached
        gsap.fromTo(".faq-item", 
            { 
              y: 30,
              opacity: 0,
            },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: "power2.out",
              scrollTrigger: {
                  trigger: containerRef.current,
                  start: "top 85%", // Trigger earlier
              }
            }
        );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" ref={containerRef} className="px-5 md:px-10 lg:px-20 py-12 md:py-16 bg-white dark:bg-background-dark transition-colors duration-300">
      <div className="max-w-[800px] mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-10 text-[#111118] dark:text-white transition-colors">সাধারণ জিজ্ঞাসা (FAQ)</h2>
        <div className="flex flex-col gap-4 md:gap-5">
          {FAQS.map((faq, index) => (
            <div
              key={faq.id}
              className="faq-item p-5 md:p-6 rounded-lg border border-[#dcdce5] dark:border-white/10 bg-white dark:bg-surface-dark cursor-pointer transition-all hover:border-primary/30 dark:hover:border-primary/30"
              onClick={() => toggleFaq(index)}
            >
              <h4 className="font-bold flex justify-between items-start md:items-center text-base md:text-lg select-none gap-4 text-[#111118] dark:text-white transition-colors">
                {faq.question}
                <ChevronDown 
                    className={`transition-transform duration-300 shrink-0 ${openIndex === index ? 'rotate-180' : ''}`} 
                    size={20}
                />
              </h4>
              <div 
                className={`grid transition-all duration-300 ease-in-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="overflow-hidden">
                    <p className="text-sm md:text-base text-[#636388] dark:text-gray-400 leading-relaxed font-medium transition-colors">
                        {faq.answer}
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
