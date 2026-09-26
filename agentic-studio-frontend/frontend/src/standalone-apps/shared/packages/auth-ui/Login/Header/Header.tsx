import "./Header.scss";
export const Header = ({ logo }: { logo: string }) => {
  return (
    <div className="login-header">
      <div className="login-header-logo">
        <img src={logo} alt="logo" />
      </div>
      <div className="login-header-title">
        <span>Agentic Retail Automation Platform</span>
      </div>
    </div>
  );
};
