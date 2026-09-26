import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { PRODUCT_CONFIGURATION } from "../../constants-inventorysmart/routesConstants";
import globalStyles from "../../../../core/Styles/globalStyles";
import { useState } from "react";
import { connect } from "react-redux";
import { Box } from "@mui/system";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Paper, Tab } from "@mui/material";
import ProductRuleDashboard from "./components/ProductRulesDashboard";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  TAB_TYPES_LABEL,
  TAB_TYPES_VALUE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useTranslation } from "impact-ui-v3";

const ProductConfiguration = (props) => {
  const { t } = useTranslation();
  const history = useHistory();
  const classes = useStyles();

  const globalClasses = globalStyles();
  const [selectedTab, setSelectedTab] = useState(TAB_TYPES_VALUE.Level1);
  const [selectedSubTab, setSelectedSubTab] = useState(
    TAB_TYPES_VALUE.Level1Sector1Label
  );

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSubTabChange = (event, newValue) => {
    setSelectedSubTab(newValue);
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: t("inventorysmart.configuration"),
            id: 1,
            action: () => {
              history.push(PRODUCT_CONFIGURATION);
            },
          },
        ]}
      ></HeaderBreadCrumbs>

      <div className={globalClasses.filterWrapper}>
        <Paper elevation={6}>
          <Box sx={{ width: "100%", typography: "body1" }}>
            <TabContext value={selectedTab}>
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <TabList onChange={handleTabChange} aria-label="Tab">
                  <Tab
                    label={TAB_TYPES_LABEL.Level1Tab1}
                    value={TAB_TYPES_VALUE.Level1}
                  />
                  <Tab
                    label={TAB_TYPES_LABEL.Level1Tab2}
                    value={TAB_TYPES_VALUE.Level2}
                  />
                  <Tab
                    label={TAB_TYPES_LABEL.Level1Tab3}
                    value={TAB_TYPES_VALUE.Level3}
                  />
                </TabList>
              </Box>
              <TabPanel
                value={TAB_TYPES_VALUE.Level1}
                className={classes.matTabSubTab}
              >
                <TabContext value={selectedSubTab}>
                  <TabList onChange={handleSubTabChange} aria-label="Tab">
                    <Tab
                      label={TAB_TYPES_VALUE.Level1Sector1}
                      value={TAB_TYPES_VALUE.Level1Sector1Label}
                    />
                    <Tab
                      label={TAB_TYPES_VALUE.Level1Sector2}
                      value={TAB_TYPES_VALUE.Level1Sector2Label}
                    />
                    <Tab
                      label={TAB_TYPES_VALUE.Level1Sector3}
                      value={TAB_TYPES_VALUE.Level1Sector3Label}
                    />
                  </TabList>
                  <TabPanel value={TAB_TYPES_VALUE.Level1Sector1Label}>
                    <ProductRuleDashboard {...props} />
                  </TabPanel>
                  <TabPanel value={TAB_TYPES_VALUE.Level1Sector2Label}>
                    {dynamicLabelsBasedOnTenant("product_status")}
                  </TabPanel>
                  <TabPanel value={TAB_TYPES_VALUE.Level1Sector3Label}>
                    {dynamicLabelsBasedOnTenant("product_mapping")}
                  </TabPanel>
                </TabContext>
              </TabPanel>
              <TabPanel value={TAB_TYPES_VALUE.Level2}>
                {t("inventorysmart.store")}
              </TabPanel>
              <TabPanel value={TAB_TYPES_VALUE.Level3}>
                {t("inventorysmart.dc")}
              </TabPanel>
            </TabContext>
          </Box>
        </Paper>
      </div>
    </>
  );
};

export default connect(null, null)(ProductConfiguration);
