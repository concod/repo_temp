import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import makeStyles from "@mui/styles/makeStyles";
import { Paper, Container } from "@mui/material";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import globalStyles from "core/Styles/globalStyles";
import Box from "@mui/material/Box";

const useStyles = makeStyles((theme) => ({
  appbar: {
    boxShadow: "none",
  },
}));
const TabsComponent = (props) => {
  // For alert on tab change & to handle onChange of Tab,
  // lifting the state up using parentControlledVal & setParentControlledVal
  const { tabsData, parentControlledVal, setParentControlledVal } = props;

  const classes = useStyles();
  // adding this condition here to make the sku-mapping tab active when navigated from inventory alerts
  let initVal = 0;
  const [value, setValue] = useState(initVal);
  useEffect(() => {
    if (props.customSelectedtab) {
      setValue(props.customSelectedtab);
    }
  }, [props.customSelectedtab]);
  const handleChange = (event, newValue) => {
    let changeTab = true;
    if (props.handleChange) {
      changeTab = props.handleChange(newValue);
    }
    changeTab && setValue(newValue);
  };

  return (
    <Container style={props.tabContainerstyle} maxWidth={false}>
      <AppBar
        classes={{ root: classes.appbar }}
        color="transparent"
        position="static"
      >
        <Box style={props.tabHeadingStyle}>
          <Tabs
            value={parentControlledVal || value}
            onChange={setParentControlledVal || handleChange}
            aria-label="wrapped label tabs example"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabsData?.map((tab, idx) => {
              return (
                <Tab
                  value={idx}
                  label={tab.label}
                  {...a11yProps(idx, tab.id)}
                  disabled={props.disabled}
                />
              );
            })}
          </Tabs>
        </Box>
      </AppBar>
      {tabsData?.map((tab, idx) => {
        return (
          <TabPanel
            id={tab.id}
            value={parentControlledVal || value}
            index={idx}
            pannelStyle={props.tabPannelStyle}
            disabled={props.disabled}
            // if remountOnTabChange is false it would not unmount the component not in focus, by default it will unmount
            remountOnTabChange={props.remountOnTabChange}
          >
            {tab.TabPanel}
          </TabPanel>
        );
      })}
    </Container>
  );
};

export default TabsComponent;

const TabPanel = (props) => {
  const {
    children,
    remountOnTabChange = true,
    value,
    index,
    id,
    ...other
  } = props;
  const globalClasses = globalStyles();

  const pageContent = (
    <Paper
      elevation={0}
      style={props.pannelStyle}
      className={globalClasses.paper}
    >
      {children}
    </Paper>
  );
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={props.id || `wrapped-tabpanel-${index}`}
      aria-labelledby={`wrapped-tab-${index}`}
      {...other}
    >
      {remountOnTabChange ? value === index && pageContent : pageContent}
    </div>
  );
};

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function a11yProps(index, id) {
  return {
    id: id || `wrapped-tab-${index}`,
    "aria-controls": `wrapped-tabpanel-${index}`,
  };
}
