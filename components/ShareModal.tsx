
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, ExternalLink, Download, Image as ImageIcon, Code, Trophy, Link as LinkIcon, Eye, EyeOff, Loader2, Camera, Star, Upload, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Photocard } from './Photocard';

interface ShareModalProps {
  exam: any;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ exam, onClose }) => {
  const [activeTab, setActiveTab] = useState<'link' | 'leaderboard' | 'personalized'>('link');
  const [showResultsInstant, setShowResultsInstant] = useState(true);
  const [allowPhotocard, setAllowPhotocard] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingPhotocard, setIsUpdatingPhotocard] = useState(false);

  // Personalized states
  const [fbLink, setFbLink] = useState('');
  const [tgLink, setTgLink] = useState('');
  const [wsLink, setWsLink] = useState('');
  const [coachingName, setCoachingName] = useState('');
  const [customPhotocardUrl, setCustomPhotocardUrl] = useState('');
  const [photocardTitle, setPhotocardTitle] = useState('');
  const [photocardBgColor, setPhotocardBgColor] = useState('#050505');
  const [photocardTextColor, setPhotocardTextColor] = useState('#FFFFFF');
  const [photocardAccentColor, setPhotocardAccentColor] = useState('#8B5CF6');
  const [photocardShowRank, setPhotocardShowRank] = useState(true);
  const [photocardShowStats, setPhotocardShowStats] = useState(true);
  const [requireInstitution, setRequireInstitution] = useState(false);
  const [isSavingPersonalized, setIsSavingPersonalized] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Initialize state from exam prop
  useEffect(() => {
      if (exam) {
          // Default to true if the column doesn't exist or is null
          setShowResultsInstant(exam.show_results_instant !== false);
          setAllowPhotocard(exam.allow_photocard === true);
          setFbLink(exam.fb_link || '');
          setTgLink(exam.tg_link || '');
          setWsLink(exam.ws_link || '');
          setCoachingName(exam.coaching_name || '');
          setCustomPhotocardUrl(exam.custom_photocard_url || '');
          setPhotocardTitle(exam.photocard_title || '');
          setPhotocardBgColor(exam.photocard_bg_color || '#050505');
          setPhotocardTextColor(exam.photocard_text_color || '#FFFFFF');
          setPhotocardAccentColor(exam.photocard_accent_color || '#8B5CF6');
          setPhotocardShowRank(exam.photocard_show_rank !== false);
          setPhotocardShowStats(exam.photocard_show_stats !== false);
          setRequireInstitution(exam.require_institution === true);
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

  const togglePhotocard = async () => {
      setIsUpdatingPhotocard(true);
      const newValue = !allowPhotocard;
      
      try {
          const { error } = await supabase
            .from('exams')
            .update({ allow_photocard: newValue })
            .eq('id', exam.id);

          if (error) throw error;
          
          setAllowPhotocard(newValue);
          toast.success(newValue ? 'ফটোকার্ড ডাউনলোড চালু করা হয়েছে' : 'ফটোকার্ড ডাউনলোড বন্ধ করা হয়েছে');
      } catch (error) {
          console.error(error);
          toast.error('আপডেট করতে সমস্যা হয়েছে');
      } finally {
          setIsUpdatingPhotocard(false);
      }
  };

  const savePersonalizedSettings = async () => {
      setIsSavingPersonalized(true);
      try {
          const { error } = await supabase
            .from('exams')
            .update({ 
                fb_link: fbLink,
                tg_link: tgLink,
                ws_link: wsLink,
                coaching_name: coachingName,
                custom_photocard_url: customPhotocardUrl,
                photocard_title: photocardTitle,
                photocard_bg_color: photocardBgColor,
                photocard_text_color: photocardTextColor,
                photocard_accent_color: photocardAccentColor,
                photocard_show_rank: photocardShowRank,
                photocard_show_stats: photocardShowStats,
                require_institution: requireInstitution
            })
            .eq('id', exam.id);

          if (error) throw error;
          toast.success('পার্সোনালাইজড সেটিংস সেভ হয়েছে!');
      } catch (error) {
          console.error(error);
          toast.error('সেটিংস সেভ করতে সমস্যা হয়েছে');
      } finally {
          setIsSavingPersonalized(false);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingImage(true);
      const toastId = toast.loading('ছবি আপলোড হচ্ছে...');

      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `photocards/${exam.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
              .from('exam-assets')
              .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
              .from('exam-assets')
              .getPublicUrl(filePath);

          setCustomPhotocardUrl(publicUrl);
          toast.success('ছবি আপলোড হয়েছে!', { id: toastId });
      } catch (error) {
          console.error(error);
          toast.error('ছবি আপলোড করতে সমস্যা হয়েছে', { id: toastId });
      } finally {
          setIsUploadingImage(false);
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
            <button 
                onClick={() => setActiveTab('personalized')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'personalized' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
            >
                <Star size={14} /> Personalized
            </button>
         </div>

         {/* CONTENT: LINK */}
         {activeTab === 'link' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 
                 {/* Result Visibility Toggle */}
                 <div className="mb-3 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 flex items-center justify-between">
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

                 {/* Photocard Toggle */}
                 <div className="mb-3 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-full ${allowPhotocard ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                             <Camera size={18} />
                         </div>
                         <div>
                             <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">Personalized Photocard</p>
                             <p className="text-[10px] text-gray-500">Students can download a result card</p>
                         </div>
                     </div>
                     <button 
                        onClick={togglePhotocard}
                        disabled={isUpdatingPhotocard}
                        className={`w-12 h-7 rounded-full p-1 transition-colors relative ${allowPhotocard ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                     >
                         <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${allowPhotocard ? 'translate-x-5' : 'translate-x-0'}`}>
                             {isUpdatingPhotocard && <Loader2 className="w-full h-full p-1 animate-spin text-primary" />}
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

         {/* CONTENT: PERSONALIZED */}
         {activeTab === 'personalized' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 
                 {/* Social Links */}
                 <div className="space-y-3">
                     <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-white">সোশ্যাল গ্রুপ লিংক (রেজাল্ট পেজে দেখাবে)</h4>
                     <div className="grid grid-cols-1 gap-2">
                        <input 
                            type="text" 
                            placeholder="Facebook Group Link" 
                            value={fbLink}
                            onChange={(e) => setFbLink(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
                        />
                        <input 
                            type="text" 
                            placeholder="Telegram Group Link" 
                            value={tgLink}
                            onChange={(e) => setTgLink(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
                        />
                        <input 
                            type="text" 
                            placeholder="WhatsApp Group Link" 
                            value={wsLink}
                            onChange={(e) => setWsLink(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
                        />
                     </div>
                 </div>

                 {/* Coaching Name */}
                 <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                     <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-white">কোচিং/টিচারের নাম (ফটোকার্ডের উপরে দেখাবে)</h4>
                     <input 
                        type="text" 
                        placeholder="Coaching or Teacher Name" 
                        value={coachingName}
                        onChange={(e) => setCoachingName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
                     />
                 </div>

                 {/* Photocard Customization */}
                 <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                     <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-white">ফটোকার্ড কাস্টমাইজেশন</h4>
                        <div className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">Premium</div>
                     </div>

                     {/* Preview Section */}
                     <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 flex flex-col items-center">
                        <div className="flex items-center justify-between w-full mb-3">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Preview</p>
                           <button 
                               onClick={() => setShowFullPreview(true)}
                               className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                           >
                               <Eye size={12} /> Full Preview
                           </button>
                        </div>
                        <div className="w-full max-w-[280px] aspect-square shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                            <div className="scale-[0.259] origin-top-left w-[1080px] h-[1080px]">
                                <Photocard 
                                    studentName="সাকিব আল হাসান"
                                    studentRoll="১০১"
                                    institution="ঢাকা কলেজ"
                                    examTitle={exam.title}
                                    score={85.5}
                                    totalMarks={100}
                                    correctCount={86}
                                    wrongCount={4}
                                    skippedCount={10}
                                    avgTimePerQuestion="১২.৫ সে."
                                    rank={1}
                                    avatarUrl={`https://api.dicebear.com/7.x/avataaars/svg?seed=Sabbir`}
                                    customTemplateUrl={customPhotocardUrl}
                                    isPreview={false}
                                    coachingName={coachingName}
                                    customTitle={photocardTitle}
                                    bgColor={photocardBgColor}
                                    textColor={photocardTextColor}
                                    accentColor={photocardAccentColor}
                                    showRank={photocardShowRank}
                                    showStats={photocardShowStats}
                                />
                            </div>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Custom Title</label>
                            <input 
                                type="text" 
                                placeholder="Default: Exam Title" 
                                value={photocardTitle}
                                onChange={(e) => setPhotocardTitle(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">BG Color</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="color" value={photocardBgColor} onChange={(e) => setPhotocardBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
                                    <span className="text-[10px] font-mono text-gray-500 uppercase">{photocardBgColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Text Color</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="color" value={photocardTextColor} onChange={(e) => setPhotocardTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
                                    <span className="text-[10px] font-mono text-gray-500 uppercase">{photocardTextColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Accent</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="color" value={photocardAccentColor} onChange={(e) => setPhotocardAccentColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
                                    <span className="text-[10px] font-mono text-gray-500 uppercase">{photocardAccentColor}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <label className="flex-1 flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer">
                                <input type="checkbox" checked={photocardShowRank} onChange={(e) => setPhotocardShowRank(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary" />
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Show Rank</span>
                            </label>
                            <label className="flex-1 flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer">
                                <input type="checkbox" checked={photocardShowStats} onChange={(e) => setPhotocardShowStats(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary" />
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Show Stats</span>
                            </label>
                        </div>
                     </div>

                     <div className="space-y-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Template Image (1080x1080)</label>
                         <div className="flex items-center gap-4">
                            {customPhotocardUrl && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                                    <img src={customPhotocardUrl} alt="Template" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                {isUploadingImage ? <Loader2 className="animate-spin text-primary" size={16} /> : <Upload size={16} className="text-gray-500" />}
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                    {customPhotocardUrl ? 'Change Template' : 'Upload Template'}
                                </span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                            </label>
                            {customPhotocardUrl && (
                                <button onClick={() => setCustomPhotocardUrl('')} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                    <X size={16} />
                                </button>
                            )}
                         </div>
                     </div>
                 </div>

                 {/* Require Institution */}
                 <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                     <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer">
                         <input 
                             type="checkbox" 
                             checked={requireInstitution}
                             onChange={(e) => setRequireInstitution(e.target.checked)}
                             className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                         />
                         <div>
                             <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">স্কুল/কলেজের নাম আবশ্যক</p>
                             <p className="text-[10px] text-gray-500">শিক্ষার্থীদের পরীক্ষার আগে প্রতিষ্ঠানের নাম দিতে হবে</p>
                         </div>
                     </label>
                 </div>

                 <button 
                     onClick={savePersonalizedSettings}
                     disabled={isSavingPersonalized}
                     className="w-full py-3.5 mt-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                 >
                     {isSavingPersonalized ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                     সেটিংস সেভ করুন
                 </button>
             </div>
         )}

         {/* Full Preview Modal */}
         {showFullPreview && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                 <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowFullPreview(false)}></div>
                 <div className="relative z-10 w-full max-w-4xl aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                     <button 
                       onClick={() => setShowFullPreview(false)}
                       className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50 backdrop-blur-md border border-white/20"
                     >
                       <X size={24} />
                     </button>
                     
                     <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                         <div className="origin-center" style={{ transform: `scale(${Math.min(1, (window.innerWidth - 64) / 1080, (window.innerHeight - 64) / 1080)})` }}>
                             <Photocard 
                                 studentName="সাকিব আল হাসান"
                                 studentRoll="১০১"
                                 institution="ঢাকা কলেজ"
                                 examTitle={exam.title}
                                 score={85.5}
                                 totalMarks={100}
                                 correctCount={86}
                                 wrongCount={4}
                                 skippedCount={10}
                                 avgTimePerQuestion="১২.৫ সে."
                                 rank={1}
                                 avatarUrl={`https://api.dicebear.com/7.x/avataaars/svg?seed=Sabbir`}
                                 customTemplateUrl={customPhotocardUrl}
                                 isPreview={false}
                                 coachingName={coachingName}
                                 customTitle={photocardTitle}
                                 bgColor={photocardBgColor}
                                 textColor={photocardTextColor}
                                 accentColor={photocardAccentColor}
                                 showRank={photocardShowRank}
                                 showStats={photocardShowStats}
                             />
                         </div>
                     </div>
                 </div>
             </div>
         )}

      </div>
    </div>
  );
};
