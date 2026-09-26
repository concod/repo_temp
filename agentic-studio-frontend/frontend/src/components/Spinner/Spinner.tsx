import spinnerIcon from '../../assets/images/neutral.svg';

type SpinnerProps = {
  size?: number;
  className?: string;
};

const Spinner = ({ className = '' }: SpinnerProps) => { // Scale based on original size

  return (
    <div className={`spinner ${className}`} >
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
            <stop stopColor="#A3A1FF"/>
            <stop offset="1" stopColor="#A93BFF"/>
          </linearGradient>
          <linearGradient 
            id="paint0_linear_circle" 
            x1="6" 
            y1="38.6794" 
            x2="71.3589" 
            y2="38.6794" 
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#A3A1FF"/>
            <stop offset="1" stopColor="#A93BFF"/>
          </linearGradient>
        </defs>
      </svg>

      {/* Center Image */}
      <div className="spinner__center-image">
        <img src={spinnerIcon} alt="spinner icon" className="spinner__image" />
      </div>
    </div>
  );
};

export default Spinner;
