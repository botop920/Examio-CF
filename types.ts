import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
}

export interface Problem {
  id: number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  title: string;
  description: string;
}

export interface Feature {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface Step {
  id: number;
  title: string;
  description: string;
}

export interface PricingPlan {
  id: number;
  title: string;
  price: string;
  isPopular?: boolean;
  isEnterprise?: boolean;
  features: string[];
  missingFeatures?: string[];
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}