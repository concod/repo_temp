import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { attributeFormatter } from "modules/assortsmart/utils-assortsmart/utilityFunctions";

const PlanDropTabViewComponent = (props) => {
  const tabs = Object.keys(props.groupedDrops).sort();
  const [selectedTab, setSelectedTab] = useState(props.selectedTab || null);
  const [tabValues, setTabValues] = useState([]);
  const classes = useStyles();

  useEffect(() => {
    if (!tabValues?.length || tabValues?.length !== tabs?.length) {
      setTabValues(tabs);
    }
  }, [tabs]);

  useEffect(() => {
    let dropsArr = Object.keys(props.groupedDrops);
    if (dropsArr?.length > 0 && !selectedTab && !props.selectedTab) {
      setSelectedTab(dropsArr[0]);
      props.onChangeTab(dropsArr[0], false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.groupedDrops]);

  useEffect(() => {
    if (props.selectedTab && props.selectedTab !== null) {
      //To persist selected tab value
      let tab = Object.keys(props.groupedDrops).filter((drop) => {
        return drop.includes(
          props.selectedTab.split(" ")[1] || props.selectedTab.split("_")[1]
        );
      });
      if (tab) {
        setSelectedTab(tab[0]);
        props.onChangeTab(tab[0], false);
      }
    }
  }, [props.selectedTab]);

  const handleChange = (_event, selectedData) => {
    setSelectedTab(selectedData);
    props.onChangeTab(selectedData, true);
  };
  return (
    <Box
      className={classes.marginBottom15}
      sx={{ width: "100%", typography: "body1" }}
    >
      <TabContext value={selectedTab}>
        <Box sx={{ borderColor: "divider" }}>
          <TabList onChange={handleChange} aria-label="lab API tabs example">
            {tabValues.map((key) => {
              return <Tab label={attributeFormatter(key)} value={key} />;
            })}
          </TabList>
        </Box>
      </TabContext>
    </Box>
  );
};

export default PlanDropTabViewComponent;
