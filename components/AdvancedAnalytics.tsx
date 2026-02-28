import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, Users, Clock, CheckCircle, XCircle, AlertTriangle, Monitor, Smartphone, Globe } from 'lucide-react';

interface AdvancedAnalyticsProps {
  exams: any[];
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ exams }) => {
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    if (selectedExamId) {
      fetchAnalytics(selectedExamId);
    }
  }, [selectedExamId]);

  const fetchAnalytics = async (examId: string) => {
    setLoading(true);
    try {
      // Fetch Submissions
      const { data: submissions, error: subError } = await supabase
        .from('student_submissions')
        .select('*')
        .eq('exam_id', examId);

      if (subError) throw subError;

      // Fetch Answers
      const { data: answers, error: ansError } = await supabase
        .from('student_answers')
        .select('*, student_submissions!inner(exam_id)')
        .eq('student_submissions.exam_id', examId);

      if (ansError) throw ansError;

      // Process Data
      const totalParticipants = submissions.length;
      
      let maxTime = 0;
      let minTime = Infinity;
      let totalTime = 0;
      let deviceStats = { Mobile: 0, Desktop: 0, Unknown: 0 };
      let tabSwitchers = 0;

      submissions.forEach(sub => {
        const time = sub.time_taken || 0;
        if (time > maxTime) maxTime = time;
        if (time < minTime && time > 0) minTime = time;
        totalTime += time;

        const meta = sub.metadata || {};
        if (meta.device === 'Mobile') deviceStats.Mobile++;
        else if (meta.device === 'Desktop') deviceStats.Desktop++;
        else deviceStats.Unknown++;

        if (meta.tab_switches > 0) tabSwitchers++;
      });

      if (minTime === Infinity) minTime = 0;
      const avgTime = totalParticipants > 0 ? totalTime / totalParticipants : 0;

      // Process Questions
      const questionStats: Record<string, { correct: number, incorrect: number }> = {};
      answers.forEach(ans => {
        if (!questionStats[ans.question_id]) {
          questionStats[ans.question_id] = { correct: 0, incorrect: 0 };
        }
        if (ans.is_correct) {
          questionStats[ans.question_id].correct++;
        } else {
          questionStats[ans.question_id].incorrect++;
        }
      });

      let mostCorrectQ = null;
      let mostIncorrectQ = null;
      let maxCorrect = -1;
      let maxIncorrect = -1;

      Object.entries(questionStats).forEach(([qId, stats]) => {
        if (stats.correct > maxCorrect) {
          maxCorrect = stats.correct;
          mostCorrectQ = qId;
        }
        if (stats.incorrect > maxIncorrect) {
          maxIncorrect = stats.incorrect;
          mostIncorrectQ = qId;
        }
      });

      // Prepare Chart Data
      const scoreDistribution = [
        { name: '0-20%', count: 0 },
        { name: '21-40%', count: 0 },
        { name: '41-60%', count: 0 },
        { name: '61-80%', count: 0 },
        { name: '81-100%', count: 0 },
      ];

      submissions.forEach(sub => {
        const percent = sub.total_marks > 0 ? (sub.obtained_marks / sub.total_marks) * 100 : 0;
        if (percent <= 20) scoreDistribution[0].count++;
        else if (percent <= 40) scoreDistribution[1].count++;
        else if (percent <= 60) scoreDistribution[2].count++;
        else if (percent <= 80) scoreDistribution[3].count++;
        else scoreDistribution[4].count++;
      });

      setAnalyticsData({
        totalParticipants,
        maxTime,
        minTime,
        avgTime,
        deviceStats,
        tabSwitchers,
        mostCorrectQ,
        mostIncorrectQ,
        scoreDistribution,
        submissions
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (!exams || exams.length === 0) {
    return <div className="p-8 text-center text-gray-500">No exams available for analytics.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
        <h2 className="text-lg font-bold">Enterprise Analytics</h2>
        <select 
          value={selectedExamId} 
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
        >
          {exams.map(exam => (
            <option key={exam.id} value={exam.id}>{exam.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : analyticsData ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users size={20} /></div>
                <h3 className="text-sm font-medium text-gray-500">Total Participants</h3>
              </div>
              <p className="text-3xl font-bold">{analyticsData.totalParticipants}</p>
            </div>
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Clock size={20} /></div>
                <h3 className="text-sm font-medium text-gray-500">Avg Time Taken</h3>
              </div>
              <p className="text-3xl font-bold">{formatTime(analyticsData.avgTime)}</p>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>Min: {formatTime(analyticsData.minTime)}</span>
                <span>Max: {formatTime(analyticsData.maxTime)}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
                <h3 className="text-sm font-medium text-gray-500">Most Correct Q.</h3>
              </div>
              <p className="text-sm font-bold truncate" title={analyticsData.mostCorrectQ || 'N/A'}>
                {analyticsData.mostCorrectQ ? 'ID: ' + analyticsData.mostCorrectQ.substring(0,8) + '...' : 'N/A'}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><XCircle size={20} /></div>
                <h3 className="text-sm font-medium text-gray-500">Most Incorrect Q.</h3>
              </div>
              <p className="text-sm font-bold truncate" title={analyticsData.mostIncorrectQ || 'N/A'}>
                {analyticsData.mostIncorrectQ ? 'ID: ' + analyticsData.mostIncorrectQ.substring(0,8) + '...' : 'N/A'}
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
              <h3 className="text-lg font-bold mb-6">Score Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Device & Behavior */}
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col">
              <h3 className="text-lg font-bold mb-6">Device & Behavior</h3>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <Monitor size={32} className="text-gray-400 mb-2" />
                  <span className="text-2xl font-bold">{analyticsData.deviceStats.Desktop}</span>
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Desktop</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <Smartphone size={32} className="text-gray-400 mb-2" />
                  <span className="text-2xl font-bold">{analyticsData.deviceStats.Mobile}</span>
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Mobile</span>
                </div>
                <div className="col-span-2 flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-orange-500" />
                    <div>
                      <h4 className="font-bold text-orange-700 dark:text-orange-400">Tab Switchers</h4>
                      <p className="text-xs text-orange-600/80 dark:text-orange-400/80">Students who left the exam tab</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analyticsData.tabSwitchers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Detailed Table */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-lg font-bold">Student Detailed Analytics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-xs uppercase tracking-wider text-gray-500">
                    <th className="p-4 font-bold">Student</th>
                    <th className="p-4 font-bold">Score</th>
                    <th className="p-4 font-bold">Time Taken</th>
                    <th className="p-4 font-bold">Device</th>
                    <th className="p-4 font-bold">Tab Switches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {analyticsData.submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-sm">{sub.student_name}</div>
                        <div className="text-xs text-gray-500">{sub.student_roll}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold">{sub.obtained_marks}</span>
                        <span className="text-gray-400 text-xs"> / {sub.total_marks}</span>
                      </td>
                      <td className="p-4 text-sm">{formatTime(sub.time_taken)}</td>
                      <td className="p-4">
                        {sub.metadata?.device === 'Mobile' ? <Smartphone size={16} className="text-gray-400" /> : <Monitor size={16} className="text-gray-400" />}
                      </td>
                      <td className="p-4">
                        {sub.metadata?.tab_switches > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-orange-700 text-xs font-bold">
                            <AlertTriangle size={12} /> {sub.metadata.tab_switches}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {analyticsData.submissions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">No submissions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
