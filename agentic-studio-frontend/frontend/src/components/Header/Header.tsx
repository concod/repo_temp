import Avatar from "./Avatar";

const Header = () => {
  return (
    <div className="header">
      <span className="header__text headline-5">
        Agentic Retail Automation Platform
      </span>
      <div className="header__right">
        <div className="header__right-notification">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
          >
            <g clipPath="url(#clip0_2254_7523)">
              <path
                d="M6.4585 12.7083V7.70833C6.4585 6.82428 6.80969 5.97643 7.43481 5.35131C8.05993 4.72619 9.11611 4.375 10.0002 4.375C11.2502 4.375 11.8897 4.72619 12.5148 5.35131C13.1399 5.97643 13.5418 6.82428 13.5418 7.70833V12.7083"
                stroke="#4B5767"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M4.7915 12.7085H15.2082"
                stroke="#4B5767"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.875 14.375C11.7214 14.745 11.4613 15.0612 11.1275 15.2837C10.7938 15.5062 10.4014 15.625 10 15.625C9.59861 15.625 9.20623 15.5062 8.87248 15.2837C8.53873 15.0612 8.27861 14.745 8.125 14.375"
                stroke="#4B5767"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_2254_7523">
                <rect width="20" height="20" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </div>
        <Avatar />
      </div>
    </div>
  );
};

export default Header;
