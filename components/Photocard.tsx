import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { 
  Download, Trophy, Clock, CheckCircle2, XCircle, 
  Award, QrCode, School, RefreshCw, Star
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PhotocardProps {
  studentName: string;
  studentRoll: string;
  institution?: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  avgTimePerQuestion?: string;
  rank?: number;
  avatarUrl?: string;
  customTemplateUrl?: string;
  isPreview?: boolean;
  coachingName?: string;
  // Customization props
  customTitle?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  showRank?: boolean;
  showStats?: boolean;
}

const toBengaliDigits = (num: number | string) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

export const Photocard: React.FC<PhotocardProps> = ({
  studentName,
  studentRoll,
  institution,
  examTitle,
  score,
  totalMarks,
  correctCount,
  wrongCount,
  skippedCount,
  avgTimePerQuestion = "N/A",
  rank,
  avatarUrl,
  customTemplateUrl,
  isPreview = false,
  coachingName,
  customTitle,
  bgColor = '#050505',
  textColor = '#FFFFFF',
  accentColor = '#0071E3',
  showRank = true,
  showStats = true
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;
    
    setIsDownloading(true);
    const toastId = toast.loading('ফটোকার্ড তৈরি হচ্ছে...');

    try {
      // Create a clone for rendering to avoid issues with the live component
      const clone = cardRef.current.cloneNode(true) as HTMLDivElement;
      clone.id = 'photocard-container';
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = '1080px';
      clone.style.height = '1080px';
      clone.style.display = 'block';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      clone.style.transform = 'none';
      document.body.appendChild(clone);

      // Wait for images and fonts to load
      await document.fonts.ready;

      const canvas = await html2canvas(clone, {
        useCORS: true,
        scale: 1.5,
        backgroundColor: null,
        logging: true, // Enable logging for debugging
        width: 1080,
        height: 1080,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('photocard-container');
          if (clonedElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.opacity = '1';
            clonedElement.style.transform = 'none';
          }
        }
      });

      console.log('Canvas generated:', canvas);

      document.body.removeChild(clone);

      try {
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error('Canvas to Blob returned null');
            // Fallback to DataURL if Blob fails
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `EXAMiO_${studentName.replace(/\s+/g, '_')}_Result.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('ফটোকার্ড ডাউনলোড হয়েছে! (Fallback)', { id: toastId });
            return;
          }
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `EXAMiO_${studentName.replace(/\s+/g, '_')}_Result.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
          
          console.log('Download triggered via Blob');
          toast.success('ফটোকার্ড ডাউনলোড হয়েছে!', { id: toastId });
        }, 'image/png', 1.0);
      } catch (blobErr) {
        console.error('toBlob failed, trying DataURL fallback:', blobErr);
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `EXAMiO_${studentName.replace(/\s+/g, '_')}_Result.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('ফটোকার্ড ডাউনলোড হয়েছে! (Fallback)', { id: toastId });
      }
      
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('ডাউনলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center w-full ${isPreview ? '' : 'my-8'}`}>
      {/* The actual card that will be captured */}
      <div 
        ref={cardRef}
        id="photocard-container"
        className="relative w-[1080px] h-[1080px] overflow-hidden select-none font-['Noto_Sans_Bengali']"
        style={{ 
          backgroundColor: bgColor,
          color: textColor,
          transform: isPreview ? 'scale(0.3)' : 'scale(1)',
          transformOrigin: 'top center',
          marginBottom: isPreview ? '-756px' : '0' // Adjust container height when scaled
        }}
      >
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          {customTemplateUrl ? (
            <img 
              src={customTemplateUrl} 
              className="w-full h-full object-cover" 
              alt="Template" 
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          ) : (
            <>
              {/* Vibrant Mesh Gradient */}
              <div 
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: `
                    radial-gradient(at 0% 0%, ${accentColor}33 0px, transparent 50%),
                    radial-gradient(at 100% 0%, ${accentColor}22 0px, transparent 50%),
                    radial-gradient(at 50% 50%, ${accentColor}11 0px, transparent 50%)
                  `
                }}
              />
              {/* Noise Texture */}
              <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
              
              {/* Geometric Accents */}
              <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ backgroundColor: `${accentColor}22` }} />
              <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ backgroundColor: `${accentColor}22` }} />
            </>
          )}
        </div>

        {/* Content Layer */}
        <div className="relative z-10 w-full h-full flex flex-col">
          {/* Coaching Name (New) */}
          {coachingName && (
            <div className="absolute top-6 left-0 right-0 flex justify-center z-20">
              <div className="px-6 py-2 bg-black/20 border border-white/10 rounded-full">
                <p className="text-2xl font-black tracking-[0.3em] uppercase opacity-90" style={{ color: accentColor }}>
                  {coachingName}
                </p>
              </div>
            </div>
          )}

          {/* Header Section (18%) */}
          <div className={`h-[18%] flex flex-col items-center justify-center px-8 text-center ${coachingName ? 'pt-12' : ''}`}>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: accentColor }}>
                <Trophy className="text-white" size={28} />
              </div>
              <h1 className="text-4xl font-black tracking-widest uppercase opacity-90">
                {customTitle || 'Official Achievement Card'}
              </h1>
            </div>
            <div className="h-1 w-48 rounded-full opacity-30" style={{ backgroundColor: accentColor }} />
          </div>

          {/* Profile Section (46%) */}
          <div className="h-[46%] flex flex-col items-center justify-center px-8 relative">
            {/* Rank Badge */}
            {showRank && rank && (
              <div className="absolute top-10 right-20 z-20">
                <div className="relative">
                  <div className="absolute inset-0 blur-2xl opacity-30" style={{ backgroundColor: accentColor }} />
                  <div className="relative bg-black/40 border-2 border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center shadow-2xl min-w-[180px]">
                    <span className="text-2xl font-bold uppercase tracking-widest opacity-70 mb-1">Rank</span>
                    <span className="text-8xl font-black leading-none" style={{ color: accentColor }}>#{toBengaliDigits(rank)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Avatar */}
            <div className="relative mb-10 group">
              <div className="absolute inset-0 rounded-full blur-3xl opacity-20 animate-pulse" style={{ backgroundColor: accentColor }} />
              <div className="relative w-72 h-72 rounded-full p-3 bg-gradient-to-tr from-white/10 to-transparent border-4 border-white/20 shadow-2xl overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={avatarUrl} 
                    alt={studentName}
                    className="w-full h-full object-contain drop-shadow-2xl"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            </div>

            {/* Name & Institution */}
            <div className="text-center max-w-4xl mt-4">
              <div className="mb-4">
                <p className="text-2xl font-bold tracking-[0.2em] opacity-80">রোল: {toBengaliDigits(studentRoll)}</p>
              </div>
              <h2 className="text-7xl font-black tracking-tight mb-4 truncate max-w-full drop-shadow-2xl leading-tight">
                {studentName}
              </h2>
              <div className="flex items-center justify-center gap-4 opacity-95">
                <School size={32} style={{ color: accentColor }} />
                <p className="text-4xl font-bold tracking-wide leading-tight truncate max-w-[900px]">{institution || 'EXAMiO Student'}</p>
              </div>
            </div>
          </div>

          {/* Stats Section (26%) */}
          <div className="h-[26%] px-8 pb-4">
            <div className="h-full w-full bg-black/20 border border-white/10 rounded-[60px] p-10 flex items-center justify-between shadow-inner">
              {/* Score Display */}
              <div className="flex flex-col items-center border-r border-white/10 pr-12">
                <span className="text-2xl font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-9xl font-black leading-none" style={{ color: accentColor }}>{toBengaliDigits(score.toFixed(1))}</span>
                  <span className="text-4xl font-bold opacity-40">/ {toBengaliDigits(totalMarks)}</span>
                </div>
              </div>

              {/* Detailed Stats */}
              {showStats && (
                <div className="flex-1 grid grid-cols-2 gap-y-8 gap-x-12 pl-12">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="text-green-500" size={32} />
                    </div>
                    <div>
                      <p className="text-xl font-bold opacity-50 uppercase tracking-wider">Correct</p>
                      <p className="text-4xl font-black">{toBengaliDigits(correctCount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center">
                      <XCircle className="text-red-500" size={32} />
                    </div>
                    <div>
                      <p className="text-xl font-bold opacity-50 uppercase tracking-wider">Wrong</p>
                      <p className="text-4xl font-black">{toBengaliDigits(wrongCount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                      <Clock className="text-blue-500" size={32} />
                    </div>
                    <div>
                      <p className="text-xl font-bold opacity-50 uppercase tracking-wider">Avg Time</p>
                      <p className="text-4xl font-black">{toBengaliDigits(avgTimePerQuestion)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                      <Award className="text-orange-500" size={32} />
                    </div>
                    <div>
                      <p className="text-xl font-bold opacity-50 uppercase tracking-wider">Accuracy</p>
                      <p className="text-4xl font-black">{totalMarks > 0 ? toBengaliDigits(Math.round((score / totalMarks) * 100)) : toBengaliDigits(0)}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Section (10%) */}
          <div className="h-[10%] border-t border-white/10 flex items-center justify-between px-8 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <QrCode size={24} className="opacity-70" />
              </div>
              <p className="text-xl font-bold tracking-widest opacity-50 uppercase">Verified Achievement</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-3xl font-black tracking-tighter italic opacity-90">EXAMiO <span style={{ color: accentColor }}>CERTIFIED</span></p>
              <p className="text-sm font-bold tracking-[0.3em] opacity-40 uppercase">examio.com.bd</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Button (Hidden in preview) */}
      {!isPreview && (
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="mt-8 group relative flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          {isDownloading ? (
            <RefreshCw className="animate-spin" size={18} />
          ) : (
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
          )}
          {isDownloading ? 'তৈরি হচ্ছে...' : 'ডাউনলোড ফটোকার্ড'}
        </button>
      )}
    </div>
  );
};

export default Photocard;
