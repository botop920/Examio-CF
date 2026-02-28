import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  Users, Clock, Trophy, Target, AlertTriangle, CheckCircle2, 
  TrendingUp, TrendingDown, Search, Download, Filter, Loader2, Info 
} from 'lucide-react';

interface AnalyticsDashboardProps {
  exams: any[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ exams }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams]);

  useEffect(() => {
    if (selectedExamId) {
      fetchAnalytics(selectedExamId);
    }
  }, [selectedExamId]);

  const fetchAnalytics = async (examId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_exam_analytics', { exam_uuid: examId });
      if (error) {
        console.error('Error fetching analytics:', error);
        // Fallback or error handling
      } else {
        setData(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (!selectedExamId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Info size={48} className="mb-4 opacity-50" />
        <p>Please select an exam to view analytics.</p>
      </div>
    );
  }

  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
            <TrendingUp className="text-primary" /> Enterprise Analytics
          </h2>
          <p className="text-gray-500 text-sm mt-1">Deep dive into exam performance and student metrics.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <select 
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.title}</option>
              ))}
            </select>
            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button 
            onClick={() => fetchAnalytics(selectedExamId)}
            className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            title="Refresh Data"
          >
            <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
            ))}
        </div>
      ) : data ? (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard 
              title="Participants" 
              value={data.overview.total_participants} 
              icon={Users} 
              color="text-blue-500" 
              bg="bg-blue-500/10" 
            />
            <StatCard 
              title="Avg Score" 
              value={parseFloat(data.overview.avg_marks).toFixed(1)} 
              subValue={`Max: ${data.overview.max_marks}`}
              icon={Trophy} 
              color="text-yellow-500" 
              bg="bg-yellow-500/10" 
            />
            <StatCard 
              title="Fastest Time" 
              value={formatTime(data.overview.min_time)} 
              icon={Clock} 
              color="text-green-500" 
              bg="bg-green-500/10" 
            />
            <StatCard 
              title="Slowest Time" 
              value={formatTime(data.overview.max_time)} 
              icon={Clock} 
              color="text-red-500" 
              bg="bg-red-500/10" 
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Question Performance Chart */}
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
              <h3 className="text-lg font-bold mb-6">Question Difficulty Analysis</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.questions.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="question_id" tick={{fontSize: 10}} interval={0} />
                    <YAxis />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1C1C1E', border: 'none', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="correct_count" name="Correct" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="incorrect_count" name="Incorrect" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Student Performance Scatter/Line (Simulated with Bar for now) */}
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
              <h3 className="text-lg font-bold mb-6">Top Performers (Marks vs Time)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.students.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" />
                    <YAxis dataKey="student_name" type="category" width={100} tick={{fontSize: 10}} />
                    <Tooltip 
                        cursor={{fill: 'transparent'}}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                                <div className="bg-[#1C1C1E] text-white p-3 rounded-lg text-xs shadow-xl">
                                <p className="font-bold mb-1">{d.student_name}</p>
                                <p>Marks: {d.obtained_marks}</p>
                                <p>Time: {formatTime(d.time_taken)}</p>
                                </div>
                            );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="obtained_marks" fill="#8884d8" radius={[0, 4, 4, 0]}>
                        {data.students.slice(0, 10).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Question Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuestionList 
                title="Most Difficult Questions" 
                questions={[...data.questions].sort((a: any, b: any) => b.incorrect_count - a.incorrect_count).slice(0, 5)} 
                type="difficult"
            />
            <QuestionList 
                title="Easiest Questions" 
                questions={[...data.questions].sort((a: any, b: any) => b.correct_count - a.correct_count).slice(0, 5)} 
                type="easy"
            />
          </div>

          {/* Student Leaderboard */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-bold">Student Leaderboard</h3>
                <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search student..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Rank</th>
                            <th className="px-6 py-4">Student Name</th>
                            <th className="px-6 py-4">Roll Number</th>
                            <th className="px-6 py-4">Marks Obtained</th>
                            <th className="px-6 py-4">Time Taken</th>
                            <th className="px-6 py-4">Submitted At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {data.students
                            .filter((s: any) => s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.student_roll.includes(searchTerm))
                            .map((student: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-400">#{index + 1}</td>
                                <td className="px-6 py-4 font-medium text-[#1D1D1F] dark:text-white">{student.student_name}</td>
                                <td className="px-6 py-4 text-gray-500 font-mono">{student.student_roll}</td>
                                <td className="px-6 py-4">
                                    <span className="font-bold text-primary">{student.obtained_marks}</span>
                                    <span className="text-gray-400 text-xs"> / {student.total_marks}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{formatTime(student.time_taken)}</td>
                                <td className="px-6 py-4 text-gray-500 text-xs">{new Date(student.submitted_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
          <p>No analytics data available for this exam yet.</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon: Icon, color, bg }: any) => (
  <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between">
    <div>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-[#1D1D1F] dark:text-white">{value}</h3>
      {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
      <Icon size={24} />
    </div>
  </div>
);

const QuestionList = ({ title, questions, type }: any) => (
  <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col h-full">
    <div className="p-6 border-b border-gray-100 dark:border-white/5">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${type === 'difficult' ? 'text-red-500' : 'text-green-500'}`}>
            {type === 'difficult' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
            {title}
        </h3>
    </div>
    <div className="divide-y divide-gray-100 dark:divide-white/5 flex-1">
        {questions.map((q: any, i: number) => (
            <div key={i} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-[#1D1D1F] dark:text-white line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: q.question_text || 'Question Text' }}></p>
                        <div className="flex gap-3 text-xs">
                            <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 size={10} /> {q.correct_count} Correct
                            </span>
                            <span className="text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle size={10} /> {q.incorrect_count} Wrong
                            </span>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">
                        Q{i + 1}
                    </div>
                </div>
            </div>
        ))}
        {questions.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">No data available</div>
        )}
    </div>
  </div>
);
