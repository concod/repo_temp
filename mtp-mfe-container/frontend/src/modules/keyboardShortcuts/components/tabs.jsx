import React from "react";
import { Tabs, useTranslation } from "impact-ui-v3";
import { TAB_NAMES } from "../keyboardShortcutsConstants";
import "./keyboardshortcuts.scss";

const ShortcutsTabs = ({ tabValue, onChange, tabPanels }) => {
  const { t } = useTranslation();
  const translatedTabs = TAB_NAMES.map((tab) => ({
    ...tab,
    label: t(`keyboardShortcuts.tabs.${tab.value}`),
  }));

  return (
    <div className="keyboard-shortcut-list">
      <Tabs
        tabNames={translatedTabs}
        tabPanels={tabPanels}
        value={tabValue}
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
      />
    </div>
  );
};

export default ShortcutsTabs;
