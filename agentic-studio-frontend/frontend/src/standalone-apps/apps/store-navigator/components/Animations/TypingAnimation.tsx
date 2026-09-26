import React, { useState, useEffect, useRef } from 'react';
import { MarkdownRenderer } from '../../utils/markdownRenderer';

interface TypingAnimationProps {
  text: string;
  speed?: number; // characters per second
  onComplete?: () => void;
  className?: string;
}

// Timing controller for consistent character-per-second animation
class TypingTimingController {
  private startTime: number;
  private targetSpeed: number; // chars per second

  constructor(charsPerSecond: number) {
    this.startTime = performance.now();
    this.targetSpeed = charsPerSecond;
  }

  getTargetCharsAtTime(currentTime: number): number {
    const elapsed = (currentTime - this.startTime) / 1000;
    return Math.floor(elapsed * this.targetSpeed);
  }

  shouldRevealMore(currentTime: number, currentChars: number): boolean {
    return this.getTargetCharsAtTime(currentTime) > currentChars;
  }

  reset() {
    this.startTime = performance.now();
  }
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
  text,
  speed = 150, // 150 characters per second default (much faster)
  onComplete,
  className = ''
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<TypingTimingController | null>(null);

  // Function to scroll to bottom smoothly
  const scrollToBottom = () => {
    if (containerRef.current) {
      // Find the chat messages container by traversing up the DOM
      let element = containerRef.current.parentElement;
      while (element && !element.classList.contains('psp-sop-messages')) {
        element = element.parentElement;
      }
      
      if (element) {
        // Scroll the messages container
        element.scrollTop = element.scrollHeight;
      } else {
        // Fallback: scroll the window
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  // Smart character revelation that respects markdown boundaries
  const revealCharacters = (targetCharsToReveal: number) => {
    let charsRevealed = 0;
    let newIndex = currentIndex;
    
    while (charsRevealed < targetCharsToReveal && newIndex < text.length) {
      const nextSafeEnd = findNextChunkEnd(text, newIndex);
      const chunkSize = nextSafeEnd - newIndex;
      
      if (charsRevealed + chunkSize <= targetCharsToReveal) {
        // Can reveal entire chunk
        newIndex = nextSafeEnd;
        charsRevealed += chunkSize;
      } else {
        // Would exceed target - stop here to maintain consistent speed
        break;
      }
    }
    
    if (newIndex > currentIndex) {
      setDisplayedText(text.substring(0, newIndex));
      setCurrentIndex(newIndex);
      
      // Throttled scrolling for performance
      if (Math.random() < 0.3) {
        setTimeout(scrollToBottom, 0);
      }
    }
  };

  // Function to find the next safe stopping point for markdown
  const findNextChunkEnd = (text: string, startIndex: number): number => {
    let index = startIndex;
    
    // If we're in the middle of markdown syntax, find the end
    if (text.charAt(index) === '*') {
      // Handle bold/italic markdown
      if (text.charAt(index + 1) === '*') {
        // Bold text **text**
        const closingIndex = text.indexOf('**', index + 2);
        if (closingIndex !== -1) {
          return closingIndex + 2; // Include the closing **
        }
      } else {
        // Italic text *text*
        const closingIndex = text.indexOf('*', index + 1);
        if (closingIndex !== -1) {
          return closingIndex + 1; // Include the closing *
        }
      }
    }
    
    // Handle links [text](url)
    if (text.charAt(index) === '[') {
      const closingBracket = text.indexOf(']', index);
      if (closingBracket !== -1 && text.charAt(closingBracket + 1) === '(') {
        const closingParen = text.indexOf(')', closingBracket + 1);
        if (closingParen !== -1) {
          return closingParen + 1; // Include the closing )
        }
      }
    }
    
    // Handle headers ### text
    if (text.charAt(index) === '#') {
      const lineEnd = text.indexOf('\n', index);
      if (lineEnd !== -1) {
        return lineEnd; // Include until end of line
      }
    }
    
    // Default: advance by one character
    return index + 1;
  };

  // Initialize controller when text or speed changes
  useEffect(() => {
    controllerRef.current = new TypingTimingController(speed);
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text, speed]);

  // Main animation loop using requestAnimationFrame
  useEffect(() => {
    if (!controllerRef.current || isComplete) return;

    let animationId: number;

    const animate = (currentTime: number) => {
      if (!controllerRef.current || currentIndex >= text.length) {
        if (!isComplete) {
          setIsComplete(true);
          setTimeout(() => {
            onComplete?.();
            scrollToBottom();
          }, 100);
        }
        return;
      }

      const targetChars = controllerRef.current.getTargetCharsAtTime(currentTime);
      
      if (targetChars > currentIndex) {
        const charsToReveal = Math.min(
          targetChars - currentIndex,
          text.length - currentIndex
        );
        
        if (charsToReveal > 0) {
          revealCharacters(charsToReveal);
        }
      }
      
      if (currentIndex < text.length && !isComplete) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [currentIndex, text, isComplete, onComplete]);

  return (
    <div ref={containerRef} className={className}>
      <MarkdownRenderer 
        content={displayedText + (!isComplete ? '<span class="typing-cursor-inline">|</span>' : '')} 
      />
    </div>
  );
};
