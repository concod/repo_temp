export const BellIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 8.5C6 5.46243 8.46243 3 11.5 3C14.5376 3 17 5.46243 17 8.5V11.5C17 12.163 17.2634 12.7989 17.7322 13.2678L18.2322 13.7678C18.8137 14.3492 18.4014 15.3333 17.5858 15.3333H5.41421C4.59862 15.3333 4.18629 14.3492 4.76777 13.7678L5.26777 13.2678C5.73656 12.7989 6 12.163 6 11.5V8.5Z"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M10 18.5C10.4739 19.4019 11.6931 19.7397 12.595 19.2658C12.9474 19.0785 13.2344 18.7914 13.4216 18.439C13.586 18.1316 13.1201 17.8333 12.6167 17.8333H10.8833C10.38 17.8333 9.91399 18.1316 10.0784 18.439Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const MicIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 14C13.6569 14 15 12.6569 15 11V6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6V11C9 12.6569 10.3431 14 12 14Z"
      stroke="#404B62"
      strokeWidth="1.5"
    />
    <path
      d="M18 10.5V11C18 13.7614 15.7614 16 13 16H11C8.23858 16 6 13.7614 6 11V10.5"
      stroke="#404B62"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 16V19"
      stroke="#404B62"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M9.5 19.5H14.5"
      stroke="#404B62"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const EqualizerIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7 6V18"
      stroke="#404B62"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 9V15"
      stroke="#404B62"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M17 5V19"
      stroke="#404B62"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const SendIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 6L15 12L9 18"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ClockIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="9" stroke="#404B62" strokeWidth="1.5" />
    <path
      d="M12 7V12L15 15"
      stroke="#404B62"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DeepResearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="2" fill="#404B62" />
    <circle cx="12" cy="5" r="1.5" fill="#404B62" />
    <circle cx="12" cy="19" r="1.5" fill="#404B62" />
    <circle cx="5" cy="12" r="1.5" fill="#404B62" />
    <circle cx="19" cy="12" r="1.5" fill="#404B62" />
    <circle cx="7.05" cy="7.05" r="1.5" fill="#404B62" />
    <circle cx="16.95" cy="16.95" r="1.5" fill="#404B62" />
    <circle cx="7.05" cy="16.95" r="1.5" fill="#404B62" />
    <circle cx="16.95" cy="7.05" r="1.5" fill="#404B62" />
  </svg>
);

export const HistoryIcon = ({ color = "#0D152C" }: { color?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.5 4.5H9.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6.5 9.5H13.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6.5 14.5H11.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <rect
      x="4"
      y="4"
      width="14"
      height="16"
      rx="2"
      stroke={color}
      strokeWidth="1.5"
    />
  </svg>
);

export const DocumentIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14 3H8C6.89543 3 6 3.89543 6 5V19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19V7L14 3Z"
      stroke="#7A8294"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M14 3V7H18" stroke="#7A8294" strokeWidth="1.5" />
    <path
      d="M9 11.5H15"
      stroke="#7A8294"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M9 15H13"
      stroke="#7A8294"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const DeleteIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.5 4.5H14.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M5 6.5H19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M18 6.5L17.2679 17.5039C17.1473 19.252 15.6875 20.5833 13.9347 20.5H10.0653C8.31247 20.5833 6.85267 19.252 6.73208 17.5039L6 6.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M10 11L10.5 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M14 11L13.5 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const AddIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 6V18"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M18 12L6 12"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const CollapseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 9L5 12L9 15"
      stroke="#60697D"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 9L19 12L15 15"
      stroke="#60697D"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MoreIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="6" cy="12" r="1.5" fill="#60697D" />
    <circle cx="12" cy="12" r="1.5" fill="#60697D" />
    <circle cx="18" cy="12" r="1.5" fill="#60697D" />
  </svg>
);

export const DownloadIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 4V15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M8 11L12 15L16 11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 18.5H18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

