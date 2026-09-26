import React from "react";
import CloseIcon from "@mui/icons-material/Close";

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M9 13.5C9.255 13.5 9.4689 13.4136 9.6417 13.2408C9.8145 13.068 9.9006 12.854 9.9 12.599V8.955C9.9 8.7 9.8136 8.4875 9.6408 8.3175C9.468 8.1475 9.254 8.0625 8.999 8.0625C8.744 8.0625 8.5304 8.1489 8.3583 8.3217C8.1861 8.4945 8.1 8.7085 8.1 8.964V12.608C8.1 12.863 8.1864 13.0755 8.3592 13.2455C8.532 13.4155 8.746 13.5005 9.001 13.5005L9 13.5ZM9 6.75C9.2625 6.75 9.4844 6.6625 9.6656 6.4875C9.8469 6.3125 9.9375 6.0938 9.9375 5.8313C9.9375 5.5688 9.8469 5.3469 9.6656 5.1656C9.4844 4.9844 9.2625 4.8938 9 4.8938C8.7375 4.8938 8.5156 4.9844 8.3344 5.1656C8.1531 5.3469 8.0625 5.5688 8.0625 5.8313C8.0625 6.0938 8.1531 6.3125 8.3344 6.4875C8.5156 6.6625 8.7375 6.75 9 6.75ZM9 18C7.7625 18 6.6 17.7625 5.5125 17.2875C4.425 16.8125 3.4813 16.1688 2.6813 15.3563C1.8813 14.5438 1.2438 13.5938 0.769 12.5063C0.294 11.4188 0.0565 10.2563 0.0565 9.019C0.0565 7.7815 0.294 6.619 0.769 5.5315C1.244 4.444 1.8813 3.5 2.6813 2.7C3.4813 1.9 4.425 1.2625 5.5125 0.7875C6.6 0.3125 7.7625 0.075 9 0.075C10.2375 0.075 11.4 0.3125 12.4875 0.7875C13.575 1.2625 14.5188 1.9 15.3188 2.7C16.1188 3.5 16.7563 4.444 17.2313 5.532C17.7063 6.62 17.9438 7.7825 17.9438 9.0195C17.9438 10.2565 17.7063 11.419 17.2313 12.5065C16.7563 13.594 16.1188 14.5375 15.3188 15.3375C14.5188 16.1375 13.575 16.775 12.4875 17.25C11.4 17.725 10.2375 17.9625 9 17.9625V18Z"
      fill="#4259EE"
    />
  </svg>
);

const SuccessIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <circle cx="10" cy="10" r="10" fill="#1F9D57" />
    <path
      d="M5.75 10.25L8.5 13L14.25 7.25"
      stroke="#FFFFFF"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VARIANT_STYLES = {
  info: { background: "#E2F4FF", Icon: InfoIcon },
  success: { background: "#E7F6ED", Icon: SuccessIcon },
};

const InfoBanner = ({
  message,
  onClose,
  variant = "info",
  fullWidth = false,
  centered = false,
  style = {},
  className = "",
}) => {
  const { background, Icon } = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 16px",
        borderRadius: "8px",
        borderStyle: "solid",
        borderColor: "transparent",
        borderWidth: "1px",
        background,
        boxSizing: "border-box",
        minWidth: fullWidth ? undefined : "370px",
        width: fullWidth ? "100%" : undefined,
        gap: "16px",
        ...style,
      }}
    >
      {centered ? (
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "16px" }}>
          <Icon />
          <span
            style={{
              fontFamily: "Manrope",
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: "21px",
              color: "#0D152C",
            }}
          >
            {message}
          </span>
        </div>
      ) : (
        <>
          <Icon />
          <span
            style={{
              flex: 1,
              fontFamily: "Manrope",
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: "21px",
              color: "#0D152C",
            }}
          >
            {message}
          </span>
        </>
      )}
      <CloseIcon
        style={{
          fontSize: "18px",
          color: "#5C5F62",
          cursor: "pointer",
          marginLeft: fullWidth ? "16px" : "64px",
        }}
        onClick={onClose}
      />
    </div>
  );
};

export default InfoBanner;
