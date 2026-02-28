
import React from 'react';
import { ArrowLeft, ScanLine, Construction } from 'lucide-react';

interface OmrScannerProps {
    initialExamId: string | null;
    onBack: () => void;
}

export const OmrScanner: React.FC<OmrScannerProps> = ({ onBack }) => {
    return (
        <div className="h-full flex flex-col animate-in fade-in pb-20 md:pb-0">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 shrink-0">
                <button onClick={onBack} className="p-2 bg-white dark:bg-white/10 hover:bg-gray-100 rounded-full transition-colors shadow-sm">
                    <ArrowLeft size={20} className="text-[#1D1D1F] dark:text-white" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <ScanLine className="text-primary" /> OMR Scanner
                    </h2>
                    <p className="text-sm text-gray-500">Optical Mark Recognition</p>
                </div>
            </div>

            {/* Coming Soon Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#1C1C1E] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 shadow-lg shadow-primary/20 animate-pulse">
                    <Construction size={48} strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-[#1D1D1F] dark:text-white mb-4 tracking-tight">
                    Coming Soon
                </h3>
            
                <div className="mt-8 flex gap-3">
                    <span className="px-4 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-bold uppercase tracking-widest border border-yellow-200 dark:border-yellow-800">
                        Under Development
                    </span>
                </div>
            </div>
        </div>
    );
};
