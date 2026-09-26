import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { ALLOCATION_REPORT } from "../../constants-inventorysmart/routesConstants";
import globalStyles from "../../../../core/Styles/globalStyles";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Box } from "@mui/system";
import { Paper, Tab, Tabs } from "@mui/material";
import { ALLOCATION_REPORT_HEADER_TAB } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import AllocationReporting from "./AllocationReporting";

import OMSReporting from "./OMSReporting";

const ProductConfiguration = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();

  const [hideHeaderTab, setHideHeaderTab] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  const renderTabComponents = () => {
    switch (selectedTab) {
      case "reports_oms":
        return <OMSReporting {...props} />;
      case "allocation_reporting":
        return <AllocationReporting {...props} />;
      default:
        return;
    }
  };

  useEffect(() => {
    if (
      props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
        "reports_oms"
      )
    ) {
      if (
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
          "allocation_reporting"
        )
      ) {
        setHideHeaderTab(true);
      } else setSelectedTab("allocation_reporting");
    } else setSelectedTab("allocation_reporting");
  }, [props.inventorysmartScreenConfig]);

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Reporting",
            id: 1,
            action: () => {
              history.push(ALLOCATION_REPORT);
            },
          },
        ]}
      ></HeaderBreadCrumbs>

      <div className={globalClasses.filterWrapper}>
        <Paper elevation={0}>
          {hideHeaderTab ? (
            <Box sx={{ width: "100%", typography: "body1" }}>
              <AllocationReporting {...props} />
            </Box>
          ) : (
            <Box sx={{ width: "100%", typography: "body1" }}>
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                aria-label="reports-header-tab"
              >
                {ALLOCATION_REPORT_HEADER_TAB.map(
                  (tabOption) =>
                    !props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
                      tabOption.value
                    ) && <Tab {...tabProps(tabOption)} />
                )}
              </Tabs>
              {renderTabComponents()}
            </Box>
          )}
        </Paper>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

export default connect(mapStateToProps, null)(ProductConfiguration);
