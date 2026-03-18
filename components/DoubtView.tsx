import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Mic, X, Loader2, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { generateDoubtStream } from '../services/gemini';
import { LatexRenderer } from './LatexRenderer';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  image?: string;
  audio?: string;
}

interface DoubtViewProps {
  onBack?: () => void;
}

export const DoubtView: React.FC<DoubtViewProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      toast.error('ইমেজ প্রসেস করতে সমস্যা হয়েছে');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioData(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('মাইক্রোফোন অ্যাক্সেস পাওয়া যায়নি');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !selectedImage && !audioData) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage || undefined,
      audio: audioData || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setAudioData(null);
    setIsGenerating(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', text: '' }]);

    try {
      const stream = generateDoubtStream(userMessage.text, userMessage.image, userMessage.audio);
      let fullResponse = '';

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId ? { ...msg, text: fullResponse } : msg
        ));
      }
    } catch (error) {
      console.error(error);
      toast.error('এআই রেসপন্স করতে ব্যর্থ হয়েছে');
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, text: 'দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।' } : msg
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 flex items-center gap-3 shadow-md z-10">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-full transition-colors mr-1"
          >
            <X size={24} />
          </button>
        )}
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Bot size={24} className="text-amber-300" />
        </div>
        <div>
          <h2 className="font-bold text-lg">এআই টিউটর</h2>
          <p className="text-xs text-indigo-200">যেকোনো প্রশ্ন করুন, উত্তর পান সাথে সাথে</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#F8F9FA] dark:bg-black/20">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 space-y-4"
            >
              <Bot size={64} className="opacity-20" />
              <p>আপনার প্রশ্ন, ছবি বা ভয়েস মেসেজ পাঠান।<br/>আমি সাহায্য করার জন্য প্রস্তুত!</p>
            </motion.div>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-[#2C2C2E] text-gray-800 dark:text-white rounded-tl-none shadow-sm border border-gray-100 dark:border-white/5'}`}>
                {msg.image && (
                  <img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg mb-3 max-h-60 object-contain bg-black/5" />
                )}
                {msg.audio && (
                  <audio controls src={msg.audio} className="mb-3 max-w-full h-10" />
                )}
                {msg.text && (
                  <div className={msg.role === 'user' ? '' : 'prose prose-sm dark:prose-invert max-w-none'}>
                    {msg.role === 'user' ? msg.text : <LatexRenderer content={msg.text} />}
                  </div>
                )}
                {msg.role === 'ai' && isGenerating && msg.text === '' && (
                  <div className="flex gap-1 items-center h-6">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5">
        {selectedImage && (
          <div className="relative inline-block mb-3">
            <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-gray-200 dark:border-white/10" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
              <X size={14} />
            </button>
          </div>
        )}
        {audioData && (
          <div className="relative inline-block mb-3 bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-lg pr-10">
            <audio controls src={audioData} className="h-8 w-48" />
            <button onClick={() => setAudioData(null)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500">
              <X size={18} />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] rounded-2xl border border-transparent focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-[#1C1C1E] transition-all flex items-center p-1">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <ImageIcon size={20} />
            </button>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="আপনার প্রশ্ন লিখুন..."
              className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] py-3 px-2 text-sm dark:text-white"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            
            <button 
              type="button" 
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-3 transition-colors rounded-full ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
            >
              <Mic size={20} />
            </button>
          </div>
          
          <button 
            type="submit" 
            disabled={isGenerating || (!input.trim() && !selectedImage && !audioData)}
            className="h-[52px] w-[52px] shrink-0 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-indigo-600/20"
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
          </button>
        </form>
      </div>
    </div>
  );
};
