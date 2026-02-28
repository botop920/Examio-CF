
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Download, FileText, Trophy, TrendingUp, Calendar, User, Loader2, Award, Percent } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast from 'react-hot-toast';

export const Marksheet = () => {
    const [searchRoll, setSearchRoll] = useState('');
    const [loading, setLoading] = useState(false);
    const [rankLoading, setRankLoading] = useState(false);
    const [studentData, setStudentData] = useState<any[]>([]);
    const [studentName, setStudentName] = useState('');
    const [searched, setSearched] = useState(false);

    // This function calculates rank by counting how many students got more marks
    const calculateRanksClientSide = async (basicData: any[]) => {
        setRankLoading(true);
        const updatedData = [...basicData];
        
        try {
            // Create an array of promises to fetch rank data for all exams in parallel
            const promises = updatedData.map(async (exam) => {
                // 1. Get Rank: Count students with MORE marks in this specific exam
                const { count: betterCount, error: rankError } = await supabase
                    .from('student_submissions')
                    .select('id', { count: 'exact', head: true })
                    .eq('exam_id', exam.exam_id)
                    .gt('obtained_marks', exam.obtained_marks);
                    
                // 2. Get Total Participants for this exam
                const { count: totalCount, error: totalError } = await supabase
                    .from('student_submissions')
                    .select('id', { count: 'exact', head: true })
                    .eq('exam_id', exam.exam_id);

                if (!rankError && !totalError) {
                    return {
                        ...exam,
                        student_rank: (betterCount || 0) + 1,
                        total_participants: totalCount || 0
                    };
                }
                return exam;
            });

            const results = await Promise.all(promises);
            setStudentData(results);
        } catch (e) {
            console.error("Rank calculation error", e);
        } finally {
            setRankLoading(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchRoll.trim()) return;

        setLoading(true);
        setSearched(true);
        setStudentData([]);
        setStudentName('');
        setRankLoading(false);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // CRITICAL FIX: Use !inner join to filter by exams.teacher_id
            // The student_submissions table likely doesn't have teacher_id directly
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('student_submissions')
                .select(`
                    *,
                    exams!inner (
                        title,
                        subject,
                        created_at,
                        teacher_id
                    )
                `)
                .eq('exams.teacher_id', user.id) // Filter via the joined exam table
                .eq('student_roll', searchRoll.trim())
                .order('created_at', { ascending: false });

            if (!fallbackError && fallbackData && fallbackData.length > 0) {
                // Map to structure
                const mappedData = fallbackData.map((item: any) => ({
                    exam_id: item.exam_id,
                    student_name: item.student_name,
                    exam_title: item.exams?.title || 'Untitled Exam',
                    exam_subject: item.exams?.subject || 'General',
                    exam_date: item.exams?.created_at || item.created_at,
                    total_marks: item.total_marks,
                    obtained_marks: item.obtained_marks,
                    percentile: item.percentile,
                    student_rank: 0, // Placeholder, will update shortly
                    total_participants: 0 // Placeholder
                }));
                
                setStudentData(mappedData);
                setStudentName(mappedData[0].student_name);
                
                // Trigger background rank calculation
                calculateRanksClientSide(mappedData);
            } else {
                 if (fallbackError) console.error("Search Error:", fallbackError);
                 if (searched) toast.error('No records found for this roll number.');
            }
        } catch (err) {
            console.error(err);
            toast.error("Error fetching data");
        }
        
        setLoading(false);
    };

    const downloadPDF = () => {
        if (studentData.length === 0) return;

        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(0, 113, 227); // Primary Color
        doc.text("EXAMiO", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Digital Exam Platform", 14, 25);

        // Student Info Box
        doc.setDrawColor(220);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 35, 182, 35, 3, 3, 'FD');

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`Student Report Card`, 20, 48);
        
        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text(`Name: ${studentName}`, 20, 58);
        doc.text(`Roll Number: ${searchRoll}`, 100, 58);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 100, 48);

        // Summary Stats
        const totalExams = studentData.length;
        const avgMarks = studentData.reduce((a, b) => a + Number(b.obtained_marks || 0), 0) / totalExams;
        
        // Only calculate rank avg if valid
        const validRanks = studentData.filter(d => d.student_rank > 0);
        const avgRank = validRanks.length > 0 
            ? validRanks.reduce((a, b) => a + Number(b.student_rank || 0), 0) / validRanks.length
            : 0;

        doc.text(`Total Exams: ${totalExams}`, 20, 65);
        doc.text(`Avg. Score: ${avgMarks.toFixed(1)}`, 60, 65);
        if (avgRank > 0) doc.text(`Avg. Rank: ${Math.round(avgRank)}`, 100, 65);

        // Table
        const tableColumn = ["Date", "Exam Title", "Subject", "Marks", "Total", "Rank", "Percentile"];
        const tableRows: any[] = [];

        studentData.forEach(item => {
            const examDate = new Date(item.exam_date).toLocaleDateString();
            const marksData = `${Number(item.obtained_marks).toFixed(1)}`;
            const rankData = item.student_rank > 0 ? `${item.student_rank} / ${item.total_participants}` : '-';
            const percentile = item.total_marks > 0 ? `${((item.obtained_marks / item.total_marks) * 100).toFixed(0)}%` : '-';

            tableRows.push([
                examDate,
                item.exam_title,
                item.exam_subject,
                marksData,
                item.total_marks,
                rankData,
                percentile
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 80,
            theme: 'grid',
            headStyles: { fillColor: [0, 113, 227] },
            styles: { fontSize: 9 },
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || 80;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Generated by EXAMiO - Exam Management System", 14, finalY + 15);

        doc.save(`Marksheet_${searchRoll}.pdf`);
        toast.success("PDF Downloaded!");
    };

    // Calculate Stats for Display
    const totalExams = studentData.length;
    const totalObtained = studentData.reduce((acc, curr) => acc + (Number(curr.obtained_marks) || 0), 0);
    const totalPossible = studentData.reduce((acc, curr) => acc + (Number(curr.total_marks) || 0), 0);
    const avgPercentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in pb-20">
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <FileText className="text-primary" /> মার্কশিট জেনারেটর
                </h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">শিক্ষার্থীর রোল নম্বর দিয়ে বিস্তারিত রিপোর্ট এবং রেজাল্ট হিস্ট্রি দেখুন।</p>
            </div>

            {/* Search Box - Responsive */}
            <form onSubmit={handleSearch} className="bg-white dark:bg-[#1C1C1E] p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col md:flex-row gap-4 md:items-end">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Student Roll Number</label>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text" 
                            value={searchRoll}
                            onChange={(e) => setSearchRoll(e.target.value)}
                            placeholder="Enter roll (e.g. 1024)" 
                            className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/30 outline-none text-base md:text-lg font-medium dark:text-white transition-all shadow-inner"
                        />
                    </div>
                </div>
                <button 
                    type="submit"
                    disabled={loading || !searchRoll}
                    className="w-full md:w-auto h-12 px-8 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Search size={18} />} সার্চ করুন
                </button>
            </form>

            {/* Results Area */}
            {searched && !loading && studentData.length > 0 && (
                <div className="space-y-4 md:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Header Card - Responsive */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[24px] md:rounded-[28px] p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 text-2xl md:text-3xl font-bold">
                                {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-bold">{studentName}</h3>
                                <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4 mt-2 opacity-90 text-xs md:text-sm font-medium">
                                    <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full"><User size={14} /> Roll: {searchRoll}</span>
                                    <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full"><Calendar size={14} /> Joined: 2024</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative z-10 w-full md:w-auto">
                            <button 
                                onClick={downloadPDF}
                                className="w-full md:w-auto bg-white text-blue-700 px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-95 transition-all text-sm md:text-base"
                            >
                                <Download size={18} /> Download PDF
                            </button>
                        </div>

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                    </div>

                    {/* Stats Cards - Responsive Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 md:mb-3">
                                <FileText size={18} className="md:w-5 md:h-5" />
                            </div>
                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Total Exams</p>
                            <h4 className="text-xl md:text-2xl font-black text-[#1D1D1F] dark:text-white mt-1">{totalExams}</h4>
                        </div>
                        <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center mb-2 md:mb-3">
                                <TrendingUp size={18} className="md:w-5 md:h-5" />
                            </div>
                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Avg. Score</p>
                            <h4 className="text-xl md:text-2xl font-black text-[#1D1D1F] dark:text-white mt-1">{avgPercentage.toFixed(0)}<span className="text-sm text-gray-400">%</span></h4>
                        </div>
                        <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 md:mb-3">
                                <Award size={18} className="md:w-5 md:h-5" />
                            </div>
                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Total Marks</p>
                            <h4 className="text-xl md:text-2xl font-black text-[#1D1D1F] dark:text-white mt-1">{totalObtained.toFixed(0)}</h4>
                        </div>
                        <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2 md:mb-3">
                                <Percent size={18} className="md:w-5 md:h-5" />
                            </div>
                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Completion</p>
                            <h4 className="text-xl md:text-2xl font-black text-[#1D1D1F] dark:text-white mt-1">
                                {totalPossible > 0 ? ((totalObtained/totalPossible)*100).toFixed(0) : 0}%
                            </h4>
                        </div>
                    </div>

                    {/* Detailed List - Responsive Layout */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-[#1D1D1F] dark:text-white text-sm md:text-base">Exam History</h3>
                            {rankLoading && <span className="text-xs text-primary animate-pulse flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> <span className="hidden md:inline">Calculating Ranks...</span></span>}
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                            {studentData.map((exam, idx) => (
                                <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    {/* Date & Title */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-100 dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">{new Date(exam.exam_date || exam.created_at).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-base md:text-lg font-black text-[#1D1D1F] dark:text-white">{new Date(exam.exam_date || exam.created_at).getDate()}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-[#1D1D1F] dark:text-white text-sm md:text-base truncate pr-2">{exam.exam_title || 'Untitled Exam'}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 md:mt-1 truncate">{exam.exam_subject} • Total Marks: {exam.total_marks}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Stats (Mobile: Aligned with indentation, Desktop: Right aligned) */}
                                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 pl-14 md:pl-0 w-full md:w-auto">
                                        <div className="text-left md:text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Obtained</p>
                                            <p className="text-base md:text-lg font-bold text-primary">{Number(exam.obtained_marks).toFixed(1)}</p>
                                        </div>
                                        <div className="text-right md:text-center w-24">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Rank</p>
                                            <p className="text-base md:text-lg font-bold text-[#1D1D1F] dark:text-white flex items-center justify-end md:justify-center gap-1">
                                                <Trophy size={14} className={exam.student_rank === 1 ? 'text-yellow-500' : 'text-gray-300'} />
                                                {exam.student_rank > 0 ? `${exam.student_rank} / ${exam.total_participants}` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {searched && !loading && studentData.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-3xl border border-dashed border-gray-300 dark:border-white/10 animate-in zoom-in-95">
                    <p className="text-gray-400">No records found for this Roll Number.</p>
                </div>
            )}
        </div>
    );
};
