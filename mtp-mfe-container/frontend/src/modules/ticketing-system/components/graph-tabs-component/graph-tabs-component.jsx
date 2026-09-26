import { Tabs, useTranslation } from "impact-ui-v3";
import { useState } from "react";
import ByPriority from "./components/byPriority/by-priority";
import ByStatus from "./components/byStatus/by-status";
import ByIssueType from "./components/byIssueType/by-issue-type";
import { useStyles as sharedStyles } from "../../styles-ticketing";

const tabsName = [
  {
    key: "byPriority",
    label: "By Priority",
  },
  {
    key: "byStatus",
    label: "By Status",
  },
  {
    key: "byIssueType",
    label: "By Issue Type",
  },
];

/**
 * GraphTabsComponent will show different tabs
 * by using impact-ui's Tab component
 * @param {object} props
 * @returns the tabs component
 */
const GraphTabsComponent = (props) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(tabsName?.[0]?.key);
  const sharedClasses = sharedStyles();

  /**
   * handleChange will be called when the tab switch
   * is happened and the changes value is passed to this
   * function
   * @param {number} newValue
   */
  const handleChange = (newValue) => {
    const clickedLabel = newValue?.target?.innerText;
    const matchedTab = tabs.find((tab) => tab.label === clickedLabel);
    if (matchedTab) {
      setValue(matchedTab.value);
    }
  };

  /**
   * tabs Array will be used by our
   * impact-ui Tabs component to display it
   */
  const tabs = tabsName.map((tab) => {
    return {
      label: t(`ticketing.tabs.${tab.key}`),
      value: tab.key,
    };
  });

  return (
    <div className={sharedClasses.tabsContainer}>
      <Tabs
        onChange={handleChange}
        tabNames={tabs}
        tabPanels={[
          <ByPriority {...props} />,
          <ByStatus {...props} />,
          <ByIssueType {...props} />,
        ]}
        value={value}
      />
    </div>
  );
};

export default GraphTabsComponent;
