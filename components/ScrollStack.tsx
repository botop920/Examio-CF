import React, { useRef, useLayoutEffect, ReactNode } from 'react';

export const ScrollStackItem: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
  return <div className={`scroll-stack-card-content ${className}`}>{children}</div>;
};

interface ScrollStackProps {
  children: ReactNode;
  itemHeight?: number; // The height of the scroll area for each item
  stackOffset?: number; // Top offset where cards stick
  scaleFactor?: number; // How much to scale down previous cards
}

const ScrollStack: React.FC<ScrollStackProps> = ({ 
  children, 
  itemHeight = 600, // Pixels of scroll per item
  stackOffset = 120, // Distance from top
  scaleFactor = 0.05 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const items = itemsRef.current;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      items.forEach((itemWrapper, index) => {
        if (!itemWrapper) return;
        
        const card = itemWrapper.firstElementChild as HTMLElement;
        if (!card) return;

        // Get the position of the wrapper relative to viewport
        const rect = itemWrapper.getBoundingClientRect();
        
        // Check if the item is in the "sticky" phase
        // It becomes sticky when rect.top hits stackOffset
        const isSticky = rect.top <= stackOffset;

        if (isSticky) {
          // Calculate how far we've scrolled past the stick point
          const distancePast = stackOffset - rect.top;
          
          // Determine progress for this card (0 to 1 based on its height allowance)
          // We look at the NEXT item to see how much it overlaps
          const nextItem = items[index + 1];
          let progress = 0;
          
          if (nextItem) {
              const nextRect = nextItem.getBoundingClientRect();
              // Progress is determined by how close the next item is to the stack offset
              const nextDist = nextRect.top - stackOffset;
              // Normalize: When nextDist is large, progress is 0. When nextDist is 0 (arrived), progress is 1.
              // We estimate the gap between items is approximately itemHeight usually, but in flex column it varies.
              // Simpler: The card scales down as it moves 'up' logically, but it's pinned.
              // Let's use the distancePast directly.
              
              progress = Math.min(distancePast / windowHeight, 1);
          }

          // Apply Scale and Fade
          // As progress increases (new card coming up), this card gets smaller and darker/blurred
          const scale = 1 - (progress * scaleFactor);
          // const opacity = 1 - (progress * 0.5); // Optional fade
          const filter = `blur(${progress * 5}px)`; // Optional blur
          
          card.style.transform = `scale(${scale})`;
          card.style.filter = filter;
          // card.style.opacity = opacity.toString();
        } else {
          // Reset if not sticky yet
          card.style.transform = 'scale(1)';
          card.style.filter = 'none';
          // card.style.opacity = '1';
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Init

    return () => window.removeEventListener('scroll', handleScroll);
  }, [itemHeight, stackOffset, scaleFactor]);

  const childrenArray = React.Children.toArray(children);

  return (
    <div className="scroll-stack-wrapper" ref={containerRef} style={{ paddingBottom: '10vh' }}>
      {childrenArray.map((child, index) => (
        <div
          key={index}
          ref={(el) => { itemsRef.current[index] = el; }}
          className="scroll-stack-card-wrapper"
          style={{ 
            height: `${itemHeight}px`, // This defines how much "scroll time" the card gets
            top: `${stackOffset + (index * 15)}px`, // Stagger the sticky top slightly
            zIndex: index + 1,
            marginBottom: `-${itemHeight - 100}px` // Pull next item up so they overlap during scroll
          }} 
        >
          <div className="scroll-stack-card px-4">
            {child}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ScrollStack;