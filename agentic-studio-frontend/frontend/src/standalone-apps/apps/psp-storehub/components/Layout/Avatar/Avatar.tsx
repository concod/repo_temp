import { useState, useRef, useEffect } from "react";
import avatar from "../../../assets/avatar.svg";
import './Avatar.scss';
import { useAuthStore } from "../../../store/authStore";
import { useNavigate } from "react-router-dom";

const Avatar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userName, userEmail, logout } = useAuthStore();

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout(); // This handles clearing sessionStorage and all auth state
    navigate('/apps/psp-storehub/');
    setIsMenuOpen(false);
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
          className={`psp-avatar__menu ${isMenuOpen ? 'psp-avatar__menu--open' : ''}`} 
          ref={menuRef}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
        >
            <div className="psp-avatar__menu--user-info">
                <div className="psp-avatar__menu--user-info-avatar">
                    <img src={avatar} alt="avatar" />
                </div>
                <div className="psp-avatar__menu--user-info-details">
                    <span className="psp-avatar__menu--user-info-name">{userName || 'User'}</span>
                    <span className="psp-avatar__menu--user-info-email">{userEmail || 'user@example.com'}</span>
                </div>
            </div>
            {/* <div className="psp-avatar__menu--separator"></div> */}
            <div className="psp-avatar__menu--items">

              <div className="psp-avatar__menu--item">
                <div className="psp-avatar__menu--item-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M4.5 8H5.5V7H4.5V8ZM5 0C2.24 0 0 2.24 0 5C0 7.76 2.24 10 5 10C7.76 10 10 7.76 10 5C10 2.24 7.76 0 5 0ZM5 9C2.795 9 1 7.205 1 5C1 2.795 2.795 1 5 1C7.205 1 9 2.795 9 5C9 7.205 7.205 9 5 9ZM5 2C3.895 2 3 2.895 3 4H4C4 3.45 4.45 3 5 3C5.55 3 6 3.45 6 4C6 5 4.5 4.875 4.5 6.5H5.5C5.5 5.375 7 5.25 7 4C7 2.895 6.105 2 5 2Z" fill="#1F2B4D"/>
                  </svg>
                </div>
                <span className="psp-avatar__menu--item-text">Help</span>
              </div>
              <div className="psp-avatar__menu--item">
                <div className="psp-avatar__menu--item-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M7 2.5L6.295 3.205L7.085 4H3V5H7.085L6.295 5.79L7 6.5L9 4.5L7 2.5ZM1 1H4.5V0H1C0.45 0 0 0.45 0 1V8C0 8.55 0.45 9 1 9H4.5V8H1V1Z" fill="#E15554"/>
                  </svg>
                </div>
                <span className="psp-avatar__menu--item-logout"  onClick={handleLogout}>Logout</span>
              </div>
                {/* <div className="psp-avatar__menu--item psp-avatar__menu--item-logout" onClick={handleLogout}>
                    <img src={logoutIcon} alt="logout" />
                    <span>Log out</span>
                </div> */}
            </div>
        </div>
    </div>
  );
};

export { Avatar };
