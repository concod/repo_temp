import React, { useState, useEffect, useRef } from 'react';
import './NegativeCustomerThemes.scss';
import ShareIcon from "../../../assets/share-button.svg";
import type {ThemeSection, ThemeItem} from '../../../types/dashboard.types';
import { NoData } from '../NoData';

interface ThemesProps extends ThemeSection {
  gradientStart: string;
  gradientEnd: string;
  icon: React.ReactNode;
  iconBackground: string;
}

export const NegativeCustomerThemes: React.FC<ThemesProps> = ({
  title = "",
  items = [],
  gradientStart = "",
  gradientEnd = "",
  icon = null,
  iconBackground = ""
}) => {
  const [selectedItem, setSelectedItem] = useState<ThemeItem | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleButtonClick = (item: ThemeItem, button: HTMLButtonElement) => {
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
      setButtonPosition(null);
    } else {
      const rect = button.getBoundingClientRect();
      setButtonPosition({
        top: rect.top,
        left: rect.left
      });
      setSelectedItem(item);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (overlayRef.current && !overlayRef.current.contains(target)) {
        // Check if click is on a comments button
        const clickedButton = (target as Element).closest('.negative-customer-themes__comments-button');
        if (!clickedButton) {
          setSelectedItem(null);
          setButtonPosition(null);
        }
      }
    };

    if (selectedItem) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedItem]);

  const CircularProgress: React.FC<{ percentage: number; size?: number }> = ({
    percentage,
    size = 64,
  }) => {
    const strokeWidth = 6;
    const center = 50;
    const r = center - strokeWidth / 2;
    const circumference = 2 * Math.PI * r;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
    const darkStart = gradientEnd;   
    const lightEnd = gradientStart;  
    // const gradientStopPosition = Math.min(percentage, 100);
  
    return (
      <div className="circular-progress" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className="circular-progress-svg"
        >
          <defs>
            <linearGradient 
              id={gradientId} 
              x1="50%" 
              y1="0%" 
              x2="50%" 
              y2="100%"
              gradientUnits="objectBoundingBox"
              spreadMethod="pad"
            >
              <stop offset="0%" stopColor={darkStart} />
              <stop offset="100%" stopColor={lightEnd} />
              {/* <stop offset="100%" stopColor={lightEnd} /> */}
            </linearGradient>
          </defs>
  
          {/* Track */}
          <circle
            stroke="#F5F6FA"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={r}
            cx={center}
            cy={center}
          />
          {/* Progress */}
          <circle
            stroke={`url(#${gradientId})`}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={{ strokeDashoffset }}
            r={r}
            cx={center}
            cy={center}
            className="circular-progress-bar"
          />
        </svg>
  
        <div className="circular-progress-text">
          <span className="percentage">{percentage}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="negative-customer-themes">
      <div className="negative-customer-themes__header">
        <div className="negative-customer-themes__title-section">
          <div className="negative-customer-themes__icon" style={{ backgroundColor: iconBackground }}>
          {icon}
          </div>
          <div className="negative-customer-themes__title-text">
            <h3 className="negative-customer-themes__title">{title}</h3>
          </div>
        </div>
        <div className="negative-customer-themes__share">
          <img src={ShareIcon} alt="Share" />
        </div>
      </div>

      {
        items.length === 0 ? (<NoData title="No Neutral Themes available" description="No neutral themes available for this district for this week" />) : (<div className="negative-customer-themes__content">
          <div className="negative-customer-themes__list">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="negative-customer-themes__item">
                  <div className="negative-customer-themes__progress-section">
                    <CircularProgress percentage={item.percentage} size={47}/>
                  </div>
                  
                  <div className="negative-customer-themes__details">
                    <h4 className="negative-customer-themes__theme-title">{item.title}</h4>
                    <div className="negative-customer-themes__description-section">
                      <p className="negative-customer-themes__description">{item.description}</p>
                    </div>
                    
                  </div>
                  <div className='negative-customer-themes__comments'>
                    <button 
                      ref={(el) => {
                        if (el) {
                          buttonRefs.current.set(item.id, el);
                        } else {
                          buttonRefs.current.delete(item.id);
                        }
                      }}
                      className={`negative-customer-themes__comments-button ${selectedItem?.id === item.id ? 'negative-customer-themes__comments-button--active' : ''}`}
                      onClick={(e) => handleButtonClick(item, e.currentTarget)}
                    >
                      {selectedItem?.id === item.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M3.08643 0.380346C4.00006 0.00190768 5.00568 -0.09676 5.97559 0.0961662C6.94543 0.289112 7.83642 0.765104 8.53564 1.46433C9.23487 2.16356 9.71086 3.05454 9.90381 4.02439C10.0967 4.99429 9.99807 5.99992 9.61963 6.91355C9.24119 7.82714 8.60004 8.60781 7.77783 9.1572C6.95559 9.70661 5.98891 9.99998 5 9.99998C4.23923 9.99998 3.51636 9.82958 2.86914 9.5239L0.600586 9.98972C0.435953 10.0235 0.265323 9.97233 0.146484 9.85349C0.027646 9.73465 -0.0235308 9.56402 0.0102539 9.39939L0.476074 7.13035C0.170528 6.48331 0 5.76107 0 4.99997C3.77066e-07 4.01107 0.293367 3.04439 0.842773 2.22214C1.39217 1.39993 2.17283 0.75878 3.08643 0.380346ZM1 4.99997C1 5.66237 1.15997 6.28518 1.44385 6.83347C1.49648 6.93512 1.51276 7.0519 1.48975 7.16404L1.14209 8.8574L2.83594 8.51023L2.92041 8.50046C3.00536 8.49773 3.0902 8.51662 3.1665 8.55613C3.71477 8.83999 4.33808 8.99998 5 8.99998C5.79113 8.99998 6.56437 8.76518 7.22217 8.32566C7.87993 7.88615 8.39256 7.26159 8.69531 6.53074C8.99805 5.79987 9.07765 4.99559 8.92334 4.2197C8.769 3.44378 8.38802 2.73077 7.82861 2.17136C7.2692 1.61195 6.5562 1.23098 5.78027 1.07663C5.00439 0.922327 4.2001 1.00193 3.46924 1.30466C2.73838 1.60742 2.11382 2.12005 1.67432 2.77781C1.23479 3.4356 1 4.20885 1 4.99997Z" fill="#26734B"/>
                          <path d="M1 4.99997C1 5.66237 1.15997 6.28518 1.44385 6.83347C1.49648 6.93512 1.51276 7.0519 1.48975 7.16404L1.14209 8.8574L2.83594 8.51023L2.92041 8.50046C3.00536 8.49773 3.0902 8.51662 3.1665 8.55613C3.71477 8.83999 4.33808 8.99998 5 8.99998C5.79113 8.99998 6.56437 8.76518 7.22217 8.32566C7.87993 7.88615 8.39256 7.26159 8.69531 6.53074C8.99805 5.79987 9.07765 4.99559 8.92334 4.2197C8.769 3.44378 8.38802 2.73077 7.82861 2.17136C7.2692 1.61195 6.5562 1.23098 5.78027 1.07663C5.00439 0.922327 4.2001 1.00193 3.46924 1.30466C2.73838 1.60742 2.11382 2.12005 1.67432 2.77781C1.23479 3.4356 1 4.20885 1 4.99997Z" fill="#26734B"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path className="negative-customer-themes__comments-icon" d="M3.08643 0.380346C4.00006 0.00190768 5.00568 -0.09676 5.97559 0.0961662C6.94543 0.289112 7.83642 0.765104 8.53564 1.46433C9.23487 2.16356 9.71086 3.05454 9.90381 4.02439C10.0967 4.99429 9.99807 5.99992 9.61963 6.91355C9.24119 7.82714 8.60004 8.60781 7.77783 9.1572C6.95559 9.70661 5.98891 9.99998 5 9.99998C4.23923 9.99998 3.51636 9.82958 2.86914 9.5239L0.600586 9.98972C0.435953 10.0235 0.265323 9.97233 0.146484 9.85349C0.027646 9.73465 -0.0235308 9.56402 0.0102539 9.39939L0.476074 7.13035C0.170528 6.48331 0 5.76107 0 4.99997C3.77066e-07 4.01107 0.293367 3.04439 0.842773 2.22214C1.39217 1.39993 2.17283 0.75878 3.08643 0.380346ZM1 4.99997C1 5.66237 1.15997 6.28518 1.44385 6.83347C1.49648 6.93512 1.51276 7.0519 1.48975 7.16404L1.14209 8.8574L2.83594 8.51023L2.92041 8.50046C3.00536 8.49773 3.0902 8.51662 3.1665 8.55613C3.71477 8.83999 4.33808 8.99998 5 8.99998C5.79113 8.99998 6.56437 8.76518 7.22217 8.32566C7.87993 7.88615 8.39256 7.26159 8.69531 6.53074C8.99805 5.79987 9.07765 4.99559 8.92334 4.2197C8.769 3.44378 8.38802 2.73077 7.82861 2.17136C7.2692 1.61195 6.5562 1.23098 5.78027 1.07663C5.00439 0.922327 4.2001 1.00193 3.46924 1.30466C2.73838 1.60742 2.11382 2.12005 1.67432 2.77781C1.23479 3.4356 1 4.20885 1 4.99997Z"/>
                        </svg>
                      )}
                    </button>
                    <div className='negative-customer-themes__comments-label'>Show Comments</div>
                  </div>
                </div>
              ))
            ) : (
              <NoData />
            )}
          </div>
        </div>)
      }

      

      {/* Comments Popover - Outside the container */}
      {selectedItem && buttonPosition && (
        <div 
          className="negative-customer-themes__overlay-content"
          ref={overlayRef}
          style={{
            position: 'fixed',
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            transform: 'translateX(calc(-100% - 8px))'
          }}
        >
          <div className="negative-customer-themes__overlay-header">
            <h3 className="negative-customer-themes__overlay-title">
              Top comments: {selectedItem.title}
            </h3>
            <button 
              className="negative-customer-themes__overlay-close"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(null);
                setButtonPosition(null);
              }}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4L12 12" stroke="#60697D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="negative-customer-themes__overlay-comments">
            {/* <div className="negative-customer-themes__overlay-comment">
                  <p className="negative-customer-themes__overlay-comment-text">The premium dental chews I need were out of stock, and I wasted a trip driving over</p>
                  <div className="negative-customer-themes__overlay-comment-user">
                    <span className="negative-customer-themes__overlay-comment-name">
                      1 day ago
                    </span>
                  </div>
            </div>
            <div className="negative-customer-themes__overlay-comment">
                  <p className="negative-customer-themes__overlay-comment-text">The premium dental chews I need were out of stock, and I wasted a trip driving over</p>
                  <div className="negative-customer-themes__overlay-comment-user">
                    <span className="negative-customer-themes__overlay-comment-name">
                      1 day ago
                    </span>
                  </div>
            </div>
            <div className="negative-customer-themes__overlay-comment">
                  <p className="negative-customer-themes__overlay-comment-text">The premium dental chews I need were out of stock, and I wasted a trip driving over</p>
                  <div className="negative-customer-themes__overlay-comment-user">
                    <span className="negative-customer-themes__overlay-comment-name">
                      1 day ago
                    </span>
                  </div>
            </div>
            <div className="negative-customer-themes__overlay-comment">
                  <p className="negative-customer-themes__overlay-comment-text">The premium dental chews I need were out of stock, and I wasted a trip driving over</p>
                  <div className="negative-customer-themes__overlay-comment-user">
                    <span className="negative-customer-themes__overlay-comment-name">
                      1 day ago
                    </span>
                  </div>
            </div>
            <div className="negative-customer-themes__overlay-comment">
                  <p className="negative-customer-themes__overlay-comment-text">The premium dental chews I need were out of stock, and I wasted a trip driving over</p>
                  <div className="negative-customer-themes__overlay-comment-user">
                    <span className="negative-customer-themes__overlay-comment-name">
                      1 day ago
                    </span>
                  </div>
            </div> */}

            {selectedItem.comments?.top?.map((comment, index) => (
              <div key={index} className="negative-customer-themes__overlay-comment">
                <p className="negative-customer-themes__overlay-comment-text">{comment.text}</p>
                <div className="negative-customer-themes__overlay-comment-user">
                  {/* <div className="negative-customer-themes__overlay-comment-avatar">
                    {comment.text.charAt(0).toUpperCase()}
                  </div> */}
                  <span className="negative-customer-themes__overlay-comment-name">
                    {comment?.date}
                  </span>
                </div>
              </div>
            ))}
            {/* {selectedItem.comments?.examples?.map((example, index) => (
              <div key={`example-${index}`} className="negative-customer-themes__overlay-comment">
                <p className="negative-customer-themes__overlay-comment-text">{example}</p>
                <div className="negative-customer-themes__overlay-comment-user">
                  <div className="negative-customer-themes__overlay-comment-avatar">
                    {example.charAt(0).toUpperCase()}
                  </div>
                  <span className="negative-customer-themes__overlay-comment-name">
                    {example.split(' ')[0]}, 1 hour ago
                  </span>
                </div>
              </div>
            ))} */}
          </div>
        </div>
      )}
    </div>
  );
};
