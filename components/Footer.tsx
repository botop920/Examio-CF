
import React from 'react';
import { Hexagon, Mail, Phone, Share2, Users } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-background-dark border-t border-[#f0f0f4] dark:border-white/10 px-5 md:px-10 lg:px-20 py-12 md:py-16 transition-colors duration-300">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
        
        {/* Brand Info */}
        <div className="flex flex-col gap-6 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="text-primary size-6">
               <Hexagon className="w-full h-full fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#111118] dark:text-white transition-colors">EXAMiO</span>
          </div>
          <p className="text-sm text-[#636388] dark:text-gray-400 font-medium leading-relaxed transition-colors">
            কোচিং সেন্টারের জন্য বাংলাদেশের সেরা ও আধুনিক ডিজিটাল এক্সাম ম্যানেজমেন্ট প্ল্যাটফর্ম।
          </p>
        </div>

        {/* Links - Company */}
        <div className="flex flex-col gap-5">
          {/* Removed uppercase and tracking to fix Bengali rendering */}
          <h5 className="font-bold text-base text-[#111118] dark:text-white transition-colors">কোম্পানি</h5>
          <div className="flex flex-col gap-3">
            <a className="text-sm text-[#636388] dark:text-gray-400 hover:text-primary dark:hover:text-primary font-medium transition-colors" href="#">আমাদের সম্পর্কে</a>
            <a className="text-sm text-[#636388] dark:text-gray-400 hover:text-primary dark:hover:text-primary font-medium transition-colors" href="#">ক্যারিয়ার</a>
            <a className="text-sm text-[#636388] dark:text-gray-400 hover:text-primary dark:hover:text-primary font-medium transition-colors" href="#">ব্লগ</a>
          </div>
        </div>

        {/* Links - Legal */}
        <div className="flex flex-col gap-5">
          <h5 className="font-bold text-base text-[#111118] dark:text-white transition-colors">লিগ্যাল</h5>
          <div className="flex flex-col gap-3">
            <a className="text-sm text-[#636388] dark:text-gray-400 hover:text-primary dark:hover:text-primary font-medium transition-colors" href="#">প্রাইভেসি পলিসি</a>
            <a className="text-sm text-[#636388] dark:text-gray-400 hover:text-primary dark:hover:text-primary font-medium transition-colors" href="#">টার্মস অফ সার্ভিস</a>
            <a className="text-sm text-[#636388] dark:text-gray-400 hover:text-primary dark:hover:text-primary font-medium transition-colors" href="#">কুকি পলিসি</a>
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-5">
          <h5 className="font-bold text-base text-[#111118] dark:text-white transition-colors">যোগাযোগ</h5>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#636388] dark:text-gray-400 flex items-center gap-2 font-medium transition-colors">
              <Mail size={14} className="shrink-0" /> support@examio.com
            </p>
            <p className="text-sm text-[#636388] dark:text-gray-400 flex items-center gap-2 font-medium transition-colors">
              <Phone size={14} className="shrink-0" /> +৮৮০ ১৭০০-০০০০০০
            </p>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-white transition-all">
                <Share2 size={18} />
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-white transition-all">
                <Users size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto mt-12 md:mt-16 pt-8 border-t border-[#f0f0f4] dark:border-white/10 text-center text-xs text-[#636388] dark:text-gray-500 font-medium tracking-wide transition-colors">
        © ২০২৪ EXAMiO EdTech Ltd. সর্বস্বত্ব সংরক্ষিত।
      </div>
    </footer>
  );
};
