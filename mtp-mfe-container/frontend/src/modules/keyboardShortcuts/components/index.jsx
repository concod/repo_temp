import React, { useCallback, useMemo, useState } from "react";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import { useTranslation } from "impact-ui-v3";
import { TAB_NAMES } from "../keyboardShortcutsConstants";
import ShortcutsTabs from "./tabs";
import ShortcutsTablePanel from "./shortcutsTable/shortcutsTable";
import "./keyboardshortcuts.scss";
import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  cardContainer: {
    padding: `${pxToRem(16)} ${pxToRem(24)} ${pxToRem(24)}`,
    display: "flex",
    flexDirection: "column",
    gap: pxToRem(16),
    height: "100%",
    "& > div": {
      gap: pxToRem(8),
    }
  },
  badge: {
    width: pxToRem(48),
    height: pxToRem(24),
    maxWidth: pxToRem(164),
    borderRadius: pxToRem(1000),
    padding: `${pxToRem(2)} ${pxToRem(8)}`,
    background: "linear-gradient(147.41deg, #59AFE8 16.18%, #646CE7 90.1%)",
    color: theme.palette.common.white,
    textAlign: "center",
    fontWeight: 500,
    fontSize: pxToRem(14),
  }
}));

export const KeyboardShortcutsPage = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState("general");
  const globalClasses = globalStyles();
  const handleTabChange = useCallback((event, next) => {
    if (next != null) setTabValue(next);
  }, []);

  const tabPanels = useMemo(() =>
    TAB_NAMES.map((tab) => (
      <ShortcutsTablePanel
        key={tab.value}
        tabValue={tab.value}
      />
    )),
    []
  );

  return (
    <div className={`${globalClasses.paddingAround} ${classes.cardContainer}`}>
      <div className={`${globalClasses.layoutAlignStart}`}>
        <HeaderBreadCrumbs options={[
          { label: t("keyboardShortcuts.breadcrumb.home"), to: "/home" },
          { label: t("keyboardShortcuts.breadcrumb.keyboardShortcuts") },
        ]} renderInContainer={false} />
        <span className={classes.badge}>{t("keyboardShortcuts.badge.new")}</span>
      </div>
      <ShortcutsTabs
        tabValue={tabValue}
        onChange={handleTabChange}
        tabPanels={tabPanels}
      />
    </div>
  );
};

export default KeyboardShortcutsPage;
