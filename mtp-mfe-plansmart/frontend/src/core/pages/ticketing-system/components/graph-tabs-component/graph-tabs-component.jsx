import { Tabs } from "impact-ui";
import { useState } from "react";
import { Box, Typography } from "@mui/material";
import PropTypes from "prop-types";
import ByPriority from "./components/byPriority/by-priority";
import ByStatus from "./components/byStatus/by-status";
import ByIssueType from "./components/byIssueType/by-issue-type";
import { useStyles as sharedStyles } from "../../styles-ticketing";

/**
 * TabPanel is a div to be displayed when the tab switches
 * @param {object} props
 * @returns the returns children which is passed to it
 */
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={0}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
};

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

/**
 * GraphTabsComponent will show different tabs
 * by using impact-ui's Tab component
 * @param {object} props
 * @returns the tabs component
 */
const GraphTabsComponent = (props) => {
  const [value, setValue] = useState(0);
  const sharedClasses = sharedStyles();
  /**
   * tabsName will contain the data of different
   * tabs with thier label and element
   */
  const tabsName = [
    {
      label: "By Priority",
      element: <ByPriority {...props} />,
    },
    {
      label: "By Status",
      element: <ByStatus {...props} />,
    },
    {
      label: "By Issue Type",
      element: <ByIssueType {...props} />,
    },
  ];

  /**
   * handleChange will be called when the tab switch
   * is happened and the changes value is passed to this
   * function
   * @param {number} newValue
   */
  const handleChange = (newValue) => {
    setValue(newValue);
  };

  /**
   * tabs Array will be used by our
   * impact-ui Tabs component to display it
   */
  const tabs = tabsName.map((tab, index) => {
    return {
      label: tab.label,
      value: index,
    };
  });

  return (
    <div className={sharedClasses.tabsContainer}>
      <Tabs tabs={tabs} value={value} onChange={handleChange} />
      {tabsName.map((item, key) => {
        return (
          <TabPanel value={value} index={key}>
            {item.element}
          </TabPanel>
        );
      })}
    </div>
  );
};

export default GraphTabsComponent;
