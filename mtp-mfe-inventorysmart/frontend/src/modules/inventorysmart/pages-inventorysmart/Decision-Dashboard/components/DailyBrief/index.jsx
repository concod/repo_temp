// @ts-nocheck -- imports untyped design-system (impact-ui-v3) and scss side-effect
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Modal } from "impact-ui-v3";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { getUserName } from "core/Utils/functions/utils";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import { setSmartBotActive } from "core/actions/smartBotActions";
import BriefFullContent from "./BriefFullContent";
import { fetchDailyBrief } from "./dailyBriefService";
import { getSalutation, getGreetingName, transformDailyBrief, prefillIrisAgentPrompt } from "./dailyBriefUtils";
import "./dailyBrief.scss";

const DAILY_BRIEF_FLAG = "enable_daily_breif";

/** Gradient 4-point sparkle used in the modal title and loader. */
const BriefStar = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <defs>
      <linearGradient id="dbrief-star-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4259ee" />
        <stop offset="55%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#e879a6" />
      </linearGradient>
    </defs>
    <path
      d="M24 3 C25 16 32 23 45 24 C32 25 25 32 24 45 C23 32 16 25 3 24 C16 23 23 16 24 3 Z"
      stroke="url(#dbrief-star-grad)"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
  </svg>
);

/** Modal title: gradient sparkle glyph + label (matches the reference header). */
const BriefModalTitle = () => (
  <span className="dbrief-modal-title">
    <BriefStar size={18} />
    <span className="dbrief-modal-title-text">AI Daily Brief</span>
  </span>
);

/**
 * AI Daily Brief.
 *
 * Renders the dashboard hero banner (time-of-day greeting + trigger) and, on
 * demand, a modal with the full brief fetched from the navbot Daily Brief
 * endpoint (see dailyBriefService).
 *
 * Visibility is tenant-config driven: only shown when the `enable_daily_breif`
 * attribute resolves to true (from /core/tenant-config).
 */
const DailyBrief = () => {
  const dispatch = useDispatch();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [hasError, setHasError] = useState(false);

  const salutation = getSalutation();
  const userName =
    getGreetingName(localStorage.getItem("name")) ||
    localStorage.getItem("user_name") ||
    getUserName() ||
    "there";

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resp = await tenantConfigApiCache(1, {
          attribute_name: DAILY_BRIEF_FLAG,
        })();
        const value = resp?.data?.data?.[0]?.attribute_value?.value;
        const enabled =
          value === true || String(value).trim().toLowerCase() === "true";
        if (active) setIsEnabled(enabled);
      } catch (error) {
        console.error("Daily Brief visibility config fetch failed.", error);
        if (active) setIsEnabled(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openBrief = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setHasError(false);
    setBrief(null);
    try {
      const data = await fetchDailyBrief();
      setBrief(transformDailyBrief(data));
    } catch (error) {
      console.error("Daily Brief fetch failed.", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const closeBrief = () => {
    setIsOpen(false);
    setIsLoading(false);
  };

  /**
   * Opens the platform "Ask Iris" chatbot in agent mode and pre-fills the
   * composer with the selected brief item as the prompt.
   *
   * The chatbot lives in the shell header (external impact-chatbot package),
   * which runs in the host app's redux store — a different instance from this
   * MFE's store — so dispatching `setSmartBotActive` here does not reach it.
   * Instead we trigger the header's own "Ask Iris" button (the same action the
   * user takes manually) and fall back to the redux dispatch if that button
   * isn't found. Agent mode is set via its `currentModeData` localStorage key,
   * and the prompt is written straight into its controlled textarea.
   */
  const handleAskIris = (prompt) => {
    if (!prompt) return;
    // The chatbot reads its mode from this key when it opens.
    localStorage.setItem("currentModeData", "agent");
    closeBrief();
    const headerBtn = document.querySelector(
      ".impact-header-bot-container:not(.impact-header-bot-container-disabled)"
    );
    if (headerBtn) {
      headerBtn.click();
    } else {
      // Fallback for same-store setups or if the header markup changes.
      dispatch(setSmartBotActive(true));
    }
    prefillIrisAgentPrompt(prompt);
  };

  if (!isEnabled) return null;

  return (
    <div className="dbrief-hero">
      <p className="dbrief-hero-greeting">
        {salutation}
        <span className="dbrief-hero-wave" aria-hidden>
          {" "}
          👋
        </span>
        {", "}
        <span className="dbrief-hero-name">{userName}</span>
      </p>
      <button
        type="button"
        className="dbrief-cta"
        onClick={openBrief}
        aria-haspopup="dialog"
      >
        <AutoAwesomeIcon fontSize="small" className="dbrief-cta-icon" />
        <span className="dbrief-cta-text">AI Daily Brief</span>
      </button>

      {isOpen && (
        <Modal
          open={isOpen}
          onClose={closeBrief}
          title={<BriefModalTitle />}
          size="large"
          className="dbrief-modal"
          aria-labelledby="ai-daily-brief-title"
        >
          <div className="dbrief-modal-body">
            {isLoading ? (
              <div className="dbrief-loader" role="status" aria-live="polite">
                <div className="dbrief-loader-aura" aria-hidden />
                <span className="dbrief-loader-star" aria-hidden>
                  <span className="dbrief-loader-star-spin">
                    <BriefStar size={46} />
                  </span>
                </span>
                <span className="dbrief-loader-caption">Preparing Your Daily Brief…</span>
              </div>
            ) : hasError ? (
              <div className="dbrief-error" role="alert">
                <p className="dbrief-error-title">Couldn’t load your Daily Brief</p>
                <p className="dbrief-error-desc">
                  Something went wrong fetching the latest brief. Please try again.
                </p>
                <button type="button" className="dbrief-cta" onClick={openBrief}>
                  <AutoAwesomeIcon fontSize="small" className="dbrief-cta-icon" />
                  <span className="dbrief-cta-text">Retry</span>
                </button>
              </div>
            ) : (
                  <BriefFullContent brief={brief} onAskIris={handleAskIris} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DailyBrief;
