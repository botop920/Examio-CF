import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// --- BATCHES HOOKS ---

export const useBatches = (teacherId: string) => {
  return useQuery({
    queryKey: ['batches', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
  });
};

export const useAddBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teacherId, name }: { teacherId: string; name: string }) => {
      // Generate a random token for public access
      const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      
      const { data, error } = await supabase
        .from('batches')
        .insert({ 
            teacher_id: teacherId, 
            name: name.trim(),
            public_token: token
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batches', variables.teacherId] });
      toast.success('ব্যাচ তৈরি হয়েছে!');
    },
    onError: (error: any) => {
      toast.error('ব্যাচ তৈরি করতে সমস্যা হয়েছে: ' + error.message);
    },
  });
};

export const useDeleteBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('ব্যাচ ডিলিট করা হয়েছে');
    },
    onError: (error: any) => {
      toast.error('ডিলিট করতে সমস্যা হয়েছে: ' + error.message);
    },
  });
};

// --- ANNOUNCEMENTS HOOKS ---

export const useAnnouncements = (teacherId: string) => {
  return useQuery({
    queryKey: ['announcements', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          batch:batches(name)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
  });
};

export const useAddAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teacherId, batchId, message }: { teacherId: string; batchId: number | null; message: string }) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert({ 
            teacher_id: teacherId, 
            batch_id: batchId,
            message: message.trim()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.teacherId] });
      toast.success('অ্যানাউন্সমেন্ট পাঠানো হয়েছে!');
    },
    onError: (error: any) => {
      toast.error('অ্যানাউন্সমেন্ট পাঠাতে সমস্যা হয়েছে: ' + error.message);
    },
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, message, batchId }: { id: string; message: string; batchId: number | null }) => {
      const { data, error } = await supabase
        .from('announcements')
        .update({ 
            message: message.trim(),
            batch_id: batchId,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('অ্যানাউন্সমেন্ট আপডেট করা হয়েছে!');
    },
    onError: (error: any) => {
      toast.error('আপডেট করতে সমস্যা হয়েছে: ' + error.message);
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('অ্যানাউন্সমেন্ট ডিলিট করা হয়েছে');
    },
    onError: (error: any) => {
      toast.error('ডিলিট করতে সমস্যা হয়েছে: ' + error.message);
    },
  });
};
