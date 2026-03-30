import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, Trophy, Clock, CheckCircle2, XCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface PhotocardProps {
  studentName: string;
  studentRoll: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  avgTimePerQuestion?: string;
  rank?: number;
  avatarUrl?: string;
}

export const Photocard: React.FC<PhotocardProps> = ({
  studentName,
  studentRoll,
  examTitle,
  score,
  totalMarks,
  correctCount,
  wrongCount,
  skippedCount,
  avgTimePerQuestion = "N/A",
  rank,
  avatarUrl
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    const toastId = toast.loading('ফটোকার্ড তৈরি হচ্ছে...');
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: null,
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${studentName.replace(/\s+/g, '_')}_Result.png`;
      link.click();
      toast.success('ফটোকার্ড ডাউনলোড হয়েছে!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('ডাউনলোড করতে সমস্যা হয়েছে', { id: toastId });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      <button
        onClick={downloadCard}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all"
      >
        <Download size={18} />
        পার্সোনালাইজড ফটোকার্ড ডাউনলোড করুন
      </button>

      {/* Hidden Photocard for rendering */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div 
          ref={cardRef}
          className="w-[1080px] h-[1080px] relative overflow-hidden bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-12"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 0%, #2A1B54 0%, #0A0A0A 70%)',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"1\\"%3E%3Cpath d=\\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}></div>
          
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-50"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-50"></div>

          {/* Header */}
          <div className="z-10 text-center mb-12">
            <h2 className="text-3xl font-bold text-purple-300 tracking-widest uppercase mb-2">পরীক্ষার ফলাফল</h2>
            <h1 className="text-5xl font-black text-white leading-tight max-w-3xl mx-auto">{examTitle}</h1>
          </div>

          {/* Main Content Card */}
          <div className="z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[40px] p-12 w-full max-w-4xl flex flex-col items-center shadow-2xl relative">
            
            {/* Rank Badge */}
            {rank && (
              <div className="absolute top-8 right-8 bg-gradient-to-br from-yellow-400 to-orange-600 text-black rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.5)] border-4 border-white/20 transform rotate-12">
                <Trophy size={24} className="mb-1 text-black/80" />
                <span className="text-xs font-bold uppercase tracking-widest mb-[-2px]">র‍্যাঙ্ক</span>
                <span className="text-4xl font-black">#{rank}</span>
              </div>
            )}

            {/* Profile Section */}
            <div className="flex flex-col items-center mb-10">
              <div className="w-40 h-40 rounded-full border-4 border-purple-500 p-2 mb-6 bg-black/50 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-6xl font-black text-white">
                    {studentName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-5xl font-black text-white mb-2">{studentName}</h2>
              <div className="px-6 py-2 bg-white/10 rounded-full text-xl font-bold text-purple-200 tracking-wider">
                রোল: {studentRoll}
              </div>
            </div>

            {/* Score Section */}
            <div className="flex items-center justify-center gap-16 w-full mb-12">
              <div className="text-center">
                <p className="text-xl text-gray-400 font-medium mb-2 uppercase tracking-wider">প্রাপ্ত নম্বর</p>
                <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                  {Number(score).toFixed(2)}
                </p>
              </div>
              <div className="w-px h-24 bg-white/20"></div>
              <div className="text-center">
                <p className="text-xl text-gray-400 font-medium mb-2 uppercase tracking-wider">মোট নম্বর</p>
                <p className="text-7xl font-black text-white">
                  {totalMarks}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6 w-full">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
                <CheckCircle2 className="text-green-400 mb-3" size={40} />
                <p className="text-4xl font-bold text-white mb-1">{correctCount}</p>
                <p className="text-sm text-gray-400 uppercase tracking-wider font-bold">সঠিক উত্তর</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
                <XCircle className="text-red-400 mb-3" size={40} />
                <p className="text-4xl font-bold text-white mb-1">{wrongCount}</p>
                <p className="text-sm text-gray-400 uppercase tracking-wider font-bold">ভুল উত্তর</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
                <div className="text-yellow-400 mb-3 flex items-center justify-center w-10 h-10 rounded-full border-2 border-yellow-400">
                  <span className="text-xl font-bold">-</span>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{skippedCount}</p>
                <p className="text-sm text-gray-400 uppercase tracking-wider font-bold">স্কিপ করেছেন</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
                <Clock className="text-blue-400 mb-3" size={40} />
                <p className="text-4xl font-bold text-white mb-1">{avgTimePerQuestion}</p>
                <p className="text-sm text-gray-400 uppercase tracking-wider font-bold">গড় সময়/প্রশ্ন</p>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="absolute bottom-12 text-center z-10">
            <p className="text-gray-400 text-lg font-medium tracking-widest uppercase flex items-center gap-2">
              <Star size={20} className="text-yellow-500" />
              Generated by AI Studio
              <Star size={20} className="text-yellow-500" />
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
