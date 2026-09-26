import { useState, useEffect } from "react";
import { Typography } from "@mui/material";
import { useStyles } from "../../../../styling";
import globalStyles from "core/Styles/globalStyles";
import HighlightedRenderer from "../../../HighlightedRenderer";

const QuestionBulletIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '16px', height: '16px', marginRight: '8px', flexShrink: 0, marginTop: '2px' }}
  >
    <path 
      d="M15 8.014C13.1837 8.12552 11.4708 8.89734 10.1841 10.1841C8.89734 11.4708 8.12552 13.1837 8.014 15H7.986C7.87469 13.1836 7.10294 11.4706 5.81615 10.1839C4.52936 8.89706 2.81639 8.12531 1 8.014V7.986C2.81639 7.87469 4.52936 7.10294 5.81615 5.81615C7.10294 4.52936 7.87469 2.81639 7.986 1H8.014C8.12552 2.81631 8.89734 4.52916 10.1841 5.81591C11.4708 7.10266 13.1837 7.87448 15 7.986V8.014Z" 
      fill="url(#paint0_linear_24282_50142)"
    />
    <defs>
      <linearGradient 
        id="paint0_linear_24282_50142" 
        x1="6.5" 
        y1="5" 
        x2="12" 
        y2="13.5" 
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#B3BDF8"/>
        <stop offset="1" stopColor="#FF9D9F"/>
      </linearGradient>
    </defs>
  </svg>
);

const ChevronRightIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '16px', height: '16px', marginLeft: '8px', flexShrink: 0 }}
  >
    <path 
      d="M9 18L15 12L9 6" 
      stroke="#9CA3AF" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

const QuestionsContent = ({ bodyText, props }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [visibleQuestions, setVisibleQuestions] = useState(0);

  useEffect(() => {
    if (bodyText && bodyText.length > 0) {
      // Show first question immediately
      setVisibleQuestions(1);
      
      // Show remaining questions with staggered delay
      bodyText.slice(1).forEach((_, index) => {
        setTimeout(() => {
          setVisibleQuestions(prev => prev + 1);
        }, (index + 1) * 200); // 200ms delay between each question
      });
    }
  }, [bodyText]);

  const getAnimationStyle = (index) => {
    const isVisible = index < visibleQuestions;
    return {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transitionDelay: index === 0 ? '0ms' : '0ms' // No additional delay since we handle it with state
    };
  };

  return (
    <div
      className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${classes.gptQuestionContainer}`}
    >
      {bodyText.map((data, index) => {
        const callBack = data.interactable && props
          ? Object.entries(props).filter(
              (entry) => entry[0] === data.actionName
            )?.[0]?.[1]
          : null;

        return (
          <div
            key={index}
            className={`${globalClasses.layoutAlignStart} ${classes.gptQuestionBlock}`}
            style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              width: '100%',
              // marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'linear-gradient(90deg, rgba(239, 242, 250, 0.40) 0%, #EFF2FA 100%)',
              cursor: data.interactable ? 'pointer' : 'default',
              minHeight: '48px',
              ...getAnimationStyle(index)
            }}
            onClick={() => {
              callBack && callBack(data);
            }}
          >
            <QuestionBulletIcon />
            <Typography
              component="span"
              variant="body1"
              style={{
                flex: 1,
                color: '#8B92B2',
                fontSize: '14px',
                lineHeight: '1.5',
                fontWeight: 400
              }}
            >
              <HighlightedRenderer sentence={data.displayText} />
            </Typography>
            <ChevronRightIcon />
          </div>
        );
      })}
    </div>
  );
};

export default QuestionsContent;
