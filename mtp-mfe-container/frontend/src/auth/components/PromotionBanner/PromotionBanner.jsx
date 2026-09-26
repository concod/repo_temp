import PromotionBannerLogo from "assets/home/promotionBanner.png";
import PromotionRing1 from "assets/home/promotionBgRings2.png";
import PromotionRing2 from "assets/home/promotionBgRings3.png";
import { Typography } from "@mui/material";
import CloseBannerIcon from "assets/home/closeBannerIcon.svg";
import MinimizedBannerIcon from "assets/home/minimizedBanner.svg";
import { useEffect, useState } from "react";
import "./index.scss";
import { useLocation } from "react-router-dom-v5-compat";

const PromotionBanner = () => {
  const [minimized, setMinimized] = useState(false);
  const REFERRAL_LINK = "https://www.impactanalytics.co/referral";
  const location = useLocation();

  useEffect(() => {
    if(location.pathname.indexOf("home") > -1) {
      setMinimized(true)
    }
    else {
      setMinimized(false);
    }
  },[location])

  return (
    <div className="promotion-banner-container">
      {!minimized ? (
        <div
          className={`promotion-banner ${
            window?.location?.pathname?.includes("login")
              ? "align-login"
              : "align-home"
          } 
          `}
        >
          <img src={PromotionRing2} className="promotion-banner-ring1" />
          <img
            src={PromotionBannerLogo}
            alt="Referral vector"
            className="promotion-banner-logo"
          />
          <div className="promotion-banner-content">
            <Typography variant="h4" className="content-heading">
              Refer & Earn $250 -{" "}
            </Typography>
            &nbsp;
            <Typography variant="span" className="content-text">
              Spread the Word and Get Rewarded!
            </Typography>
          </div>
          <img src={PromotionRing1} className="promotion-banner-ring2" />
          <div className="refer-close-button-div">
            <a href={REFERRAL_LINK} target="_blank" rel="noopener noreferrer">
              Refer Now
            </a>
            <button
              onClick={() => setMinimized(true)}
              className="close-banner-button"
            >
              <CloseBannerIcon />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setMinimized(false)}
          className={`minimized-banner ${
            window?.location?.pathname?.includes("login")
              ? "align-login"
              : "align-home"
          } 
        `}
        >
          <div src={PromotionRing2} className="minimized-banner-ring" />
          <MinimizedBannerIcon className="minimized-banner-icon" />
        </div>
      )}
    </div>
  );
};

export default PromotionBanner;
