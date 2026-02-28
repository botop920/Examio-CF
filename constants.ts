
import { 
  TimerOff, 
  BarChart3, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  LayoutDashboard, 
  FileText, 
  GraduationCap, 
  MessageSquare,
} from 'lucide-react';
import { NavItem, Problem, Feature, Step, PricingPlan, FaqItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'ফিচার', href: '#features' },
  { label: 'কিভাবে কাজ করে', href: '#workflow' },
  { label: 'প্রাইসিং', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export const PROBLEMS: Problem[] = [
  {
    id: 1,
    icon: TimerOff,
    colorClass: 'text-red-600',
    bgClass: 'bg-red-100',
    title: 'ম্যানুয়াল গ্রেডিং',
    description: 'হাতে খাতা দেখা সময়সাপেক্ষ এবং ভুল হওয়ার সম্ভাবনা থাকে। শিক্ষকের মূল্যবান সময় নষ্ট হয়।',
  },
  {
    id: 2,
    icon: BarChart3,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-100',
    title: 'ডেটা অ্যানালিটিক্সের অভাব',
    description: 'শিক্ষার্থীদের উন্নতির গ্রাফ বা দুর্বলতা বোঝার কোনো উপায় নেই। অভিভাবকরা সঠিক তথ্য পান না।',
  },
  {
    id: 3,
    icon: ShieldAlert,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-100',
    title: 'প্রশ্ন ফাঁসের ঝুঁকি',
    description: 'সনাতন পদ্ধতিতে প্রশ্নপত্র সুরক্ষিত রাখা কঠিন। ডিজিটাল সিকিউরিটি ছাড়া পরীক্ষার স্বচ্ছতা বজায় রাখা অসম্ভব।',
  },
];

export const FEATURES: Feature[] = [
  {
    id: 1,
    icon: Sparkles,
    title: 'AI লিখিত খাতা মূল্যায়ন',
    description: 'কৃত্রিম বুদ্ধিমত্তার সাহায্যে দ্রুত এবং নির্ভুলভাবে লিখিত খাতা মূল্যায়ন করুন। কিওয়ার্ড এবং কনটেক্সট এনালাইসিস করে মার্কিং করে।',
  },
  {
    id: 2,
    icon: Zap,
    title: 'স্বয়ংক্রিয় MCQ রেজাল্ট',
    description: 'পরীক্ষা শেষ হওয়ার সাথে সাথেই নির্ভুল ফলাফল তৈরি এবং মেরিট লিস্ট পাবলিশ করার সুবিধা।',
  },
  {
    id: 3,
    icon: LayoutDashboard,
    title: 'ইনস্ট্যান্ট ড্যাশবোর্ড',
    description: 'শিক্ষার্থী ও অভিভাবকদের জন্য বিস্তারিত পারফরম্যান্স রিপোর্ট এবং উইকনেস আইডেন্টিফিকেশন টুলস।',
  },
  {
    id: 4,
    icon: FileText,
    title: 'PDF থেকে অটো প্রশ্ন',
    description: 'আপনার বিদ্যমান PDF প্রশ্ন থেকে সরাসরি ডিজিটাল পরীক্ষা তৈরির ফিচার।',
  },
  {
    id: 5,
    icon: GraduationCap,
    title: 'স্টুডেন্ট পোর্টাল',
    description: 'ব্যক্তিগতকৃত স্টাডি ম্যাটেরিয়াল এবং আগের সব পরীক্ষার রেকর্ডের জন্য ডেডিকেটেড পোর্টাল।',
  },
  {
    id: 6,
    icon: MessageSquare,
    title: 'SMS নোটিফিকেশন',
    description: 'রেজাল্ট পাবলিশ হওয়ার সাথে সাথে অভিভাবককে স্বয়ংক্রিয় SMS পাঠানোর ব্যবস্থা।',
  },
];

export const WORKFLOW_STEPS: Step[] = [
  { id: 1, title: 'আপলোড', description: 'প্রশ্নপত্র বা PDF আপলোড করুন মুহূর্তেই' },
  { id: 2, title: 'পরীক্ষা', description: 'শিক্ষার্থীরা অনলাইন বা ফিজিক্যাল পরীক্ষা দেয়' },
  { id: 3, title: 'AI গ্রেডিং', description: 'সিস্টেম স্বয়ংক্রিয় খাতা মূল্যায়ন শুরু করে' },
  { id: 4, title: 'টিচার রিভিউ', description: 'শিক্ষক চাইলে খাতা রিভিউ বা এডিট করতে পারেন' },
  { id: 5, title: 'রেজাল্ট', description: 'মুহূর্তে মার্কশিট ও এনালিটিক্স পাবলিশ' },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 1,
    title: 'স্টার্টার',
    price: '৳২৯৯',
    features: [
      '৫০০ প্রশ্ন এক্সট্রাকশন',
      '২০টি এক্সাম তৈরি',
      'আনলিমিটেড প্রশ্ন PDF ডাউনলোড',
      'সর্বোচ্চ ৫০ জন শিক্ষার্থী/এক্সাম',
    ],
    missingFeatures: ['লিখিত পরীক্ষা'],
  },
  {
    id: 2,
    title: 'বেসিক',
    price: '৳৪৯৯',
    features: [
      '১০০০ প্রশ্ন এক্সট্রাকশন',
      '৫০টি এক্সাম তৈরি',
      'আনলিমিটেড প্রশ্ন PDF ডাউনলোড',
      'সর্বোচ্চ ১০০ জন শিক্ষার্থী/এক্সাম',
    ],
    missingFeatures: ['লিখিত পরীক্ষা'],
  },
  {
    id: 3,
    title: 'প্রো',
    price: '৳১৪৯৯',
    isPopular: true,
    features: [
      '৩০০০ প্রশ্ন এক্সট্রাকশন',
      '১০০টি এক্সাম তৈরি',
      '১টি লিখিত পরীক্ষা (ম্যানুয়াল চেক)',
      'আনলিমিটেড প্রশ্ন PDF ডাউনলোড',
      'সর্বোচ্চ ২০০ জন শিক্ষার্থী/এক্সাম',
    ],
    missingFeatures: [],
  },
  {
    id: 4,
    title: 'এন্টারপ্রাইজ',
    price: 'Contact Sales',
    isEnterprise: true,
    features: [
      'সকল সুবিধা',
      'কাস্টমাইজড সলিউশন',
      'ডেডিকেটেড সাপোর্ট',
      'API ইন্টিগ্রেশন',
    ],
    missingFeatures: [],
  },
];

export const FAQS: FaqItem[] = [
  {
    id: 1,
    question: 'সিস্টেমটি কি আমার বিদ্যমান শিক্ষার্থীর ডেটা হ্যান্ডেল করতে পারবে?',
    answer: 'হ্যাঁ, আমাদের প্ল্যাটফর্ম অত্যন্ত স্কেলেবল এবং হাজার হাজার শিক্ষার্থীর ডেটা একসাথে কোনো ল্যাগ ছাড়াই প্রসেস করতে সক্ষম।',
  },
  {
    id: 2,
    question: 'প্রশ্নপত্রের সিকিউরিটি কেমন?',
    answer: 'আমরা ইন্ডাস্ট্রি স্ট্যান্ডার্ড এনক্রিপশন ব্যবহার করি। পরীক্ষার নির্দিষ্ট সময়ের আগে কোনোভাবেই প্রশ্ন এক্সেস করা সম্ভব নয় এবং ব্রাউজার লকিং সিস্টেম প্রশ্ন কপি হওয়া রোধ করে।',
  },
  {
    id: 3,
    question: 'AI গ্রেডিং কি শতভাগ নির্ভুল?',
    answer: 'আমাদের AI মডেল ৯৫% এর বেশি নির্ভুলতা বজায় রাখে। তবুও আমরা শিক্ষকদের জন্য রিভিউ অপশন রেখেছি যাতে তারা চূড়ান্ত রেজাল্ট দেওয়ার আগে একবার দেখে নিতে পারেন।',
  },
];

export const HERO_IMAGE_URL = "https://res.cloudinary.com/dejm7pz1d/image/upload/v1769707414/IMG_2440_xay7mg.png";
export const HERO_IMAGE_DARK_URL = "https://res.cloudinary.com/dejm7pz1d/image/upload/v1769708654/IMG_2443_ba3tyq.png";
