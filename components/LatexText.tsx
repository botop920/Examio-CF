
import React from 'react';
import katex from 'katex';

interface LatexTextProps {
  text: string;
}

export const LatexText = React.memo(({ text }: LatexTextProps) => {
  if (!text) return null;
  
  // Robust regex to split by:
  // 1. $$...$$ (Block)
  // 2. $...$ (Inline)
  // 3. \[...\] (Block)
  // 4. \(...\) (Inline)
  const regex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) => {
        // Check if the part matches any of our math delimiters
        if (
            part.startsWith('$') || 
            part.startsWith('\\(') || 
            part.startsWith('\\[')
        ) {
          try {
            // Strip delimiters for KaTeX
            let math = part;
            let displayMode = false;

            if (part.startsWith('$$')) {
                math = part.slice(2, -2);
                displayMode = true;
            } else if (part.startsWith('$')) {
                math = part.slice(1, -1);
                displayMode = false;
            } else if (part.startsWith('\\[')) {
                math = part.slice(2, -2);
                displayMode = true;
            } else if (part.startsWith('\\(')) {
                math = part.slice(2, -2);
                displayMode = false;
            }

            // Clean up double backslashes that might come from JSON parsing
            math = math.replace(/\\\\/g, '\\');

            const html = katex.renderToString(math, {
              throwOnError: false,
              displayMode: displayMode,
              output: 'html',
              strict: false,
              trust: true
            });
            
            return (
              <span 
                key={index} 
                className={`math-wrapper ${displayMode ? 'block my-2 overflow-x-auto' : 'inline-block'}`}
                style={{ lineHeight: 'normal', textIndent: 0, letterSpacing: 'normal', wordSpacing: 'normal' }}
              >
                <span dangerouslySetInnerHTML={{ __html: html }} />
              </span>
            );
          } catch (e) {
            // Fallback to raw text if render fails
            return <span key={index} className="text-red-500 text-xs">{part}</span>;
          }
        }
        
        // Regular Text (Render HTML for Images/Breaks)
        // Using dangerouslySetInnerHTML allows <img src="..."> tags to render properly
        return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
      })}
    </span>
  );
});

LatexText.displayName = 'LatexText';
