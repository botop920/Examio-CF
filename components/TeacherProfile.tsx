
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { encodeId } from '../lib/security'; 
import { useBatches, useAddBatch, useDeleteBatch } from '../hooks/useQueries';
import { User, Mail, Shield, CreditCard, Plus, Trash2, Users, Loader2, Code, ExternalLink, Copy, Share2, X, ShieldCheck, Globe, Save, Clock, CheckCircle2, Megaphone, Bell, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const TeacherProfile: React.FC<{ session: any }> = ({ session }) => {
  const { data: batches = [], isLoading: loadingBatches } = useBatches(session.user.id);
  const addBatchMutation = useAddBatch();
  const deleteBatchMutation = useDeleteBatch();
  
  const [newBatchName, setNewBatchName] = useState('');
  const [selectedBatchForEmbed, setSelectedBatchForEmbed] = useState<any>(null);
  
  // Domain Lock State
  const [allowedDomain, setAllowedDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);

  // Announcement State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '' });
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState<string | null>(null);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  // Global Portal URL (Existing)
  const globalPortalUrl = `${window.location.origin}/?teacher_id=${session.user.id}`; 

  useEffect(() => {
      if (selectedBatchForEmbed) {
          setAllowedDomain(selectedBatchForEmbed.allowed_domain || '');
      }
  }, [selectedBatchForEmbed]);

  useEffect(() => {
      fetchAnnouncements();
  }, [session.user.id]);

  const fetchAnnouncements = async () => {
      setLoadingAnnouncements(true);
      const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('teacher_id', session.user.id)
          .order('created_at', { ascending: false });
      if (data) setAnnouncements(data);
      setLoadingAnnouncements(false);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) return;

      if (isEditingAnnouncement) {
          const { error } = await supabase
              .from('announcements')
              .update({ 
                  title: newAnnouncement.title, 
                  message: newAnnouncement.message,
                  updated_at: new Date().toISOString()
              })
              .eq('id', isEditingAnnouncement);
          
          if (error) {
              toast.error('Failed to update announcement');
          } else {
              toast.success('Announcement updated successfully');
              setNewAnnouncement({ title: '', message: '' });
              setIsEditingAnnouncement(null);
              fetchAnnouncements();
          }
      } else {
          const { error } = await supabase
              .from('announcements')
              .insert([{ 
                  teacher_id: session.user.id, 
                  title: newAnnouncement.title, 
                  message: newAnnouncement.message 
              }]);
          
          if (error) {
              toast.error('Failed to post announcement');
          } else {
              toast.success('Announcement broadcasted successfully');
              setNewAnnouncement({ title: '', message: '' });
              fetchAnnouncements();
          }
      }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      if (!confirm('Are you sure you want to delete this announcement?')) return;
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) {
          toast.error('Failed to delete');
      } else {
          toast.success('Announcement deleted');
          fetchAnnouncements();
      }
  };

  const handleEditAnnouncement = (announcement: any) => {
      setNewAnnouncement({ title: announcement.title, message: announcement.message });
      setIsEditingAnnouncement(announcement.id);
      // Scroll to form
      document.getElementById('announcement-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setNewAnnouncement({ title: '', message: '' });
      setIsEditingAnnouncement(null);
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    addBatchMutation.mutate({ teacherId: session.user.id, name: newBatchName }, {
        onSuccess: () => setNewBatchName('')
    });
  };

  const handleDeleteBatch = async (id: number) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই ব্যাচটি ডিলিট করতে চান?')) return;
    deleteBatchMutation.mutate(id);
  };

  const saveAllowedDomain = async () => {
      if (!selectedBatchForEmbed) return;
      setSavingDomain(true);
      
      const domainToSave = allowedDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

      // Set status to pending when updating
      const { error } = await supabase
          .from('batches')
          .update({ 
              allowed_domain: domainToSave || null,
              domain_lock_status: 'pending' // Send for approval
          })
          .eq('id', selectedBatchForEmbed.id);

      if (error) {
          toast.error('Request failed: ' + error.message);
      } else {
          toast.success('Request sent to Super Admin!');
          // Update local state
          const updated = { 
              ...selectedBatchForEmbed, 
              allowed_domain: domainToSave || null, 
              domain_lock_status: 'pending' 
          };
          setSelectedBatchForEmbed(updated);
          // Optimistic update for batches list if needed, though react-query usually handles refetch
      }
      setSavingDomain(false);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('কপি করা হয়েছে!');
  };

  // Helper for batch URL
  const getBatchUrl = (token: string) => `${window.location.origin}/?batch_token=${token}&embed=true`;
  const getBatchEmbedCode = (token: string) => `<iframe src="${getBatchUrl(token)}" width="100%" height="800px" frameborder="0" allowfullscreen></iframe>`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
       <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white">প্রোফাইল সেটিংস</h2>
       
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Left Column: Profile Info & Integrations */}
           <div className="md:col-span-2 space-y-8">
               <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
                   <div className="h-32 bg-gradient-to-r from-primary to-blue-600"></div>
                   <div className="px-8 pb-8">
                       <div className="relative -mt-12 mb-6">
                           <div className="w-24 h-24 rounded-full bg-white dark:bg-[#1C1C1E] p-1">
                               <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold text-gray-500">
                                   {session.user.email?.[0].toUpperCase()}
                               </div>
                           </div>
                       </div>

                       <div className="space-y-6">
                           <div>
                               <label className="text-sm font-medium text-gray-500 mb-1 block">পুরো নাম</label>
                               <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-[#1D1D1F] dark:text-white font-medium">
                                   <User size={18} className="text-gray-400" />
                                   {session.user.user_metadata?.full_name || 'Not set'}
                               </div>
                           </div>
                           
                           <div>
                               <label className="text-sm font-medium text-gray-500 mb-1 block">ইমেইল</label>
                               <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-[#1D1D1F] dark:text-white font-medium">
                                   <Mail size={18} className="text-gray-400" />
                                   {session.user.email}
                               </div>
                           </div>
                       </div>
                   </div>
               </div>

               {/* Website Integration Section */}
               <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Code size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Website Integration</h3>
                            <p className="text-sm text-gray-500">আপনার নিজস্ব ওয়েবসাইটে এক্সাম পোর্টাল যুক্ত করুন</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block flex justify-between">
                                <span>Global Portal Link (All Exams)</span>
                                <a href={globalPortalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline lowercase"><ExternalLink size={12}/> preview</a>
                            </label>
                            <div className="flex gap-2">
                                <input readOnly value={globalPortalUrl} className="flex-1 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 outline-none" />
                                <button onClick={() => copyToClipboard(globalPortalUrl)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Copy size={18} className="text-gray-500" /></button>
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 italic">
                            * নির্দিষ্ট ব্যাচের জন্য আলাদা লিংক পেতে ডানপাশের ব্যাচ লিস্ট থেকে 'Code' আইকনে ক্লিক করুন।
                        </p>
                    </div>
               </div>

               {/* Broadcast Message Section */}
               <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-2xl border border-gray-100 dark:border-white/5" id="announcement-form">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400">
                            <Megaphone size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Broadcast Message</h3>
                            <p className="text-sm text-gray-500">শিক্ষার্থীদের জন্য নোটিশ বা ঘোষণা দিন</p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveAnnouncement} className="space-y-4 mb-8">
                        <div>
                            <label className="text-sm font-medium text-gray-500 mb-1 block">Title</label>
                            <input 
                                type="text" 
                                value={newAnnouncement.title}
                                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                                placeholder="e.g. আগামীকালের এক্সাম বাতিল"
                                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#1D1D1F] dark:text-white outline-none focus:border-primary transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500 mb-1 block">Message</label>
                            <textarea 
                                value={newAnnouncement.message}
                                onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                                placeholder="বিস্তারিত লিখুন..."
                                className="w-full h-24 px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#1D1D1F] dark:text-white outline-none focus:border-primary transition-all resize-none"
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                type="submit" 
                                className="flex-1 bg-primary text-white py-2 rounded-xl font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                            >
                                {isEditingAnnouncement ? <Save size={16} /> : <Megaphone size={16} />}
                                {isEditingAnnouncement ? 'Update Message' : 'Broadcast Now'}
                            </button>
                            {isEditingAnnouncement && (
                                <button 
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Previous Announcements</h4>
                        
                        {loadingAnnouncements ? (
                            <div className="text-center py-8 text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" /> Loading...</div>
                        ) : announcements.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 border border-dashed rounded-xl">No announcements yet</div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                {announcements.map((announcement) => (
                                    <div key={announcement.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 group relative">
                                        <div className="pr-16">
                                            <h5 className="font-bold text-[#1D1D1F] dark:text-white text-sm mb-1">{announcement.title}</h5>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{announcement.message}</p>
                                            <span className="text-[10px] text-gray-400 mt-2 block">
                                                {new Date(announcement.created_at).toLocaleDateString()} at {new Date(announcement.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEditAnnouncement(announcement)}
                                                className="p-1.5 bg-white dark:bg-black/30 text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                className="p-1.5 bg-white dark:bg-black/30 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
               </div>
           </div>

           {/* Right Column: Batches */}
           <div className="space-y-8">
               <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-gray-100 dark:border-white/5">
                   <div className="flex items-center justify-between mb-6">
                       <h3 className="font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                           <Users size={20} className="text-primary" />
                           আমার ব্যাচসমূহ
                       </h3>
                   </div>

                   <form onSubmit={handleAddBatch} className="flex gap-2 mb-6">
                       <input 
                           type="text" 
                           value={newBatchName}
                           onChange={(e) => setNewBatchName(e.target.value)}
                           placeholder="নতুন ব্যাচ (HSC-25)"
                           className="flex-1 h-10 px-3 rounded-lg border border-gray-300 dark:border-white/10 bg-transparent text-sm text-[#1D1D1F] dark:text-white outline-none focus:border-primary"
                       />
                       <button 
                           type="submit"
                           disabled={addBatchMutation.isPending || !newBatchName.trim()}
                           className="h-10 w-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-dark disabled:opacity-50"
                       >
                           {addBatchMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={20} />}
                       </button>
                   </form>

                   {loadingBatches ? (
                       <div className="space-y-2 animate-pulse">
                          {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 dark:bg-white/5 rounded-lg"></div>)}
                       </div>
                   ) : batches.length === 0 ? (
                       <div className="text-center py-4 text-gray-400 text-xs border border-dashed rounded-lg">
                           কোনো ব্যাচ তৈরি করা হয়নি
                       </div>
                   ) : (
                       <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                           {batches.map((batch) => (
                               <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg group">
                                   <div className="min-w-0">
                                       <span className="text-sm font-medium text-[#1D1D1F] dark:text-white truncate block">{batch.name}</span>
                                       {batch.allowed_domain && batch.domain_lock_status === 'approved' ? (
                                           <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1"><CheckCircle2 size={10} /> Connected</span>
                                       ) : batch.allowed_domain ? (
                                           <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-1"><Clock size={10} /> Pending</span>
                                       ) : null}
                                   </div>
                                   <div className="flex items-center gap-1">
                                       <button
                                            onClick={() => setSelectedBatchForEmbed(batch)}
                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors"
                                            title="Get Batch Link"
                                       >
                                           <Code size={14} />
                                       </button>
                                       <button 
                                           onClick={() => handleDeleteBatch(batch.id)}
                                           className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors"
                                       >
                                           <Trash2 size={14} />
                                       </button>
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
           </div>
       </div>

       {/* Embed Modal for Batch */}
       {selectedBatchForEmbed && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold dark:text-white">Integration: {selectedBatchForEmbed.name}</h3>
                       <button onClick={() => setSelectedBatchForEmbed(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={20} /></button>
                   </div>
                   
                   <p className="text-sm text-gray-500 mb-6">
                       এই লিংক ব্যবহার করলে শিক্ষার্থীরা শুধুমাত্র <strong>{selectedBatchForEmbed.name}</strong> ব্যাচের এক্সাম দেখতে পাবে।
                   </p>

                   <div className="space-y-5">
                       {/* Domain Lock Section */}
                       <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck size={14} /> Domain Lock (Security)
                                </label>
                                {selectedBatchForEmbed.domain_lock_status === 'approved' ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 size={10} /> Connected
                                    </span>
                                ) : selectedBatchForEmbed.domain_lock_status === 'pending' && selectedBatchForEmbed.allowed_domain ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full animate-pulse">
                                        <Clock size={10} /> Approval Pending
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                                এই ব্যাচের এক্সাম অন্য কেউ যাতে তাদের ওয়েবসাইটে এম্বেড করতে না পারে, তার জন্য আপনার ডোমেইনটি নিচে লিখুন।
                            </p>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={allowedDomain}
                                        onChange={(e) => setAllowedDomain(e.target.value)}
                                        placeholder="e.g. demo-ed-test.vercel.app" 
                                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-white dark:bg-black/30 border border-yellow-200 dark:border-yellow-900/50 text-xs text-[#1D1D1F] dark:text-white outline-none focus:border-primary"
                                    />
                                </div>
                                <button 
                                    onClick={saveAllowedDomain}
                                    disabled={savingDomain}
                                    className="h-9 px-3 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-yellow-700 transition-all flex items-center gap-1 disabled:opacity-50"
                                >
                                    {savingDomain ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                                </button>
                            </div>
                       </div>

                       <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Direct Link</label>
                            <div className="flex gap-2">
                                <input readOnly value={getBatchUrl(selectedBatchForEmbed.public_token)} className="flex-1 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-300 outline-none" />
                                <button onClick={() => copyToClipboard(getBatchUrl(selectedBatchForEmbed.public_token))} className="p-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg hover:text-primary"><Copy size={16} /></button>
                            </div>
                       </div>

                       <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Embed Code (Iframe)</label>
                            <div className="relative">
                                <textarea 
                                    readOnly 
                                    value={getBatchEmbedCode(selectedBatchForEmbed.public_token)} 
                                    className="w-full h-20 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-xs font-mono text-gray-600 dark:text-gray-300 outline-none resize-none"
                                />
                                <button 
                                    onClick={() => copyToClipboard(getBatchEmbedCode(selectedBatchForEmbed.public_token))}
                                    className="absolute top-2 right-2 p-1.5 bg-gray-100 dark:bg-white/10 rounded-md text-xs font-bold hover:text-primary"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
