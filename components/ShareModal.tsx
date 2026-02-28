
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, ExternalLink, Download, Image as ImageIcon, Code, Trophy, Link as LinkIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface ShareModalProps {
  exam: any;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ exam, onClose }) => {
  const [activeTab, setActiveTab] = useState<'link' | 'leaderboard'>('link');
  const [showResultsInstant, setShowResultsInstant] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize state from exam prop
  useEffect(() => {
      if (exam) {
          // Default to true if the column doesn't exist or is null
          setShowResultsInstant(exam.show_results_instant !== false);
      }
  }, [exam]);

  if (!exam) return null;

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/?exam_id=${exam.id}`;
  const leaderboardUrl = `${baseUrl}/?exam_id=${exam.id}&leaderboard=true`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('কপি করা হয়েছে!', { icon: '📋' });
  };

  const toggleResultVisibility = async () => {
      setIsUpdating(true);
      const newValue = !showResultsInstant;
      
      try {
          const { error } = await supabase
            .from('exams')
            .update({ show_results_instant: newValue })
            .eq('id', exam.id);

          if (error) throw error;
          
          setShowResultsInstant(newValue);
          toast.success(newValue ? 'রেজাল্ট এখন সাথে সাথে দেখা যাবে' : 'রেজাল্ট এখন হাইড করা হয়েছে');
      } catch (error) {
          console.error(error);
          toast.error('আপডেট করতে সমস্যা হয়েছে');
      } finally {
          setIsUpdating(false);
      }
  };

  const getQRCodeBlob = (callback: (blob: Blob | null) => void) => {
    const svg = document.getElementById("exam-qr-code");
    if (!svg) return;
    
    const serializer = new XMLSerializer();
    let svgData = serializer.serializeToString(svg);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const size = 500; 

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
      }
      canvas.toBlob(callback, 'image/png');
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const downloadQRCode = () => {
      toast.loading('প্রসেসিং...', { id: 'qr-dl' });
      getQRCodeBlob((blob) => {
          toast.dismiss('qr-dl');
          if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `exam-qr-${exam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              toast.success('QR কোড সেভ করা হয়েছে');
          } else {
              toast.error('সমস্যা হয়েছে');
          }
      });
  };

  const copyQRCodeImage = () => {
      toast.loading('কপি হচ্ছে...', { id: 'qr-cp' });
      getQRCodeBlob((blob) => {
          toast.dismiss('qr-cp');
          if (blob) {
              try {
                  navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                  toast.success('QR ইমেজ কপি হয়েছে');
              } catch (err) {
                  console.error(err);
                  toast.error('ব্রাউজার পারমিশন সমস্যা');
              }
          } else {
              toast.error('সমস্যা হয়েছে');
          }
      });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-[32px] p-6 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto overscroll-contain">
         <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors dark:text-white z-20">
            <X size={20} />
         </button>

         <div className="text-center mb-6 pt-2">
             <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-3">
                 <Share2 size={28} />
             </div>
             <h3 className="text-xl font-bold text-[#1D1D1F] dark:text-white">শেয়ার এক্সাম</h3>
             <p className="text-gray-500 text-sm mt-1 line-clamp-1 px-4">{exam.title}</p>
         </div>

         {/* Tabs */}
         <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl mb-6 sticky top-0 z-10">
            <button 
                onClick={() => setActiveTab('link')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'link' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
            >
                <LinkIcon size={14} /> Link
            </button>
            <button 
                onClick={() => setActiveTab('leaderboard')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
            >
                <Trophy size={14} /> Leaderboard
            </button>
         </div>

         {/* CONTENT: LINK */}
         {activeTab === 'link' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 
                 {/* Result Visibility Toggle */}
                 <div className="mb-6 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-full ${showResultsInstant ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                             {showResultsInstant ? <Eye size={18} /> : <EyeOff size={18} />}
                         </div>
                         <div>
                             <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">Show Result</p>
                             <p className="text-[10px] text-gray-500">Student can see marks after submit</p>
                         </div>
                     </div>
                     <button 
                        onClick={toggleResultVisibility}
                        disabled={isUpdating}
                        className={`w-12 h-7 rounded-full p-1 transition-colors relative ${showResultsInstant ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                     >
                         <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${showResultsInstant ? 'translate-x-5' : 'translate-x-0'}`}>
                             {isUpdating && <Loader2 className="w-full h-full p-1 animate-spin text-primary" />}
                         </div>
                     </button>
                 </div>

                 <div className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-inner border border-gray-100 mb-6">
                     <QRCodeSVG 
                        id="exam-qr-code" 
                        value={shareUrl} 
                        size={160} 
                        level={"H"}
                        includeMargin={true}
                     />
                     
                     <div className="flex items-center gap-3 mt-4 w-full justify-center">
                         <button 
                            onClick={copyQRCodeImage} 
                            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-xl transition-colors border border-gray-200"
                         >
                            <ImageIcon size={14} /> Copy Img
                         </button>
                         <button 
                            onClick={downloadQRCode} 
                            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-xl transition-colors border border-gray-200"
                         >
                            <Download size={14} /> Save Img
                         </button>
                     </div>
                 </div>

                 <div className="space-y-3">
                     <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-1.5 pl-4 rounded-xl border border-gray-200 dark:border-white/10">
                         <div className="flex-1 truncate text-xs text-gray-500 font-mono">
                             {shareUrl}
                         </div>
                         <button 
                            onClick={() => copyToClipboard(shareUrl)}
                            className="p-2.5 bg-white dark:bg-[#2C2C2E] rounded-lg shadow-sm hover:text-primary transition-colors"
                         >
                             <Copy size={16} />
                         </button>
                     </div>
                     
                     <a 
                        href={shareUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                     >
                        <ExternalLink size={16} /> ওপেন করুন
                     </a>
                 </div>
            </div>
         )}

         {/* CONTENT: LEADERBOARD */}
         {activeTab === 'leaderboard' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 p-6 rounded-2xl border border-yellow-100 dark:border-white/5 text-center">
                     <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-full flex items-center justify-center text-yellow-500 mx-auto mb-3 shadow-sm">
                         <Trophy size={24} />
                     </div>
                     <h4 className="font-bold text-[#1D1D1F] dark:text-white mb-1">পাবলিক লিডারবোর্ড</h4>
                     <p className="text-xs text-gray-500">শিক্ষার্থীদের সাথে শেয়ার করার জন্য লিংক</p>
                 </div>

                 <div className="space-y-3">
                     <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-1.5 pl-4 rounded-xl border border-gray-200 dark:border-white/10">
                         <div className="flex-1 truncate text-xs text-gray-500 font-mono">
                             {leaderboardUrl}
                         </div>
                         <button 
                            onClick={() => copyToClipboard(leaderboardUrl)}
                            className="p-2.5 bg-white dark:bg-[#2C2C2E] rounded-lg shadow-sm hover:text-primary transition-colors"
                         >
                             <Copy size={16} />
                         </button>
                     </div>
                     <a 
                        href={leaderboardUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-white/10 text-[#1D1D1F] dark:text-white border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/20 transition-all"
                     >
                        <ExternalLink size={16} /> প্রিভিউ দেখুন
                     </a>
                 </div>
             </div>
         )}

      </div>
    </div>
  );
};
