import { useNavigate } from "react-router-dom";
import "./TopNavbar.scss";

const TopNavbar = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/apps/navigator/home");
  };

  return (
    <nav className="top-nav">
      <button
        className="top-nav__back-button"
        onClick={handleBack}
        aria-label="Go back to home"
      >
        <i className="fa-solid fa-chevron-left"></i>
        Back
      </button>
    </nav>
  );
};

export default TopNavbar;
