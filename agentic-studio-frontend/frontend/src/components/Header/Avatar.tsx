import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../services";
import avatar from "../../assets/images/avatar.svg";
import settingsIcon from "../../assets/images/settings.svg";
import logoutIcon from "../../assets/images/logout.svg";
import profileIcon from "../../assets/images/profile.svg";

const Avatar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const userInfo = AuthService.getUserInfo();

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

  const handleMenuItemClick = (action: string) => {
    switch(action) {
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'logout':
        AuthService.logout();
        navigate('/login');
        break;
    }
    setIsMenuOpen(false); // Close menu after action
  };

  return (
    <div className="avatar" ref={avatarRef} onClick={toggleMenu} style={{ backgroundImage: `url(${userInfo?.picture || avatar})` }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.75" fill="#228C54" stroke="white" strokeWidth="2.5"/>
        </svg>
        <div className={`avatar__menu ${isMenuOpen ? 'avatar__menu--open' : ''}`} ref={menuRef}>
            <div className="avatar__menu--user-info">
                <div className="avatar__menu--user-info-avatar">
                    <img src={userInfo?.picture || avatar} alt="avatar" />
                </div>
                <div className="avatar__menu--user-info-details">
                    <span className="avatar__menu--user-info-name body-medium--medium">{userInfo?.name}</span>
                    <span className="avatar__menu--user-info-email body-small">{userInfo?.email}</span>
                </div>
            </div>
            
            <div className="avatar__menu--separator"></div>
            
            <div className="avatar__menu--items">
                <div className="avatar__menu--item" onClick={() => handleMenuItemClick('profile')}>
                    <img src={profileIcon} alt="profile" />
                    <span className="body-medium">My profile</span>
                </div>
                
                <div className="avatar__menu--item" onClick={() => handleMenuItemClick('settings')}>
                    <img src={settingsIcon} alt="settings" />
                    <span className="body-medium">Account settings</span>
                </div>
                
                <div className="avatar__menu--item" onClick={() => handleMenuItemClick('logout')}>
                    <img src={logoutIcon} alt="logout" />
                    <span className="body-medium">Log-out</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Avatar;