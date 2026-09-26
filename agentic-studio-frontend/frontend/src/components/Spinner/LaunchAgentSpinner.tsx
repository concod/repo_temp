import { useState, useEffect } from "react";
import spinnerIcon from "../../assets/images/neutral.svg";
import successIcon from "../../assets/images/success-bot.svg";

// SVG Icon Components
const NeuralIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
  >
    <path
      d="M12.9998 5.21176C13.0011 4.76625 12.9133 4.32498 12.7416 3.9139C12.5699 3.50281 12.3177 3.13022 11.9998 2.81803C11.682 2.50583 11.305 2.26035 10.8909 2.09601C10.4768 1.93167 10.034 1.85179 9.5886 1.86108C9.14319 1.87036 8.70413 1.96862 8.29725 2.15007C7.89037 2.33152 7.52388 2.59251 7.21933 2.91767C6.91479 3.24283 6.67834 3.62561 6.5239 4.0435C6.36945 4.46138 6.30013 4.90592 6.32001 5.35099C5.66528 5.51933 5.05746 5.83446 4.54255 6.27249C4.02765 6.71053 3.61918 7.25999 3.34807 7.87927C3.07696 8.49854 2.95033 9.17139 2.97776 9.84685C3.0052 10.5223 3.18598 11.1827 3.50641 11.7779C2.943 12.2356 2.49996 12.8241 2.21583 13.4921C1.9317 14.1601 1.81509 14.8874 1.87614 15.6107C1.93718 16.334 2.17404 17.0315 2.5661 17.6424C2.95817 18.2533 3.49356 18.7592 4.12571 19.116C4.04765 19.72 4.09424 20.3335 4.26259 20.9188C4.43095 21.5041 4.7175 22.0486 5.10455 22.5188C5.4916 22.9889 5.97094 23.3748 6.51295 23.6525C7.05496 23.9301 7.64814 24.0937 8.25586 24.1332C8.86358 24.1726 9.47293 24.087 10.0463 23.8817C10.6196 23.6765 11.1448 23.3558 11.5894 22.9396C12.034 22.5234 12.3885 22.0204 12.6311 21.4618C12.8736 20.9032 12.9991 20.3009 12.9998 19.6919V5.21176Z"
      stroke="currentColor"
      strokeWidth="1.94418"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 5.21176C12.9987 4.76625 13.0865 4.32498 13.2582 3.9139C13.4299 3.50281 13.6821 3.13022 14 2.81803C14.3178 2.50583 14.6948 2.26035 15.1089 2.09601C15.523 1.93167 15.9658 1.85179 16.4112 1.86108C16.8566 1.87036 17.2957 1.96862 17.7026 2.15007C18.1094 2.33152 18.4759 2.59251 18.7805 2.91767C19.085 3.24283 19.3215 3.62561 19.4759 4.0435C19.6303 4.46138 19.6997 4.90592 19.6798 5.35099C20.3345 5.51933 20.9423 5.83446 21.4572 6.27249C21.9722 6.71053 22.3806 7.25999 22.6517 7.87927C22.9228 8.49854 23.0495 9.17139 23.022 9.84685C22.9946 10.5223 22.8138 11.1827 22.4934 11.7779C23.0568 12.2356 23.4998 12.8241 23.784 13.4921C24.0681 14.1601 24.1847 14.8874 24.1237 15.6107C24.0626 16.334 23.8258 17.0315 23.4337 17.6424C23.0416 18.2533 22.5062 18.7592 21.8741 19.116C21.9521 19.72 21.9056 20.3335 21.7372 20.9188C21.5689 21.5041 21.2823 22.0486 20.8952 22.5188C20.5082 22.9889 20.0289 23.3748 19.4869 23.6525C18.9448 23.9301 18.3517 24.0937 17.7439 24.1332C17.1362 24.1726 16.5269 24.087 15.9535 23.8817C15.3802 23.6765 14.855 23.3558 14.4104 22.9396C13.9658 22.5234 13.6113 22.0204 13.3687 21.4618C13.1262 20.9032 13.0007 20.3009 13 19.6919V5.21176Z"
      stroke="currentColor"
      strokeWidth="1.94418"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.3418 14.1222C15.4066 13.7932 14.59 13.1943 13.9952 12.4013C13.4005 11.6082 13.0542 10.6566 13.0002 9.66677C12.9462 10.6566 12.6 11.6082 12.0052 12.4013C11.4104 13.1943 10.5938 13.7932 9.65865 14.1222M19.2367 6.88213C19.5063 6.41497 19.6587 5.88949 19.6811 5.35059M6.32043 5.35059C6.34246 5.88939 6.49456 6.41487 6.76374 6.88213M3.50684 11.7786C3.7106 11.6127 3.92866 11.4651 4.15844 11.3375M21.842 11.3375C22.0718 11.4651 22.2898 11.6127 22.4936 11.7786M6.31709 19.6915C5.54945 19.6918 4.79475 19.4938 4.12614 19.1167M21.8743 19.1167C21.2057 19.4938 20.451 19.6918 19.6833 19.6915"
      stroke="currentColor"
      strokeWidth="1.94418"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SmartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
  >
    <path
      d="M19.9997 25.335C21.5997 20.431 23.3677 18.6616 27.9997 17.335C23.3677 16.0083 21.5997 14.239 19.9997 9.33496C18.3997 14.239 16.6317 16.0083 11.9997 17.335C16.6317 18.6616 18.3997 20.431 19.9997 25.335ZM9.33301 13.335C10.133 10.8816 11.017 9.99763 13.333 9.33496C11.017 8.67229 10.133 7.78829 9.33301 5.33496C8.53301 7.78829 7.64901 8.67229 5.33301 9.33496C7.64901 9.99763 8.53301 10.8816 9.33301 13.335ZM11.333 26.6683C11.733 25.4416 12.1743 25.0003 13.333 24.6683C12.1743 24.3363 11.733 23.895 11.333 22.6683C10.933 23.895 10.4917 24.3363 9.33301 24.6683C10.4917 25.0003 10.933 25.4416 11.333 26.6683Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const FastIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M22.8814 7.91994H15.7378L22.1615 1.20984C22.2945 1.06775 22.1745 0.861328 21.9573 0.861328H9.5216C9.43081 0.861328 9.34326 0.901541 9.29786 0.968561L0.896092 12.9653C0.795569 13.1073 0.91879 13.287 1.11984 13.287H6.77506L3.87611 22.8736C3.8145 23.0827 4.11931 23.2301 4.30738 23.08L23.0598 8.28722C23.2284 8.15586 23.1149 7.91994 22.8814 7.91994ZM7.64734 17.9248L9.60267 11.464H4.4987L10.6468 2.68697H17.9299L11.1754 9.74559H18.0174L7.64734 17.9248Z"
      fill="currentColor"
    />
  </svg>
);

const LaunchAgentSpinner = () => {
  const [progress, setProgress] = useState(10);
  const [currentStage, setCurrentStage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  const progressStages = [10, 35, 50, 100];
  const stageDescriptions = [
    "Initialising agent core...",
    "Loading context...",
    "Connecting to data sources/APIs... ",
    "Testing agent readiness...",
  ];

  useEffect(() => {
    const intervals: number[] = [];

    // Stage progression with delays
    const stageDelays = [1000, 1000, 1000, 1000]; // delays between stages in ms

    let currentDelay = 0;
    progressStages.forEach((targetProgress, index) => {
      currentDelay += stageDelays[index];

      const timeout = setTimeout(() => {
        setCurrentStage(index);
        setProgress(targetProgress);

        if (index === progressStages.length - 1) {
          setTimeout(() => {
            setIsComplete(true);
            // Hide the spinner after showing completion for 1.5 seconds
            setTimeout(() => {
              setShouldHide(true);
            }, 1500);
          }, 500);
        }
      }, currentDelay) as unknown as number;

      intervals.push(timeout);
    });

    return () => {
      intervals.forEach(clearTimeout);
    };
  }, []);

  const badges = [
    {
      icon: <NeuralIcon />,
      title: "Neural",
    },
    {
      icon: <SmartIcon />,
      title: "Smart",
    },
    {
      icon: <FastIcon />,
      title: "Fast",
    },
  ];

  // Don't render if should hide
  if (shouldHide) {
    return null;
  }

  return (
    <div className="launch-spinner">
      <div className={`spinner`}>
        {/* Main Spinner SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="77"
          height="77"
          viewBox="0 0 77 77"
          fill="none"
          className="spinner__svg"
        >
          <circle
            cx="38.5"
            cy="38.5"
            r="32.5"
            fill="none"
            stroke="url(#paint0_linear_circle)"
            strokeWidth="10.8931"
          />
          <path
            d="M71.3589 38.6794C71.3589 38.7479 71.3587 38.8163 71.3582 38.8848"
            stroke="url(#paint0_linear_2342_5467)"
            strokeWidth="10.8931"
            className="spinner__gradient-path"
          />
          <defs>
            <linearGradient
              id="paint0_linear_2342_5467"
              x1="38.6794"
              y1="6"
              x2="38.6794"
              y2="71.3589"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#A3A1FF" />
              <stop offset="1" stopColor="#A93BFF" />
            </linearGradient>
            <linearGradient
              id="paint0_linear_circle"
              x1="6"
              y1="38.6794"
              x2="71.3589"
              y2="38.6794"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#A3A1FF" />
              <stop offset="1" stopColor="#A93BFF" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Image */}
        <div className="spinner__center-image">
          <img
            src={spinnerIcon}
            alt="spinner icon"
            className="spinner__image"
          />
        </div>
      </div>
      <div className="launch-spinner__content">
        <span className="headline-2 launch-spinner__content-title">
          Launching Agent
        </span>
        <span className="headline-4 launch-spinner__content-description">
          {stageDescriptions[currentStage]}
        </span>
      </div>
      <div className="launch-spinner__progress">
        <div className="launch-spinner__progress-header">
          <span className="launch-spinner__progress-header-title">
            Progress
          </span>
          <span className="launch-spinner__progress-header-percentage">
            {progress}%
          </span>
        </div>
        <div className="launch-spinner__progress-bar">
          <div
            className="launch-spinner__progress-bar-fill"
            style={{ width: `${(progress / 100) * 292}px` }}
          ></div>
        </div>
        <div className="launch-spinner__progress-footer">
          <div className="launch-spinner__progress-footer-badges">
            {badges.map((badge, index) => (
              <div
                key={index}
                className={`launch-spinner__progress-footer-badges-item ${
                  index < currentStage ? "active" : ""
                }`}
              >
                <div className="launch-spinner__progress-footer-badges-item-body">
                  <div className="launch-spinner__progress-footer-badges-item-body-icon">
                    {badge.icon}
                  </div>
                  <div className="launch-spinner__progress-footer-badges-item-body-title">
                    <span>{badge.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {isComplete && (
            <div className="launch-spinner__progress-footer-text">
              <img src={successIcon} alt="success icon" />
              <span>Agent successfully launched</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaunchAgentSpinner;
