import { useState, useRef, useEffect } from "react";
import avatar from "../../../assets/avatar.svg";
import "./Avatar.scss";
import { useAuthStore } from "../../../../agent-launcher/store/authStore";

const Avatar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const { userName, userEmail } = useAuthStore();

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        avatarRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div
      className="psp-avatar"
      ref={avatarRef}
      onClick={toggleMenu}
      onMouseEnter={(e) => e.preventDefault()}
      onMouseLeave={(e) => e.preventDefault()}
      style={{ backgroundImage: `url(${avatar})` }}
    >
      <div
        className={`psp-avatar__menu ${
          isMenuOpen ? "psp-avatar__menu--open" : ""
        }`}
        ref={menuRef}
        onMouseEnter={(e) => e.stopPropagation()}
        onMouseLeave={(e) => e.stopPropagation()}
      >
        <div className="psp-avatar__menu--user-info">
          <div className="psp-avatar__menu--user-info-avatar">
            <img src={avatar} alt="avatar" />
          </div>
          <div className="psp-avatar__menu--user-info-details">
            <span className="psp-avatar__menu--user-info-name">
              {userName || "Test User"}
            </span>
            <span className="psp-avatar__menu--user-info-email">
              {userEmail || "test-user@test-agents.com"}
            </span>
          </div>
        </div>
        {/* <div className="psp-avatar__menu--separator"></div> */}
      </div>
    </div>
  );
};

export { Avatar };
