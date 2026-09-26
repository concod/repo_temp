import React, { useState, useRef, useEffect } from "react";
import "./Home.scss";
import iaLogo from "../../../../assets/images/ia-logo.svg";
import storeSop from "../assets/store-sop.svg";
import storeNavigator from "../assets/store-navigator.svg";
import storeDataAnalyst from "../assets/store-data-analyst.svg";
import labelCompliance from "../assets/label-compliance.svg";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

interface Bot {
  id: string;
  name: string;
  icon: string;
  url: string;
}

const Home: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout, userEmail, userName } = useAuthStore();
  const navigate = useNavigate();

  const user = {
    name: userName || "Test User",
    email: userEmail || "test-user@test-agents.com",
  };

  const bots: Bot[] = [
    {
      id: "1",
      name: "Store SOP",
      icon: storeSop,
      url: "/apps/sop/chat",
    },
    {
      id: "2",
      name: "Store Navigator",
      icon: storeNavigator,
      url: "/apps/navigator/home",
    },
    {
      id: "3",
      name: "Store Data Analyst",
      icon: storeDataAnalyst,
      url: "/apps/store-data-analyst/dashboard",
    },
    {
      id: "4",
      name: "Label Compliance Checker",
      icon: labelCompliance,
      url: "/apps/label-compliance-agent/chat",
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/apps/agent-studio/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header__logo">
          <div className="logo-icon">
            <img src={iaLogo} />
          </div>
          <span className="logo-text">Store Agents Suite</span>
        </div>

        <div className="home-header__profile" ref={dropdownRef}>
          <button
            className="avatar-btn"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {user.name.charAt(0)}
          </button>

          {isDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown__info">
                <p className="name">{user.name}</p>
                <p className="email">{user.email}</p>
              </div>
              <button
                className="profile-dropdown__item logout"
                onClick={handleLogout}
              >
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="home-content">
        <section className="welcome-section">
          <h1 className="welcome-section__greeting">Hello, {user.name}! 👋</h1>
          <p className="welcome-section__sub">
            How can our 'Store' Agents assist you today?
          </p>
        </section>

        <div className="bot-grid">
          {bots.map((bot) => (
            <a
              key={bot.id}
              href={bot.url}
              onClick={(e) => {
                e.preventDefault();
                window.open(bot.url, "_blank", "noopener,noreferrer");
              }}
              className="bot-card"
            >
              <div className="bot-card__icon">
                <img src={bot.icon} />
              </div>
              <h3 className="bot-card__name">{bot.name}</h3>
              <span className="bot-card__action">
                Open Agent{" "}
                <i className="fa-solid fa-arrow-up-right-from-square"></i>
              </span>
            </a>
          ))}
        </div>
      </main>

      <footer className="home-footer-mob">
        <p className="home-footer-mob__text">
          A product of{" "}
          <a
            href="https://app.impact-agents.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="home-footer-mob__link"
          >
            Agentic Retail Automation Platform
          </a>
        </p>
      </footer>

      <footer className="home-footer">
        <p className="home-footer__text">
          A product of{" "}
          <a
            href="https://app.impact-agents.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="home-footer__link"
          >
            Agentic Retail Automation Platform
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Home;
