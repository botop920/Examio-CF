
import React from 'react';
import { X } from 'lucide-react';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('ধন্যবাদ! আপনার অনুরোধটি গৃহীত হয়েছে। আমাদের প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-md relative z-10 p-6 md:p-8 shadow-2xl animate-[fadeIn_0.3s_ease-out] transition-colors duration-300 max-h-[85vh] overflow-y-auto overscroll-contain">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 z-20"
        >
          <X size={20} />
        </button>
        
        <div className="text-center mb-6 pt-2">
          <h3 className="text-2xl font-bold mb-2 text-[#111118] dark:text-white transition-colors">ফ্রি ডেমো বুক করুন</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors">আপনার প্রতিষ্ঠানের তথ্য দিন, আমরাই সেটআপ করে দিবো</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 transition-colors">আপনার নাম</label>
            <input 
              type="text" 
              required
              className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-background-dark text-[#111118] dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
              placeholder="নাম লিখুন"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 transition-colors">মোবাইল নাম্বার</label>
            <input 
              type="tel" 
              required
              className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-background-dark text-[#111118] dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
              placeholder="017XXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 transition-colors">প্রতিষ্ঠানের নাম</label>
            <input 
              type="text" 
              required
              className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-background-dark text-[#111118] dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
              placeholder="কোচিং বা স্কুলের নাম"
            />
          </div>
          
          <button 
            type="submit"
            className="mt-2 bg-primary text-white h-12 rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
          >
            সাবমিট করুন
          </button>
        </form>
      </div>
    </div>
  );
};
