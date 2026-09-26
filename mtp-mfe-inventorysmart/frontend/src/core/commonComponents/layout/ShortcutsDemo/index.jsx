import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setShowAllSetBox } from "core/actions/tenantConfigActions";
import { KeyboardShortcuts } from "impact-ui-v3";
import filterPanleDemo from "coreAssets/filterPanelDemo.mov";
import sidenavDemo from "coreAssets/sidenavDemo.mov";
import { SHOW_KB_SHORTCUTS_KEY } from "core/constants/index";
import { useLocation } from "react-router-dom-v5-compat";
import { WHITE_LISTED_URLS } from "../authenticationConstants";
import { updateShortcutsDemoPreference } from "./shortcuts-service";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";

const ShortcutsDemo = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const showAllSetBox = useSelector((state) => state?.tenantConfigReducer?.showAllSetBox);
  const [showModal, setShowModal] = useState(
    () => localStorage.getItem(SHOW_KB_SHORTCUTS_KEY) !== "true"
  );
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!showModal || WHITE_LISTED_URLS.includes(location.pathname) || location.pathname.includes('user-management')) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (document.querySelector(".keyboard-shortcuts-container-wrapper")) {
        return;
      }
      if (document.querySelector(".impact-header-container")) {
        setShouldRender(true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, []);
  const handleCloseForCurrentSession = () => {
    localStorage.setItem(SHOW_KB_SHORTCUTS_KEY, "true");
    setShowModal(false);
  };
  
  const dismissDemo = async () => {
    try {
      await updateShortcutsDemoPreference(getCurrentApplicationDetails()?.applicationCode);
    } catch (error) {
      console.error("Error updating shortcuts demo preference:", error);
    } finally{
      handleCloseForCurrentSession();
      dispatch(setShowAllSetBox(false));
      sessionStorage.removeItem("shortcuts_demo_in_progress")
    }
  };
  if (!showModal || WHITE_LISTED_URLS.includes(location.pathname) || location.pathname.includes('user-management')) return null;
  return (
    <>
      {shouldRender && <KeyboardShortcuts
        screen2VideoSrc={filterPanleDemo}
        screen3VideoSrc={sidenavDemo}
        onRemindMeLater={handleCloseForCurrentSession}
        onClose={handleCloseForCurrentSession}
        onSkipClick={handleCloseForCurrentSession}
        onCloseAllSetBox={dismissDemo}
        showAllSetBox={showAllSetBox}
        onTryNow={() => sessionStorage.setItem("shortcuts_demo_in_progress", "true")}
      />}
    </>
  );
};

export default ShortcutsDemo;
