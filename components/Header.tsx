
import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, User } from 'lucide-react';
import { NAV_ITEMS } from '../constants';

const LOGO_LIGHT = "https://res.cloudinary.com/dejm7pz1d/image/upload/v1770135336/IMG_2585_tiorhy.png";
const LOGO_DARK = "https://res.cloudinary.com/dejm7pz1d/image/upload/v1770135335/IMG_2584_bjqgp4.png";

interface HeaderProps {
  onOpenModal: () => void;
  theme: string;
  toggleTheme: () => void;
  onLoginClick: () => void;
  isLoggedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenModal, theme, toggleTheme, onLoginClick, isLoggedIn }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoSrc, setLogoSrc] = useState(theme === 'dark' ? LOGO_DARK : LOGO_LIGHT);

  // Effect 1: Handle Logo Switching based on Theme
  useEffect(() => {
    const targetKey = theme === 'dark' ? 'examio_logo_dark_v4' : 'examio_logo_light_v4';
    const targetUrl = theme === 'dark' ? LOGO_DARK : LOGO_LIGHT;
    
    const cached = localStorage.getItem(targetKey);
    if (cached) {
        setLogoSrc(cached);
    } else {
        setLogoSrc(targetUrl);
    }
  }, [theme]);

  // Effect 2: Background Caching for both images
  useEffect(() => {
    const cacheImage = async (url: string, key: string) => {
        if (localStorage.getItem(key)) return; // Already cached

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                try {
                    localStorage.setItem(key, base64);
                } catch (e) {
                    console.warn('Logo cache skipped: Storage full');
                }
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Logo caching failed', err);
        }
    };

    // Cache both versions in background
    cacheImage(LOGO_LIGHT, 'examio_logo_light_v4');
    cacheImage(LOGO_DARK, 'examio_logo_dark_v4');

    // Scroll Handler
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-5 py-4`}
      >
        <div className={`max-w-[1280px] mx-auto flex items-center justify-between h-14 md:h-16 px-5 md:px-8 lg:px-16 rounded-full transition-all duration-300
          ${scrolled 
            ? 'bg-white/70 dark:bg-black/70 shadow-md border border-white/20 dark:border-white/10 backdrop-blur-xl saturate-150 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60' 
            : 'bg-transparent'
          }`}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none -ml-4 md:-ml-5" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src={logoSrc} 
              alt="EXAMiO" 
              className="h-7 md:h-9 w-auto object-contain rounded-lg transition-opacity duration-300"
            />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
            <nav className="flex items-center gap-6">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.href);
                  }}
                  className="text-[13px] font-medium text-[#1D1D1F]/80 hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex gap-3 items-center pl-4 border-l border-black/10 dark:border-white/10">
               <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-[#1D1D1F] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                aria-label="Toggle Dark Mode"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              
              {isLoggedIn ? (
                 <button 
                  onClick={onLoginClick}
                  className="flex items-center gap-2 text-[#1D1D1F] dark:text-white text-[13px] font-semibold hover:opacity-70 transition-opacity px-2"
                >
                  <User size={16} />
                  একাউন্ট
                </button>
              ) : (
                <button 
                  onClick={onLoginClick}
                  className="text-[#1D1D1F] dark:text-white text-[13px] font-semibold hover:opacity-70 transition-opacity px-2"
                >
                  লগইন
                </button>
              )}

              <button 
                onClick={onLoginClick}
                className="bg-[#1D1D1F] dark:bg-white text-white dark:text-black rounded-full h-8 px-4 text-[13px] font-semibold hover:opacity-90 transition-opacity active:scale-95"
              >
                শুরু করুন
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#1D1D1F] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-white dark:bg-black z-40 md:hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileMenuOpen ? 'translate-y-0' : 'translate-y-full'} pt-24 px-6`}
      >
        <div className="flex flex-col gap-6 h-full">
          <nav className="flex flex-col gap-4">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-2xl font-bold text-[#1D1D1F] dark:text-white tracking-tight py-2 border-b border-gray-100 dark:border-white/5"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(item.href);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex justify-between items-center">
             <span className="font-medium text-[#1D1D1F] dark:text-white">থিম পরিবর্তন করুন</span>
             <button
                onClick={toggleTheme}
                className="p-3 rounded-full bg-gray-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
          </div>
          <div className="flex flex-col gap-3 mt-auto mb-10">
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLoginClick();
              }}
              className="bg-primary text-white rounded-xl h-12 w-full text-lg font-bold shadow-sm active:scale-95 transition-all"
            >
              বিনামূল্যে শুরু করুন
            </button>
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLoginClick();
              }}
              className="bg-gray-100 dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-white rounded-xl h-12 w-full text-lg font-bold active:scale-95 transition-all"
            >
              {isLoggedIn ? 'ড্যাশবোর্ড' : 'লগইন'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
