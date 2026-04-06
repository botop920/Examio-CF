
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase, formatError } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Upload, Check, Loader2, Save, Trash2, Library, Search, CheckSquare, Square, ArrowLeft, Type, Edit, X, Award, Filter, ChevronDown, Layers, Hash, ArrowRight, SlidersHorizontal, AlertTriangle, Bot, FileText, Wand2, StopCircle, Minus, Maximize2, Play, Pause, Plus, Image as ImageIcon } from 'lucide-react';
import { LatexText } from './LatexText';
import toast from 'react-hot-toast';
import * as pdfjsLibProxy from 'pdfjs-dist';

// Configure PDF.js worker using Cloudflare CDN for stability
const pdfjsLib = (pdfjsLibProxy as any).default || pdfjsLibProxy;
if (pdfjsLib && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface ExamStudioProps {
  onExamCreated: () => void;
}

// Utility to clean and parse JSON robustly
const sanitizeAndParseJson = (str: string) => {
    if (!str) return null;
    try {
        // 1. Remove Markdown code blocks
        let clean = str.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 2. Find valid JSON envelope
        const firstOpen = clean.indexOf('[');
        const firstOpenObj = clean.indexOf('{');
        const start = (firstOpen !== -1 && (firstOpenObj === -1 || firstOpen < firstOpenObj)) ? firstOpen : firstOpenObj;
        
        const lastClose = clean.lastIndexOf(']');
        const lastCloseObj = clean.lastIndexOf('}');
        const end = (lastClose !== -1 && (lastCloseObj === -1 || lastClose > lastCloseObj)) ? lastClose : lastCloseObj;

        if (start !== -1 && end !== -1) {
            clean = clean.substring(start, end + 1);
        }

        // 3. Attempt Parse
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error (First Pass):", e);
        // Fallback: Try to fix escaped characters for LaTeX if that's the issue
        try {
            // This is a risky regex but handles the specific "Invalid escape character" often caused by single backslashes in LaTeX
            // It tries to double escape backslashes that aren't already part of a valid escape sequence.
            const clean = str.replace(/```json/g, '').replace(/```/g, '').trim();
            // Note: A true robust fix requires a parser state machine, but we rely on prompt engineering mostly.
            return JSON.parse(clean); 
        } catch (e2) {
            return null;
        }
    }
};

export const ExamStudio: React.FC<ExamStudioProps> = ({ onExamCreated }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [extractingStatus, setExtractingStatus] = useState<'idle' | 'extracting' | 'completed'>('idle');
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0, total: 0 });
  
  const [generatingSolutions, setGeneratingSolutions] = useState(false); 
  const [progress, setProgress] = useState(0); 
  const [progressStatus, setProgressStatus] = useState('');
  
  // Processing Refs
  const stopProcessingRef = useRef(false);
  const isPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // UI Refs
  const formRef = useRef<HTMLDivElement>(null);
  
  // New Feature: Background Mode
  const [isMinimized, setIsMinimized] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState(''); 
  const [topic, setTopic] = useState('');     
  const [batch, setBatch] = useState('All');
  const [examType, setExamType] = useState('mcq');
  const [duration, setDuration] = useState('30'); 
  const [perQuestionTime, setPerQuestionTime] = useState(''); 
  const [defaultMarks, setDefaultMarks] = useState('1'); 
  const [negativeMarking, setNegativeMarking] = useState('0'); 
  const [aiGradingEnabled, setAiGradingEnabled] = useState(false);
  
  const [availBatches, setAvailBatches] = useState<any[]>([]); 
  const [files, setFiles] = useState<File[]>([]); // Changed to array
  const [includeExplanation, setIncludeExplanation] = useState(true); 
  
  // AI Extraction Options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isImportantEnabled, setIsImportantEnabled] = useState(false);
  const [importantCount, setImportantCount] = useState('');
  const [isDifficultyEnabled, setIsDifficultyEnabled] = useState(false);
  const [trickyCount, setTrickyCount] = useState('');
  const [conceptualCount, setConceptualCount] = useState('');
  const [hardCount, setHardCount] = useState('');
  const [generateVariations, setGenerateVariations] = useState(false);

  // Question State
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeMethod, setActiveMethod] = useState<'none' | 'ai' | 'bank' | 'manual'>('none');
  
  // Builder/Edit Temp States
  const [editingId, setEditingId] = useState<number | null>(null); 
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>(['', '', '', '']);
  const [newQuestionCorrect, setNewQuestionCorrect] = useState('');
  const [newQuestionExplanation, setNewQuestionExplanation] = useState(''); 
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Image State for Manual Entry
  const [questionImage, setQuestionImage] = useState<string | null>(null);
  const [optionImages, setOptionImages] = useState<(string | null)[]>(['', '', '', ''].map(() => null));
  
  // File Objects for Upload
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [optionFiles, setOptionFiles] = useState<(File | null)[]>(['', '', '', ''].map(() => null));
  const [uploading, setUploading] = useState(false);

  // AI Preview State
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [selectedGenIndices, setSelectedGenIndices] = useState<Set<number>>(new Set());
  const [showGenPreview, setShowGenPreview] = useState(false);
  
  // --- BANK STATE (Pagination Optimized) ---
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]); // Current page items
  const [selectedBankIds, setSelectedBankIds] = useState<Set<number>>(new Set());
  
  // Bank Filters & Pagination
  const [bankSearch, setBankSearch] = useState('');
  const [bankFilterSubject, setBankFilterSubject] = useState('All');
  const [bankFilterType, setBankFilterType] = useState('All'); 
  const [bankPage, setBankPage] = useState(0);
  const [bankHasMore, setBankHasMore] = useState(true);
  const [bankLoading, setBankLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastQuestionElementRef = useCallback((node: HTMLDivElement) => {
      if (bankLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && bankHasMore) {
              setBankPage(prev => prev + 1);
          }
      });
      if (node) observer.current.observe(node);
  }, [bankLoading, bankHasMore]);

  // Request Notification Permission
  useEffect(() => {
      if ("Notification" in window && Notification.permission !== "granted") {
          Notification.requestPermission();
      }
  }, []);

  useEffect(() => {
    const fetchB = async () => {
        const { data: { user } } = await supabase.auth.getUser(); // Get user
        if (!user) return; 

        const { data } = await supabase.from('batches')
            .select('name')
            .eq('teacher_id', user.id) // Filter
            .order('created_at');
        if (data) setAvailBatches(data);
    };
    fetchB();
  }, []);

  // --- FILE HANDLING ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles = Array.from(e.target.files);
          // Append new files
          setFiles(prev => [...prev, ...newFiles]);
      }
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
      setFiles([]);
  };

  // Fetch bank questions when page or filters change
  useEffect(() => {
      if (showBankModal) {
          fetchBankQuestions(bankPage);
      }
  }, [bankPage, showBankModal]); 

  // Filter effect: Reset page to 0 when filters change
  useEffect(() => {
      if (showBankModal) {
          setBankQuestions([]);
          setBankPage(0);
          setBankHasMore(true);
          fetchBankQuestions(0, true);
      }
  }, [bankSearch, bankFilterSubject, bankFilterType]);

  const fetchBankQuestions = async (page: number, isNewFilter = false) => {
      setBankLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const PAGE_SIZE = 10;
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
          .from('question_bank')
          .select('*')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

      if (bankFilterSubject !== 'All') {
          query = query.eq('subject', bankFilterSubject);
      }
      if (bankFilterType !== 'All') {
          query = query.eq('question_type', bankFilterType);
      }
      if (bankSearch) {
          query = query.ilike('question_text', `%${bankSearch}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
          if (isNewFilter || page === 0) {
              setBankQuestions(data);
          } else {
              setBankQuestions(prev => {
                  const existingIds = new Set(prev.map((q: any) => q.id));
                  const newItems = data.filter((q: any) => !existingIds.has(q.id));
                  return [...prev, ...newItems];
              });
          }
          setBankHasMore(data.length >= PAGE_SIZE);
      }
      setBankLoading(false);
  };

  const fetchUniqueSubjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) return;
      
      const { data } = await supabase.from('question_bank').select('subject').eq('teacher_id', user.id).limit(100);
      if(data) {
          const subjects = Array.from(new Set(data.map((d:any) => d.subject).filter(Boolean))) as string[];
          setAvailableSubjects(['All', ...subjects.filter(s => s !== 'All')]);
      }
  };

  const openBankModal = async () => {
      setShowBankModal(true);
      setBankSearch('');
      setBankFilterSubject('All');
      setBankFilterType('All');
      setBankPage(0);
      setBankQuestions([]);
      setSelectedBankIds(new Set());
      fetchUniqueSubjects();
      fetchBankQuestions(0, true);
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  };

  const pdfPageToImage = async (page: any): Promise<string> => {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return "";
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      return base64.split(',')[1];
  };

  const processVisualContent = async (
      visuals: { data: string, mimeType: string }[], 
      batchId: number,
      onQuestionFound: (q: any) => void,
      onTokenUpdate: (usage: { inputTokens: number, outputTokens: number }) => void
  ) => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contextPrompt = `
      Context:
      Subject: ${subject}
      Chapter: ${chapter}
      Topic: ${topic}
      
      User Preferences:
      ${isImportantEnabled && importantCount ? `- Prioritize extracting at least ${importantCount} MOST IMPORTANT questions (high exam probability).` : ''}
      ${isDifficultyEnabled && (trickyCount || conceptualCount || hardCount) ? `- Difficulty Distribution: ${trickyCount ? trickyCount + ' tricky, ' : ''}${conceptualCount ? conceptualCount + ' conceptual, ' : ''}${hardCount ? hardCount + ' hard' : ''} questions.` : ''}
      ${generateVariations ? `- VARIATION MODE ENABLED: You MUST NOT output the original questions found in the image. Instead, for every question you identify that matches the user's criteria (Important, Tricky, etc.), you MUST generate a VARIATION of it. This variation must have the EXACT same language and logic, but DIFFERENT numerical values or data points. CRITICAL: You MUST RE-CALCULATE the correct answer and ALL options (A, B, C, D) based on the new values. DO NOT COPY THE ORIGINAL OPTIONS FROM THE IMAGE. Ensure the options are plausible and the correct answer is accurately reflected in the options list. Only output the variations as the final questions. Do not output the original questions from the image.` : ''}
      `;

      let promptText = "";
      if (examType === 'mcq') {
          promptText = `
          Task: Analyze ALL ${visuals.length} images provided in this batch and extract QUESTIONS.
          ${contextPrompt}
          
          CRITICAL RULES FOR EXTRACTION:
          1. **LANGUAGE PRESERVATION**: DETECT the language of the text in the images (e.g., Bengali, English). YOU MUST OUTPUT 'question_text', 'options', and 'explanation' IN THE EXACT SAME LANGUAGE AS THE SOURCE. DO NOT TRANSLATE.
          2. Iterate through EVERY image. Extract ALL questions found.
          3. **IMPORTANT & DIFFICULTY**: If user requested specific counts for important/tricky/conceptual/hard questions, prioritize finding them. If the images don't have enough, GENERATE high-quality questions of those types based on the provided context.
          4. **VARIATION MODE**: If enabled, for each suitable question found (especially those with numerical values), generate a variation with different data values. Ensure options and correct answer are updated to match the new values.
          5. **GRAPH/DIAGRAM/FIGURES**: If a question relies on a graph, diagram, or figure shown in the image, YOU MUST EXTRACT IT. 
             - Set the field "requires_diagram": true.
             - Transcribe the text of the question accurately.
          6. **AUTO-GENERATE OPTIONS**: If a question is found in the image but it has NO options (it is a standard question) BUT I need MCQ:
             - You MUST GENERATE 4 plausible academic options (A, B, C, D) for it IN THE SAME LANGUAGE.
             - Identify the correct answer among your generated options.
          7. **EXISTING MCQs**: If the question in the image already has options, extract them exactly.
          8. Solve for 'correct_answer'. It MUST match one of the options exactly.
          9. Convert math to LaTeX. IMPORTANT: Double escape backslashes (e.g. \\\\frac, \\\\vec) for valid JSON string. ALWAYS WRAP MATH IN $...$ (e.g. $\\\\frac{a}{b}$).
          
          Output Format: NDJSON (Newline Delimited JSON).
          - Output EACH question as a SINGLE LINE of valid JSON.
          - DO NOT wrap the whole output in a list [].
          - DO NOT use markdown code blocks.
          - DO NOT use commas between objects.
          
          Example Line:
          {"question_text": "...", "options": ["...", "..."], "correct_answer": "...", ${includeExplanation ? '"explanation": "...", ' : ''}"requires_diagram": false}
          ${includeExplanation ? 'CRITICAL: Include a brief explanation for the correct answer in the detected language.' : 'CRITICAL: DO NOT include an explanation field in the JSON output.'}
          `;
      } else {
          promptText = `
          Task: Analyze ALL ${visuals.length} images provided and extract Creative/Written Questions.
          ${contextPrompt}
          
          Guidelines:
          1. **LANGUAGE PRESERVATION**: DETECT the language of the text in the images. OUTPUT 'question_text' IN THE EXACT SAME LANGUAGE AS THE SOURCE. DO NOT TRANSLATE.
          2. CRITICAL: Iterate through EVERY image.
          3. **IMPORTANT & DIFFICULTY**: If user requested specific counts for important/tricky/conceptual/hard questions, prioritize finding them. If the images don't have enough, GENERATE high-quality questions of those types based on the provided context.
          4. **VARIATION MODE**: If enabled, for each suitable question found, generate a variation with different data values while keeping the logic same.
          5. **GRAPH/DIAGRAM/FIGURES**: If a question relies on a graph, diagram, or figure, EXTRACT IT and set "requires_diagram": true.
          6. IGNORE theory/definitions unless they are numbered questions.
          7. Convert math to LaTeX. IMPORTANT: Double escape backslashes (e.g. \\\\frac, \\\\vec). ALWAYS WRAP MATH IN $...$ (e.g. $\\\\frac{a}{b}$).
          
          Output Format: NDJSON (Newline Delimited JSON).
          - Output EACH question as a SINGLE LINE of valid JSON.
          
          Example Line:
          {"question_text": "...", "requires_diagram": false}
          `;
      }

      try {
          const parts: any[] = [];
          visuals.forEach(v => { 
              parts.push({ inlineData: { data: v.data, mimeType: v.mimeType } }); 
          });
          parts.push({ text: promptText });

          const result = await ai.models.generateContentStream({
              model: 'gemini-3.1-flash-lite-preview', 
              contents: [{ role: 'user', parts: parts }],
              config: { 
                  temperature: 0.1,
                  // @ts-ignore
                  thinkingConfig: { thinkingBudget: 0 } 
              }
          });

          let buffer = '';
          
          for await (const chunk of result) {
              if (stopProcessingRef.current) break;

              const chunkText = chunk.text || '';
              buffer += chunkText;

              // Extract Usage Metadata if available
              if (chunk.usageMetadata) {
                  onTokenUpdate({
                      inputTokens: chunk.usageMetadata.promptTokenCount || 0,
                      outputTokens: chunk.usageMetadata.candidatesTokenCount || 0
                  });
              }

              // Try to parse complete lines
              let newlineIndex;
              while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                  const line = buffer.slice(0, newlineIndex).trim();
                  buffer = buffer.slice(newlineIndex + 1);

                  if (line) {
                      try {
                          // Clean potential markdown artifacts if model ignores instruction
                          const cleanLine = line.replace(/```json/g, '').replace(/```/g, '').replace(/^,/, '').replace(/,$/, '').trim();
                          if (cleanLine.startsWith('{') && cleanLine.endsWith('}')) {
                              const q = JSON.parse(cleanLine);
                              
                              // Normalize Question
                              let correct = q.correct_answer || '';
                              const options = Array.isArray(q.options) ? q.options : [];
                              
                              if (correct && options.length > 0) {
                                  if (/^\d+$/.test(correct)) {
                                      const idx = parseInt(correct);
                                      if (options[idx]) correct = options[idx];
                                  }
                                  else if (/^[A-D]$/i.test(correct.trim()) && !options.includes(correct)) {
                                      const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                                      const idx = map[correct.trim()];
                                      if (options[idx]) correct = options[idx];
                                  }
                              }

                              const normalizedQ = {
                                  id: Date.now() + Math.random(),
                                  text: q.question_text || "Untitled Question",
                                  type: examType,
                                  options: examType === 'mcq' ? options : [],
                                  correct: examType === 'mcq' ? correct : '',
                                  explanation: includeExplanation ? (q.explanation || '') : '',
                                  marks: parseFloat(defaultMarks) || 1,
                                  hasDiagram: !!q.requires_diagram
                              };

                              if (normalizedQ.text && normalizedQ.text !== "Untitled Question") {
                                  onQuestionFound(normalizedQ);
                              }
                          }
                      } catch (e) {
                          // Incomplete line or parsing error, keep in buffer or discard if malformed
                          console.warn("Stream parse warning:", e);
                      }
                  }
              }
          }
          
          // Process remaining buffer
          if (buffer.trim()) {
               try {
                  const cleanLine = buffer.replace(/```json/g, '').replace(/```/g, '').replace(/^,/, '').replace(/,$/, '').trim();
                  if (cleanLine.startsWith('{') && cleanLine.endsWith('}')) {
                      const q = JSON.parse(cleanLine);
                      // ... (Same normalization logic - refactor if needed, but keeping inline for safety)
                       let correct = q.correct_answer || '';
                              const options = Array.isArray(q.options) ? q.options : [];
                              if (correct && options.length > 0) {
                                  if (/^\d+$/.test(correct)) {
                                      const idx = parseInt(correct);
                                      if (options[idx]) correct = options[idx];
                                  }
                                  else if (/^[A-D]$/i.test(correct.trim()) && !options.includes(correct)) {
                                      const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                                      const idx = map[correct.trim()];
                                      if (options[idx]) correct = options[idx];
                                  }
                              }
                              const normalizedQ = {
                                  id: Date.now() + Math.random(),
                                  text: q.question_text || "Untitled Question",
                                  type: examType,
                                  options: examType === 'mcq' ? options : [],
                                  correct: examType === 'mcq' ? correct : '',
                                  explanation: includeExplanation ? (q.explanation || '') : '',
                                  marks: parseFloat(defaultMarks) || 1,
                                  hasDiagram: !!q.requires_diagram
                              };
                              if (normalizedQ.text) onQuestionFound(normalizedQ);
                  }
               } catch (e) {}
          }

      } catch (err) {
          console.error(`Error processing batch ${batchId}`, err);
          toast.error(`Batch ${batchId + 1} failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
  };

  const extractImagesFromPdf = async (file: File): Promise<string[]> => {
      try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          const totalPages = pdf.numPages;
          const images: string[] = [];
          
          for (let i = 1; i <= totalPages; i++) {
              if (stopProcessingRef.current) break;
              const page = await pdf.getPage(i);
              const img = await pdfPageToImage(page);
              images.push(img);
              page.cleanup();
          }
          pdf.destroy();
          return images;
      } catch (e) {
          console.error("PDF Extraction Error", e);
          toast.error(`Could not read PDF: ${file.name}`);
          return [];
      }
  };

  const confirmGenSelection = () => {
      // Placeholder for future implementation
      console.log("Confirm selection");
      setShowGenPreview(false);
  };

  const handleAiExtraction = async () => {
    if (files.length === 0) return;
    setLoading(true); 
    setAiProcessing(true); 
    setExtractingStatus('extracting');
    setProgress(0); 
    setProgressStatus("Initializing...");
    setIsMinimized(false); 
    setTokenUsage({ input: 0, output: 0, total: 0 });
    
    stopProcessingRef.current = false; 
    isPausedRef.current = false; 
    setIsPaused(false);

    try {
        const allVisuals: { data: string, mimeType: string }[] = [];
        
        // 1. Pre-process all files to extract visual data
        for (let i = 0; i < files.length; i++) {
            if (stopProcessingRef.current) break;
            const file = files[i];
            setProgressStatus(`Reading file ${i + 1}/${files.length}: ${file.name}...`);
            
            if (file.type === 'application/pdf') {
                const pdfImages = await extractImagesFromPdf(file);
                pdfImages.forEach(img => allVisuals.push({ data: img, mimeType: 'image/jpeg' }));
            } else {
                const imgBase64 = await fileToBase64(file);
                allVisuals.push({ data: imgBase64, mimeType: file.type || 'image/jpeg' });
            }
            // Visual Progress up to 20%
            setProgress(((i + 1) / files.length) * 20);
        }

        if (stopProcessingRef.current) return;

        if (allVisuals.length === 0) {
            toast.error("No valid visual content found.");
            setAiProcessing(false); setLoading(false); setExtractingStatus('idle');
            return;
        }

        // 2. CHUNK PROCESSING (Parallel)
        const CHUNK_SIZE = 6; 
        const chunks = [];
        for (let i = 0; i < allVisuals.length; i += CHUNK_SIZE) {
            chunks.push(allVisuals.slice(i, i + CHUNK_SIZE));
        }

        setProgressStatus(`Analyzing ${allVisuals.length} images...`);
        
        let completedChunks = 0;
        const totalChunks = chunks.length;
        
        // Process chunks sequentially to maintain order and token tracking
        // (Parallel is possible but sequential feels smoother for "streaming" list growth)
        for (let i = 0; i < chunks.length; i++) {
            if (stopProcessingRef.current) break;
            
            await processVisualContent(
                chunks[i], 
                i, 
                (newQuestion) => {
                    // Real-time Update: Prepend to list
                    setQuestions(prev => [newQuestion, ...prev]);
                },
                (usage) => {
                    setTokenUsage(prev => ({
                        input: prev.input + usage.inputTokens,
                        output: prev.output + usage.outputTokens,
                        total: prev.total + usage.inputTokens + usage.outputTokens
                    }));
                }
            );

            completedChunks++;
            const processingProgress = 20 + ((completedChunks / totalChunks) * 80);
            setProgress(processingProgress);
        }

        if (!stopProcessingRef.current) {
            toast.success(`Extraction Complete!`);
            setExtractingStatus('completed');
        }

    } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Error processing files");
        setExtractingStatus('idle');
    } finally {
        setAiProcessing(false);
        setLoading(false);
        // Reset status after delay
        setTimeout(() => {
            if (extractingStatus !== 'extracting') setExtractingStatus('idle');
        }, 5000);
    }
  };

  const togglePause = () => { isPausedRef.current = !isPausedRef.current; setIsPaused(isPausedRef.current); };
  const stopProcessing = () => { stopProcessingRef.current = true; setAiProcessing(false); setLoading(false); setExtractingStatus('idle'); setProgressStatus('Stopped by user'); toast("Processing stopped by user"); };

  const handleGenerateSolutions = async () => {
      if (questions.length === 0) return;
      setGeneratingSolutions(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const BATCH_SIZE = 5;
          const updatedQuestions = [...questions];
          let completedCount = 0;
          for (let i = 0; i < questions.length; i += BATCH_SIZE) {
              const chunk = questions.slice(i, i + BATCH_SIZE);
              const payload = chunk.map((q, idx) => ({ id: i + idx, text: q.text }));
              toast.loading(`Solving... (${completedCount}/${questions.length})`, { id: 'sol-gen' });
              const prompt = `Task: Solve. INPUT: ${JSON.stringify(payload)} OUTPUT: JSON Array [{ "id": number, "explanation": "..." }] LaTeX for math (WRAP IN $...$). Double escape backslashes. KEEP ORIGINAL LANGUAGE.`;
              try {
                  const response = await ai.models.generateContent({ 
                      model: 'gemini-3.1-flash-lite-preview', 
                      contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                      config: { 
                          responseMimeType: 'application/json',
                          // @ts-ignore
                          thinkingConfig: { thinkingBudget: 0 }
                      } 
                  });
                  const json = sanitizeAndParseJson(response.text || '[]');
                  if (Array.isArray(json)) { json.forEach((item: any) => { if (updatedQuestions[item.id]) { updatedQuestions[item.id].explanation = item.explanation; } }); setQuestions([...updatedQuestions]); }
                  completedCount += chunk.length;
              } catch (batchError) { console.error("Batch failed", batchError); }
          }
          toast.dismiss('sol-gen'); toast.success('Solutions Generated!');
      } catch (e: any) { toast.dismiss('sol-gen'); toast.error("Generation failed: " + e.message); } finally { setGeneratingSolutions(false); }
  };

  // --- MANUAL ENTRY FUNCTIONS ---

  const handleImageUpload = (file: File, type: 'question' | 'option', index?: number) => {
      if (!file) return;
      
      // Store File object for upload
      if (type === 'question') {
          setQuestionFile(file);
      } else if (type === 'option' && typeof index === 'number') {
          const newFiles = [...optionFiles];
          newFiles[index] = file;
          setOptionFiles(newFiles);
      }

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
          const base64 = reader.result as string;
          if (type === 'question') {
              setQuestionImage(base64);
          } else if (type === 'option' && typeof index === 'number') {
              const newImgs = [...optionImages];
              newImgs[index] = base64;
              setOptionImages(newImgs);
          }
      };
      reader.readAsDataURL(file);
  };

  const handleOptionAdd = () => {
      setNewQuestionOptions([...newQuestionOptions, '']);
      setOptionImages([...optionImages, null]);
      setOptionFiles([...optionFiles, null]);
  };

  const handleOptionRemove = (index: number) => {
      if (newQuestionOptions.length <= 2) {
          toast.error('Minimum 2 options required');
          return;
      }
      const newOpts = newQuestionOptions.filter((_, i) => i !== index);
      const newImgs = optionImages.filter((_, i) => i !== index);
      const newFiles = optionFiles.filter((_, i) => i !== index);
      
      setNewQuestionOptions(newOpts);
      setOptionImages(newImgs);
      setOptionFiles(newFiles);
      
      // If correct answer was removed, clear it
      if (newQuestionCorrect === newQuestionOptions[index]) {
          setNewQuestionCorrect('');
      }
  };

  const handleEnhanceQuestion = async () => {
      if (!newQuestionText.trim()) return;
      setIsEnhancing(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Task: Enhance raw question to MCQ. Input: "${newQuestionText}". Rules: Fix grammar, Math to LaTeX (WRAP IN $...$), Generate 4 options, Solve${includeExplanation ? ', Write explanation' : ''}. Output JSON: { "question_text": "...", "options": ["..."], "correct_answer": "..."${includeExplanation ? ', "explanation": "..."' : ''} }. IMPORTANT: Escape LaTeX backslashes (e.g. \\\\vec, \\\\frac). KEEP ORIGINAL LANGUAGE.`;
          const response = await ai.models.generateContent({ 
              model: 'gemini-3.1-flash-lite-preview', 
              contents: [{ role: 'user', parts: [{ text: prompt }] }], 
              config: { 
                  responseMimeType: 'application/json',
                  // @ts-ignore
                  thinkingConfig: { thinkingBudget: 0 }
              } 
          });
          const json = sanitizeAndParseJson(response.text || '{}');
          if (json && json.question_text) {
              setNewQuestionText(json.question_text);
              if (Array.isArray(json.options) && json.options.length > 0) {
                  setNewQuestionOptions(json.options);
                  setOptionImages(new Array(json.options.length).fill(null));
                  setOptionFiles(new Array(json.options.length).fill(null));
              }
              if (json.correct_answer) setNewQuestionCorrect(json.correct_answer);
              setNewQuestionExplanation(includeExplanation ? (json.explanation || '') : '');
              toast.success("Question Enhanced & Auto-filled!");
          } else {
              toast.error("Could not enhance. Please try again.");
          }
      } catch (e: any) { console.error(e); toast.error("Enhancement failed: " + e.message); } finally { setIsEnhancing(false); }
  };

  // --- RENDER HELPERS ---
  const renderExtractionStatus = () => {
      if (extractingStatus === 'idle' && !aiProcessing) return null;

      return (
          <div className="mb-8 bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-primary/20 shadow-lg shadow-primary/5 animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                              <Sparkles className="animate-pulse" size={20} />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-[#1C1C1E] animate-bounce"></div>
                      </div>
                      <div>
                          <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                              AI Extraction in Progress
                              <span className="text-xs font-mono bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-500">
                                  {progress.toFixed(0)}%
                              </span>
                          </h3>
                          <p className="text-sm text-gray-500">{progressStatus}</p>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                      {/* Token Counter */}
                      <div className="hidden md:flex flex-col items-end text-xs font-mono text-gray-400">
                          <div className="flex items-center gap-1.5">
                              <span>IN: {tokenUsage.input}</span>
                              <span className="w-px h-3 bg-gray-300 dark:bg-white/20"></span>
                              <span>OUT: {tokenUsage.output}</span>
                          </div>
                          <div className="text-primary font-bold">TOTAL: {tokenUsage.total}</div>
                      </div>

                      <button 
                          onClick={stopProcessing}
                          className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Stop"
                      >
                          <StopCircle size={18} />
                      </button>
                  </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                      className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300 ease-out relative"
                      style={{ width: `${progress}%` }}
                  >
                      <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite]"></div>
                  </div>
              </div>
          </div>
      );
  };

  const renderSkeletonCard = () => (
      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm animate-pulse">
          <div className="flex justify-between items-start mb-4">
              <div className="flex gap-3 w-full">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10 shrink-0"></div>
                  <div className="space-y-3 w-full">
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2"></div>
                  </div>
              </div>
          </div>
          <div className="space-y-2 mt-6 pl-11">
              {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg w-full"></div>
              ))}
          </div>
      </div>
  );
  
  const toggleBankSelection = (id: number) => { const newSet = new Set(selectedBankIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedBankIds(newSet); };
  const selectAllLoaded = () => { if (selectedBankIds.size === bankQuestions.length) setSelectedBankIds(new Set()); else setSelectedBankIds(new Set(bankQuestions.map(q => q.id))); };
  
  const addFromBank = () => {
      const selected = bankQuestions.filter(q => selectedBankIds.has(q.id));
      const mapped = selected.map(q => ({ id: Date.now() + Math.random(), text: q.question_text, type: q.question_type, options: q.options, correct: q.correct_answer, explanation: q.explanation || '', marks: parseFloat(defaultMarks) || 1 }));
      // Prepend imported questions to the top
      setQuestions([...mapped, ...questions]); 
      setShowBankModal(false); setActiveMethod('none'); setSelectedBankIds(new Set());
  };
  
  const handleEditQuestion = (question: any) => { 
      setEditingId(question.id); 
      setNewQuestionText(question.text); 
      setNewQuestionOptions([...question.options]); 
      setNewQuestionCorrect(question.correct); 
      setNewQuestionExplanation(question.explanation || ''); 
      setQuestionImage(null); // Reset new uploads view (keeps text image tags)
      setQuestionFile(null);
      setOptionImages(new Array(question.options.length).fill(null));
      setOptionFiles(new Array(question.options.length).fill(null));
      setActiveMethod('manual'); 
      
      // Auto-scroll to form with better reliability than window.scrollTo
      setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
  };

  const uploadImageToSupabase = async (file: File) => {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const path = `question-images/${fileName}`;
      
      const { error } = await supabase.storage.from('exam-assets').upload(path, file);
      
      if (error) {
          console.error("Supabase Upload Error:", error);
          throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage.from('exam-assets').getPublicUrl(path);
      return publicUrl;
  };

  const saveQuestion = async () => { 
      if (!newQuestionText) return; 
      
      setUploading(true);
      
      try {
          // 1. Upload Question Image
          let qImageUrl = null;
          if (questionFile) {
              qImageUrl = await uploadImageToSupabase(questionFile);
          }

          // 2. Upload Option Images
          const optionImageUrls = await Promise.all(optionFiles.map(async (file) => {
              if (file) {
                  return await uploadImageToSupabase(file);
              }
              return null;
          }));

          // 3. Construct Final HTML Text
          let finalText = newQuestionText;
          if (qImageUrl) {
              finalText += ` <br/><img src="${qImageUrl}" class="max-h-60 my-3 rounded-lg border border-gray-200" />`;
          }

          let finalOptions = [...newQuestionOptions];
          if (examType === 'mcq') {
              finalOptions = finalOptions.map((opt, idx) => {
                  let optText = opt;
                  if (optionImageUrls[idx]) {
                      optText += ` <br/><img src="${optionImageUrls[idx]}" class="max-h-24 my-2 rounded border border-gray-200" />`;
                  }
                  return optText;
              });
          }

          // Fix Correct Answer text if it matches an option that got updated with an image
          let finalCorrect = newQuestionCorrect;
          if (examType === 'mcq') {
              const correctIdx = newQuestionOptions.indexOf(newQuestionCorrect);
              if (correctIdx !== -1) {
                  finalCorrect = finalOptions[correctIdx];
              }
          }

          const newQ = { 
              id: editingId || Date.now(), 
              text: finalText, 
              type: examType, 
              options: examType === 'mcq' ? finalOptions : [], 
              correct: finalCorrect, 
              explanation: newQuestionExplanation, 
              marks: parseFloat(defaultMarks) || 1 
          }; 
          
          if (editingId) { 
              setQuestions(questions.map(q => q.id === editingId ? newQ : q)); 
              setEditingId(null); 
          } else { 
              // Prepend newly created question to the top
              setQuestions([newQ, ...questions]); 
          } 
          
          // Reset Form
          setNewQuestionText(''); 
          setNewQuestionOptions(['', '', '', '']); 
          setNewQuestionCorrect(''); 
          setNewQuestionExplanation(''); 
          setQuestionImage(null);
          setQuestionFile(null);
          setOptionImages(['', '', '', ''].map(() => null));
          setOptionFiles(['', '', '', ''].map(() => null));
          setActiveMethod('none'); 

      } catch (error: any) {
          toast.error("Image upload failed: " + error.message);
      } finally {
          setUploading(false);
      }
  };

  const handleSaveExam = async () => {
      if (questions.length === 0) {
          toast.error("Add at least one question.");
          return;
      }
      
      const invalidMcqs = questions.filter(q => q.type === 'mcq' && !q.correct);
      if (invalidMcqs.length > 0) {
          toast.error(`${invalidMcqs.length} MCQ(s) are missing a correct answer! Please fix them.`);
          return;
      }

      if (!title || !subject) {
          toast.error("Title and Subject are required.");
          return;
      }

      setLoading(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
              toast.error('Please login to save exams.');
              setLoading(false);
              return;
          }
          
          const cleanDuration = parseInt(duration) || 30;
          const cleanPerQuestion = perQuestionTime ? parseInt(perQuestionTime) || null : null;
          const cleanMarks = parseFloat(defaultMarks) || 1;
          const cleanNegative = parseFloat(negativeMarking) || 0;

          // 1. Insert Exam Metadata
          const { data: examData, error: examError } = await supabase
              .from('exams')
              .insert({
                  title: title.trim() || 'Untitled Exam', 
                  subject: subject.trim() || 'General', 
                  batch: batch === 'All' ? 'All' : batch, 
                  type: examType, 
                  teacher_id: user.id, 
                  status: 'draft', 
                  start_time: null, 
                  duration_minutes: cleanDuration,
                  per_question_duration: cleanPerQuestion,
                  default_marks: cleanMarks,
                  negative_marking: cleanNegative,
                  ai_grading_enabled: aiGradingEnabled,
                  question_count: questions.length
              })
              .select().single();

          if (examError) throw examError;
          if (!examData) throw new Error("Failed to create exam record");

          // 2. Prepare Payloads
          const qPayload = questions.map(q => ({
              exam_id: examData.id,
              teacher_id: user.id,
              question_text: q.text || "Empty Question", 
              question_type: q.type || examType,
              options: Array.isArray(q.options) 
                  ? q.options.map((o: any) => o ? String(o).trim() : "") 
                  : [],
              correct_answer: q.correct || '',
              explanation: q.explanation || null,
              marks: typeof q.marks === 'number' && !isNaN(q.marks) ? q.marks : cleanMarks
          }));

          const bankPayload = qPayload.map(q => ({
              teacher_id: user.id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              subject: subject || 'General',
              chapter: chapter || null,
              topic: topic || null,
              difficulty: 'medium'
          }));

          // 3. Parallel Insert
          await Promise.all([
              supabase.from('questions').insert(qPayload),
              supabase.from('question_bank').insert(bankPayload)
          ]);

          toast.success('এক্সাম সেভ হয়েছে!');
          onExamCreated();
      } catch (error: any) {
          console.error("Save failed:", error);
          toast.error('Error saving exam: ' + formatError(error));
      } finally {
          setLoading(false);
      }
  };

  const FilterContent = () => (
      <div className="space-y-8 h-full flex flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto pb-4">
              <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Filter size={12} /> Filters
                  </h3>
                  <div className="space-y-4">
                      <div className="relative group">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                          <input 
                              type="text" 
                              placeholder="Search database..." 
                              value={bankSearch}
                              onChange={e => setBankSearch(e.target.value)} 
                              className="w-full pl-10 pr-4 h-11 rounded-xl bg-gray-100 dark:bg-white/10 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary dark:focus:border-primary text-sm dark:text-white outline-none transition-all"
                          />
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 ml-1">Question Type</label>
                          <div className="relative">
                              <select 
                                  value={bankFilterType} 
                                  onChange={e => setBankFilterType(e.target.value)}
                                  className="w-full h-11 pl-3 pr-8 rounded-xl bg-gray-100 dark:bg-white/10 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary dark:focus:border-primary text-sm dark:text-white outline-none appearance-none cursor-pointer"
                              >
                                  <option value="All" className="bg-white dark:bg-[#111]">All Types</option>
                                  <option value="mcq" className="bg-white dark:bg-[#111]">MCQ</option>
                                  <option value="written" className="bg-white dark:bg-[#111]">Written</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 ml-1">Subject</label>
                          <div className="relative">
                              <select 
                                  value={bankFilterSubject} 
                                  onChange={e => setBankFilterSubject(e.target.value)}
                                  className="w-full h-11 pl-3 pr-8 rounded-xl bg-gray-100 dark:bg-white/10 border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary dark:focus:border-primary text-sm dark:text-white outline-none appearance-none cursor-pointer"
                              >
                                  {availableSubjects.map(s => <option key={s} value={s} className="bg-white dark:bg-[#111]">{s}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* ... AI Preview Section ... */}
      {showGenPreview && (
          isMinimized ? (
              <div className="fixed bottom-6 right-6 z-[100] w-72 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                  <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                      <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin text-primary" size={16} />
                          <span className="text-xs font-bold dark:text-white">AI Extracting...</span>
                      </div>
                      <div className="flex gap-1">
                          <button onClick={() => setIsMinimized(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md"><Maximize2 size={14} /></button>
                      </div>
                  </div>
                  <div className="p-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 truncate">{progressStatus}</p>
                      <p className="text-[10px] text-primary font-bold mt-1">{generatedQuestions.length} Questions found</p>
                  </div>
              </div>
          ) : (
              <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                      <div className="p-6 border-b border-gray-100 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur-md sticky top-0 z-20">
                          <div>
                              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                  {aiProcessing && <Loader2 className="animate-spin text-primary" size={20} />}
                                  AI Question Extractor
                              </h3>
                              <p className="text-sm text-gray-500">{generatedQuestions.length} questions found so far...</p>
                          </div>
                          {aiProcessing ? (
                              <div className="flex items-center gap-4 w-full md:w-auto">
                                  <div className="flex-1 md:w-48 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                                      <div className="h-full bg-primary transition-all duration-300 relative overflow-hidden" style={{ width: `${progress}%` }}>
                                          <div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_1s_infinite] skew-x-12"></div>
                                      </div>
                                  </div>
                                  <span className="text-xs font-bold text-primary whitespace-nowrap w-8">{Math.round(progress)}%</span>
                                  
                                  <div className="flex gap-2">
                                      <div className="group relative">
                                          <button onClick={stopProcessing} className="w-3.5 h-3.5 rounded-full bg-[#FF5F57] flex items-center justify-center border border-black/5 shadow-sm transition-all active:scale-90 hover:bg-[#FF5F57]/80">
                                              <X size={8} className="text-black/50 opacity-0 group-hover:opacity-100 transition-opacity font-bold" strokeWidth={4} />
                                          </button>
                                      </div>
                                      <div className="group relative">
                                          <button onClick={() => setIsMinimized(true)} className="w-3.5 h-3.5 rounded-full bg-[#FEBC2E] flex items-center justify-center border border-black/5 shadow-sm transition-all active:scale-90 hover:bg-[#FEBC2E]/80">
                                              <Minus size={8} className="text-black/50 opacity-0 group-hover:opacity-100 transition-opacity font-bold" strokeWidth={4} />
                                          </button>
                                      </div>
                                      <div className="group relative">
                                          <button onClick={togglePause} className="w-3.5 h-3.5 rounded-full bg-[#28C840] flex items-center justify-center border border-black/5 shadow-sm transition-all active:scale-90 hover:bg-[#28C840]/80">
                                              {isPaused ? <Play size={8} className="text-black/50 opacity-0 font-bold ml-0.5" fill="currentColor"/> : <Pause size={8} className="text-black/50 opacity-0 font-bold" fill="currentColor"/>}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <button onClick={() => setShowGenPreview(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200"><X size={20} /></button>
                          )}
                      </div>
                      
                      {aiProcessing && <div className="px-6 py-2 bg-primary/5 text-primary text-xs font-bold text-center border-b border-primary/10">{progressStatus}</div>}

                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                          {generatedQuestions.map((q, idx) => (
                              <div key={idx} className={`p-4 rounded-xl border cursor-pointer transition-all animate-fade-in-up ${selectedGenIndices.has(idx) ? 'bg-primary/5 border-primary' : 'bg-gray-5 dark:bg-white/5 border-transparent opacity-70'}`} onClick={() => {
                                  const next = new Set(selectedGenIndices);
                                  if (next.has(idx)) next.delete(idx); else next.add(idx);
                                  setSelectedGenIndices(next);
                              }}>
                                  <div className="flex gap-3">
                                      <div className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 ${selectedGenIndices.has(idx) ? 'bg-primary border-primary text-white' : 'border-gray-400'}`}>
                                          {selectedGenIndices.has(idx) && <Check size={14} />}
                                      </div>
                                      <div className="flex-1">
                                          {/* Diagram Badge */}
                                          {q.hasDiagram && (
                                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2 border border-amber-200 dark:border-amber-900/30">
                                                  <ImageIcon size={10} /> Upload Diagram
                                              </div>
                                          )}
                                          <h4 className="font-bold text-[#1D1D1F] dark:text-white mb-2 break-words overflow-x-auto"><LatexText text={q.text} /></h4>
                                          {q.type === 'mcq' && q.options && q.options.length > 0 && (
                                              <div className="grid grid-cols-2 gap-2 text-sm">
                                                  {q.options.map((o: string, i: number) => (
                                                      <div key={i} className={`px-2 py-1 rounded ${o === q.correct ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-white/10 text-gray-600'}`}>{o}</div>
                                                  ))}
                                              </div>
                                          )}
                                          {q.explanation && (
                                              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-900/30">
                                                  <span className="font-bold mr-1">Expl:</span> 
                                                  <LatexText text={q.explanation} />
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#1C1C1E] flex justify-end gap-3 sticky bottom-0 z-20">
                          <button onClick={() => setShowGenPreview(false)} className="px-6 py-3 font-bold text-gray-500 rounded-xl hover:bg-gray-100">Cancel</button>
                          <button onClick={confirmGenSelection} disabled={aiProcessing} className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary-dark disabled:opacity-50">
                              Import {selectedGenIndices.size} Questions
                          </button>
                      </div>
                  </div>
              </div>
          )
      )}

      {/* Main Wizard */}
      {step === 1 ? (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-[#1D1D1F] dark:text-white">নতুন এক্সাম তৈরি</h2>
                    <p className="text-gray-500">বেসিক তথ্যগুলো পূরণ করে এগিয়ে যান</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] p-5 md:p-8 rounded-2xl md:rounded-[32px] shadow-sm space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-tighter">এক্সাম টাইটেল</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="উদা: ফিজিক্স উইকলি টেস্ট" className="w-full h-14 px-5 rounded-2xl bg-gray-50 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-black text-lg font-semibold dark:text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-tighter">বিষয়</label>
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Physics" className="w-full h-14 px-5 rounded-2xl bg-gray-50 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-black text-lg font-semibold dark:text-white outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-tighter flex items-center gap-1"><Layers size={12} /> অধ্যায় (Chapter)</label>
                        <input type="text" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="যেমন: নিউটনিয়ান বলবিদ্যা" className="w-full h-14 px-5 rounded-2xl bg-gray-50 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-black text-base font-medium dark:text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-tighter flex items-center gap-1"><Hash size={12} /> টপিক (Topic)</label>
                        <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="যেমন: ঘর্ষণ ও বল" className="w-full h-14 px-5 rounded-2xl bg-gray-50 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-black text-base font-medium dark:text-white outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-tighter">ব্যাচ</label>
                        <select value={batch} onChange={e => setBatch(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white border-none outline-none">
                            <option value="All">সকল ব্যাচ</option>
                            {availBatches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-tighter">টোটাল টাইম (মিনিট)</label>
                        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white border-none outline-none" placeholder="30" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-tighter flex items-center gap-1">
                            <Award size={12} /> প্রতি প্রশ্নের মার্ক
                        </label>
                        <input 
                            type="number" 
                            value={defaultMarks} 
                            onChange={e => setDefaultMarks(e.target.value)} 
                            className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white border-none outline-none" 
                            placeholder="1" 
                        />
                    </div>
                    <div className="space-y-2">
                         <label className="text-xs font-black uppercase text-gray-400 tracking-tighter flex items-center gap-1">
                            <AlertTriangle size={12} className="text-orange-500" /> নেগেটিভ মার্কিং (%)
                        </label>
                        <input 
                            type="number" 
                            value={negativeMarking} 
                            onChange={e => setNegativeMarking(e.target.value)} 
                            className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white border-none outline-none focus:ring-1 focus:ring-orange-500/50" 
                            placeholder="e.g. 25" 
                        />
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-tighter">টাইপ</label>
                        <div className="flex h-12 p-1 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <button onClick={() => setExamType('mcq')} className={`flex-1 rounded-lg text-xs font-bold transition-all ${examType === 'mcq' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-400'}`}>MCQ</button>
                            <button onClick={() => setExamType('written')} className={`flex-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${examType === 'written' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-400'}`}>
                                WRITTEN
                            </button>
                        </div>
                    </div>
                    
                    {examType === 'written' && (
                        <div className="space-y-2 lg:col-span-2">
                             <label className="text-xs font-black uppercase text-gray-400 tracking-tighter flex items-center gap-1">
                                <Bot size={12} className="text-purple-500" /> AI Grading
                                <span className="text-[9px] bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase">Beta</span>
                            </label>
                            <div 
                                className={`h-12 px-4 rounded-xl flex items-center justify-between cursor-pointer border transition-all ${aiGradingEnabled ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30' : 'bg-gray-50 dark:bg-white/5 border-transparent'}`}
                                onClick={() => setAiGradingEnabled(!aiGradingEnabled)}
                            >
                                <span className={`text-sm font-bold ${aiGradingEnabled ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500'}`}>
                                    {aiGradingEnabled ? 'AI Grading Enabled' : 'Disabled (Teacher Check)'}
                                </span>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${aiGradingEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${aiGradingEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button 
                  disabled={!title || !subject}
                  onClick={() => setStep(2)}
                  className="w-full h-14 bg-[#1D1D1F] dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-30"
                >
                    এগিয়ে যান
                </button>
            </div>
        </div>
      ) : (
        <div className="space-y-8 pb-32">
            <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 text-gray-500 font-bold hover:text-primary transition-colors">
                    <ArrowLeft size={20} /> ফিরে যান
                </button>
                <div className="flex gap-3">
                   <button onClick={handleSaveExam} disabled={loading || questions.length === 0} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center gap-2 hover:bg-primary-dark">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} সেভ করুন
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => setActiveMethod('ai')} className={`p-4 md:p-6 rounded-2xl transition-all text-left flex items-center gap-4 ${activeMethod === 'ai' ? 'bg-primary/5 ring-1 ring-primary' : 'bg-white dark:bg-white/5'}`}>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-primary"><Sparkles size={24} /></div>
                    <div><h4 className="font-bold dark:text-white">AI জেনারেট</h4><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Upload Image/PDF</p></div>
                </button>
                <button onClick={() => openBankModal()} className="p-4 md:p-6 rounded-2xl bg-white dark:bg-white/5 transition-all text-left flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/10">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600"><Library size={24} /></div>
                    <div><h4 className="font-bold dark:text-white">কোয়েশ্চেন ব্যাংক</h4><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pick from History</p></div>
                </button>
                <button onClick={() => { setActiveMethod('manual'); setEditingId(null); setNewQuestionText(''); setNewQuestionOptions(['','','','']); setNewQuestionCorrect(''); setNewQuestionExplanation(''); setQuestionImage(null); setQuestionFile(null); setOptionImages(['','','',''].map(() => null)); setOptionFiles(['','','',''].map(() => null)); }} className={`p-4 md:p-6 rounded-2xl transition-all text-left flex items-center gap-4 ${activeMethod === 'manual' ? 'bg-primary/5 ring-1 ring-primary' : 'bg-white dark:bg-white/5'}`}>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600"><Type size={24} /></div>
                    <div><h4 className="font-bold dark:text-white">ম্যানুয়াল টাইপিং</h4><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Create Manually</p></div>
                </button>
            </div>

            <div className="animate-in slide-in-from-top-2 duration-300">
                {activeMethod === 'ai' && (
                    <div className="bg-white dark:bg-[#1C1C1E] p-5 md:p-8 rounded-2xl md:rounded-[32px] shadow-sm flex flex-col items-center">
                        
                        {/* MULTI FILE UPLOAD UI */}
                        <div className="w-full max-w-2xl mx-auto">
                            <div className="relative w-full min-h-[160px] border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50 dark:bg-white/5 hover:border-primary/50 transition-colors flex flex-col items-center justify-center p-6 group">
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*,application/pdf" 
                                    onChange={handleFileChange} 
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                />
                                <div className="flex flex-col items-center pointer-events-none">
                                    <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-full flex items-center justify-center shadow-sm mb-3 text-primary">
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Click to upload or drag and drop</p>
                                    <p className="text-xs text-gray-400 mt-1">Support Images (JPG, PNG) & PDF</p>
                                </div>
                            </div>

                            {files.length > 0 && (
                                <div className="mt-6 space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{files.length} Files Selected</span>
                                        <button onClick={clearFiles} className="text-xs font-bold text-red-500 hover:underline">Clear All</button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                                        {files.map((f, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-xl shadow-sm group relative">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${f.type === 'application/pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                                    {f.type === 'application/pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-[#1D1D1F] dark:text-white truncate">{f.name}</p>
                                                    <p className="text-[10px] text-gray-400">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                                <button onClick={() => removeFile(i)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {/* Add More Button Cue */}
                                        <div className="relative flex items-center justify-center gap-2 p-3 border border-dashed border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer text-gray-400 hover:text-primary">
                                            <input 
                                                type="file" 
                                                multiple 
                                                accept="image/*,application/pdf" 
                                                onChange={handleFileChange} 
                                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                            />
                                            <Plus size={20} />
                                            <span className="text-xs font-bold">Add More</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {examType === 'mcq' && (
                            <div className="mt-6 flex items-center gap-3 bg-gray-50 dark:bg-white/5 px-4 py-3 rounded-xl cursor-pointer" onClick={() => setIncludeExplanation(!includeExplanation)}>
                                 <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${includeExplanation ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                     {includeExplanation && <Check size={14} className="text-white" />}
                                 </div>
                                 <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Add Short Explanation (AI Generated)</span>
                            </div>
                        )}

                        {/* Advanced Settings Toggle */}
                        <div className="mt-6 w-full max-w-2xl">
                            <button 
                                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors group relative"
                            >
                                <div className={`p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 transition-transform duration-300 ${showAdvancedOptions ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={16} />
                                </div>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] font-black text-primary/60 tracking-tighter mb-0.5">BETA</span>
                                    <span>Advanced Settings (অ্যাডভান্সড সেটিংস)</span>
                                </div>
                            </button>
                        </div>

                        {/* AI Extraction Advanced Options */}
                        {showAdvancedOptions && (
                            <div className="w-full max-w-2xl mt-4 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                
                                {/* Important Questions */}
                                <div className={`p-4 rounded-2xl border transition-all ${isImportantEnabled ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30' : 'bg-gray-50 dark:bg-white/5 border-transparent'}`}>
                                    <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setIsImportantEnabled(!isImportantEnabled)}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isImportantEnabled ? 'bg-yellow-500 border-yellow-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {isImportantEnabled && <Check size={14} className="text-white" />}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                                <Award size={16} className="text-yellow-500" /> সবচেয়ে গুরুত্বপূর্ণ প্রশ্ন (পরীক্ষায় আসার সম্ভাবনা বেশি)
                                            </span>
                                        </div>
                                    </div>
                                    {isImportantEnabled && (
                                        <div className="pl-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-medium text-gray-500">কয়টি প্রশ্ন?</span>
                                                <input 
                                                    type="number" 
                                                    value={importantCount} 
                                                    onChange={e => setImportantCount(e.target.value)} 
                                                    placeholder="উদা: ৫" 
                                                    className="w-24 h-10 px-3 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-1 focus:ring-yellow-500/50" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Difficulty Distribution */}
                                <div className={`p-4 rounded-2xl border transition-all ${isDifficultyEnabled ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30' : 'bg-gray-50 dark:bg-white/5 border-transparent'}`}>
                                    <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setIsDifficultyEnabled(!isDifficultyEnabled)}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isDifficultyEnabled ? 'bg-purple-500 border-purple-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {isDifficultyEnabled && <Check size={14} className="text-white" />}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                                <SlidersHorizontal size={16} className="text-purple-500" /> ট্রিকি, কনসেপচুয়াল এবং হার্ড প্রশ্ন
                                            </span>
                                        </div>
                                    </div>
                                    {isDifficultyEnabled && (
                                        <div className="pl-8 grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-gray-500 ml-1">ট্রিকি (Tricky)</span>
                                                <input 
                                                    type="number" 
                                                    value={trickyCount} 
                                                    onChange={e => setTrickyCount(e.target.value)} 
                                                    placeholder="0" 
                                                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-1 focus:ring-purple-500/50 text-center" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-gray-500 ml-1">কনসেপচুয়াল</span>
                                                <input 
                                                    type="number" 
                                                    value={conceptualCount} 
                                                    onChange={e => setConceptualCount(e.target.value)} 
                                                    placeholder="0" 
                                                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-1 focus:ring-purple-500/50 text-center" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-gray-500 ml-1">হার্ড (Hard)</span>
                                                <input 
                                                    type="number" 
                                                    value={hardCount} 
                                                    onChange={e => setHardCount(e.target.value)} 
                                                    placeholder="0" 
                                                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-1 focus:ring-purple-500/50 text-center" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Variations Toggle */}
                                <div className={`p-4 rounded-2xl border transition-all ${generateVariations ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30' : 'bg-gray-50 dark:bg-white/5 border-transparent'}`}>
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setGenerateVariations(!generateVariations)}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${generateVariations ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {generateVariations && <Check size={14} className="text-white" />}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                                <Wand2 size={16} className="text-blue-500" /> একই প্রশ্ন, কিন্তু ডেটা ভ্যালু ভিন্ন (Variation)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button onClick={handleAiExtraction} disabled={files.length === 0 || loading} className="mt-8 px-10 h-14 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Generate from {files.length > 0 ? files.length : ''} Files
                        </button>
                    </div>
                )}

                {activeMethod === 'manual' && (
                    <div ref={formRef} className="bg-white dark:bg-[#1C1C1E] p-5 md:p-8 rounded-2xl md:rounded-[32px] shadow-sm space-y-6 scroll-mt-24">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-black uppercase text-gray-400 tracking-tighter">প্রশ্ন (Question)</label>
                            <button onClick={handleEnhanceQuestion} disabled={isEnhancing || !newQuestionText.trim()} className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                                {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Enhance with AI
                            </button>
                        </div>
                        
                        <div className="relative">
                            <textarea value={newQuestionText} onChange={e => setNewQuestionText(e.target.value)} placeholder="প্রশ্ন লিখুন... (LaTeX এর জন্য $ ব্যবহার করুন)" className="w-full p-4 md:p-6 rounded-2xl bg-gray-50 dark:bg-white/5 dark:text-white border-none outline-none min-h-[120px] text-lg font-medium pr-12" />
                            <div className="absolute top-4 right-4">
                                <label className="cursor-pointer p-2 rounded-lg bg-white dark:bg-black/30 hover:text-primary transition-colors text-gray-400 flex items-center justify-center shadow-sm">
                                    <ImageIcon size={18} />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'question')} />
                                </label>
                            </div>
                            {questionImage && (
                                <div className="mt-2 relative inline-block group">
                                    <img src={questionImage} alt="Q Preview" className="h-24 rounded-lg border border-gray-200 dark:border-white/10" />
                                    <button onClick={() => { setQuestionImage(null); setQuestionFile(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                </div>
                            )}
                        </div>

                        {examType === 'mcq' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {newQuestionOptions.map((opt, i) => (
                                        <div key={i} className="flex flex-col gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-transparent focus-within:border-primary/30 transition-colors relative group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">{String.fromCharCode(65+i)}</div>
                                                <input type="text" value={opt} onChange={e => {const n = [...newQuestionOptions]; n[i] = e.target.value; setNewQuestionOptions(n)}} placeholder={`অপশন লিখুন`} className="bg-transparent outline-none flex-1 dark:text-white px-2 w-full" />
                                                
                                                <label className="cursor-pointer p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-400 hover:text-primary transition-colors">
                                                    <ImageIcon size={16} />
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'option', i)} />
                                                </label>

                                                <button onClick={() => setNewQuestionCorrect(opt)} className={`p-2 rounded-lg transition-all shrink-0 ${newQuestionCorrect === opt && opt !== '' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}><Check size={16} /></button>
                                                
                                                {newQuestionOptions.length > 2 && (
                                                    <button onClick={() => handleOptionRemove(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                            {optionImages[i] && (
                                                <div className="pl-11 relative inline-block w-fit">
                                                    <img src={optionImages[i] || ''} alt="Opt Preview" className="h-16 rounded border border-gray-200 dark:border-white/10" />
                                                    <button onClick={() => {const ni = [...optionImages]; ni[i] = null; setOptionImages(ni); const nf = [...optionFiles]; nf[i] = null; setOptionFiles(nf); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleOptionAdd} className="flex items-center gap-2 text-sm font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors">
                                    <Plus size={16} /> Add Option
                                </button>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-white/10">
                            <button onClick={() => { setActiveMethod('none'); setEditingId(null); }} className="px-6 font-bold text-gray-400">বাতিল</button>
                            <button onClick={saveQuestion} disabled={uploading} className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                                {uploading ? <Loader2 className="animate-spin" size={18} /> : null}
                                {editingId ? 'আপডেট করুন' : 'যোগ করুন'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">প্রশ্নপত্র প্রিভিউ <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">{questions.length}</span></h3>
                    {examType === 'written' && questions.length > 0 && (
                        <button onClick={handleGenerateSolutions} disabled={generatingSolutions} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                            {generatingSolutions ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} Generate Solutions (AI)
                        </button>
                    )}
                </div>

                {questions.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="text-gray-300" size={32} />
                        </div>
                        <p className="text-gray-400 font-medium">এখনো কোনো প্রশ্ন যোগ করা হয়নি</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {questions.map((q, index) => (
                            <div key={q.id} className="group bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-primary/20 transition-all shadow-sm animate-fade-in-up">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="w-6 h-6 rounded bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-500">{index + 1}</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Marks: {q.marks || 1}</span>
                                            {q.type === 'mcq' && !q.correct && <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle size={10} /> Missing Correct Answer</span>}
                                        </div>
                                        <h4 className="font-semibold text-lg text-[#1D1D1F] dark:text-white leading-relaxed mb-4 break-words overflow-x-auto"><LatexText text={q.text} /></h4>
                                        {q.type === 'written' && <div className="mt-2 text-xs text-gray-400 italic">No options (Written)</div>}
                                        {q.type === 'mcq' && q.options && q.options.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                                {q.options.map((opt: string, i: number) => (
                                                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${opt === q.correct ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-600 dark:text-gray-400'}`}>
                                                        <span className="font-bold opacity-50 w-4">{String.fromCharCode(65+i)}.</span>
                                                        <span className="truncate"><LatexText text={opt} /></span>
                                                        {opt === q.correct && <Check size={14} className="ml-auto shrink-0" />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {q.explanation && (
                                          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-900/30 whitespace-pre-wrap font-medium break-words overflow-x-auto">
                                              <LatexText text={q.explanation} />
                                          </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditQuestion(q)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg"><Edit size={18} /></button>
                                        <button onClick={() => setQuestions(questions.filter(item => item.id !== q.id))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}
      {/* ... Bank Modal ... */}
      {showBankModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center animate-in fade-in duration-200">
            <div className="w-full h-full md:h-[90vh] md:w-[95vw] lg:max-w-6xl bg-white dark:bg-[#111] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#111] shrink-0 z-20">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                            <Library size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold dark:text-white leading-none mb-1">Question Bank</h2>
                            <p className="text-xs text-gray-500 hidden sm:block">Select questions from history (Server-Side Filter)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowBankModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors dark:text-white">
                            <X size={22} />
                        </button>
                    </div>
                </div>
                <div className="flex flex-1 overflow-hidden relative">
                    <div className="hidden lg:flex w-72 bg-white dark:bg-black border-r border-gray-100 dark:border-white/10 flex-col p-6 overflow-y-auto">
                        <FilterContent />
                    </div>
                    <div className="flex-1 bg-[#F5F5F7] dark:bg-[#0A0A0A] flex flex-col w-full relative">
                         <div className="px-4 md:px-6 py-3 bg-white/80 dark:bg-[#111]/80 backdrop-blur-md flex justify-between items-center border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
                            <button onClick={selectAllLoaded} className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors bg-white dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                                {selectedBankIds.size === bankQuestions.length && bankQuestions.length > 0 ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                                <span className="hidden sm:inline">Select All Loaded</span>
                            </button>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {bankLoading ? 'Loading...' : `Loaded ${bankQuestions.length}`}
                            </span>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                            {bankQuestions.map((q, idx) => {
                                const isSelected = selectedBankIds.has(q.id);
                                const isLast = idx === bankQuestions.length - 1;
                                return (
                                    <div 
                                        key={q.id} 
                                        ref={isLast ? lastQuestionElementRef : null}
                                        onClick={() => toggleBankSelection(q.id)} 
                                        className={`group relative p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-sm' : 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5 hover:border-primary/30 hover:shadow-md'}`}
                                    >
                                        <div className="flex gap-4">
                                             <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg border-2 flex items-center justify-center shrink-0 transition-all mt-1 ${isSelected ? 'bg-primary border-primary' : 'border-gray-200 dark:border-white/20 bg-transparent group-hover:border-primary/50'}`}>
                                                {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 md:px-2 rounded-md uppercase tracking-wider flex items-center gap-1 ${q.question_type === 'mcq' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-300'}`}>
                                                        {q.question_type === 'mcq' ? <CheckSquare size={10} /> : <Type size={10} />} {q.question_type}
                                                    </span>
                                                    {q.subject && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-500">{q.subject}</span>}
                                                </div>
                                                <h4 className={`text-sm md:text-[15px] font-semibold leading-relaxed mb-4 break-words overflow-x-auto ${isSelected ? 'text-primary dark:text-primary-400' : 'text-[#1D1D1F] dark:text-white'}`}><LatexText text={q.question_text} /></h4>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            {bankLoading && <div className="py-4 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>}
                         </div>
                    </div>
                </div>
                <div className="px-4 md:px-6 py-4 bg-white dark:bg-[#111] border-t border-gray-100 dark:border-white/10 flex justify-between items-center shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 pb-6 md:pb-4 safe-area-bottom">
                    <div className="flex items-center gap-2">
                         <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm shadow-md shadow-primary/30 animate-in zoom-in">{selectedBankIds.size}</span>
                         <span className="text-sm font-medium text-gray-500 hidden sm:inline">selected</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowBankModal(false)} className="px-4 md:px-6 py-2.5 font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors text-sm">Cancel</button>
                        <button onClick={addFromBank} disabled={selectedBankIds.size === 0} className="px-6 md:px-8 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 text-sm"><span className="hidden sm:inline">Add to Exam</span><span className="sm:hidden">Add</span><ArrowRight size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
