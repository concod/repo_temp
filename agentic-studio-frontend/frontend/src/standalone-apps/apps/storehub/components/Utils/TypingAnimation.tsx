import React, { useState, useEffect, useRef } from 'react';
import { MarkdownRenderer } from '../../utils/markdownRenderer';

interface TypingAnimationProps {
  text: string | null | undefined;
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
  // Handle null/undefined text
  const safeText = text || '';
  
  // Early return if no text
  if (!safeText) {
    React.useEffect(() => {
      onComplete?.();
    }, [onComplete]);
    return <div className={className} />;
  }
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
      while (element && !element.classList.contains('psp-storehub-messages')) {
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
    
    while (charsRevealed < targetCharsToReveal && newIndex < safeText.length) {
      const nextSafeEnd = findNextChunkEnd(safeText, newIndex);
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
      setDisplayedText(safeText.substring(0, newIndex));
      setCurrentIndex(newIndex);
      
      // Throttled scrolling for performance
      if (Math.random() < 0.3) {
        setTimeout(scrollToBottom, 0);
      }
    }
  };

  // Function to find the next safe stopping point for markdown
  const findNextChunkEnd = (textContent: string, startIndex: number): number => {
    const index = startIndex;
    
    // If we're in the middle of markdown syntax, find the end
    if (textContent.charAt(index) === '*') {
      // Handle bold/italic markdown
      if (textContent.charAt(index + 1) === '*') {
        // Bold text **text**
        const closingIndex = textContent.indexOf('**', index + 2);
        if (closingIndex !== -1) {
          return closingIndex + 2; // Include the closing **
        }
      } else {
        // Italic text *text*
        const closingIndex = textContent.indexOf('*', index + 1);
        if (closingIndex !== -1) {
          return closingIndex + 1; // Include the closing *
        }
      }
    }
    
    // Handle links [text](url)
    if (textContent.charAt(index) === '[') {
      const closingBracket = textContent.indexOf(']', index);
      if (closingBracket !== -1 && textContent.charAt(closingBracket + 1) === '(') {
        const closingParen = textContent.indexOf(')', closingBracket + 1);
        if (closingParen !== -1) {
          return closingParen + 1; // Include the closing )
        }
      }
    }
    
    // Handle headers ### text
    if (textContent.charAt(index) === '#') {
      const lineEnd = textContent.indexOf('\n', index);
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
      if (!controllerRef.current || currentIndex >= safeText.length) {
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
          safeText.length - currentIndex
        );
        
        if (charsToReveal > 0) {
          revealCharacters(charsToReveal);
        }
      }
      
      if (currentIndex < safeText.length && !isComplete) {
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
