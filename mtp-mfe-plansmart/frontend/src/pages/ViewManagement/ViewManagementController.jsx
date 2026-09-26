import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { useLocation } from "react-router-dom-v5-compat";

import PropTypes from "prop-types";

import SidePanelComponent from "components/planSmart/SidePanel/SidePanel.jsx";
import CustomActionButton from "../../components/Impact/CustomActionButton/CustomActionButton";

import ListingViews from "./components/ListingViews/ListingViews";
import TableSettingsContent from "./components/TableSettings/TableSettings";
import ShowOrHideMetrics from "./components/ShowOrHideMetrics/ShowOrHideMetrics";

import * as apis from "./api/viewManagementTemplate.api";

import {
  planStatusSelector,
  showHideMetricsDataSelector
} from "../PlanningScreen/slice/planningScreen.slice";
import {
  screenIdMappingSelector,
  isTemplateCallRequiredSelector
} from "./viewManagement.slice";

import { getScreenId } from "./viewManagement.util";

import ViewSettingIcon from "assets/viewSetting.svg";
import MetricsIcon from "assets/metrics.svg";
import ViewManagementIcon from "assets/viewManagement.svg";

import {
  VIEW_MANAGEMENT_PANEL_DISABLED_ICON_TOOLTIP,
  VIEW_MANAGEMENT_PANEL_ENABLED_ICON_TOOLTIP
} from "./viewManagement.constant";

// import GroupingIcon from "assets/grouping.svg";
// import FilterIcon from "assets/filter.svg";
// import ColumnsIcon from "assets/columns.svg";

const ViewManagementController = (props) => {
  const {
    budgetShowHideMetricsData,
    tableRef,
    getTemplateDetails,
    isViewManagementDisabled,
    screenIdMapping,
    setGridSettings,
    setShowHideMetricsDataAction,
    planStatus,
    isTemplateCallRequired,
    viewDetailsApplyCallback
  } = props;

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handlePanelClose = () => {
    setIsPanelOpen(false);
  };

  // const location = useLocation();
  // const selectedScreenName = location?.pathname?.split("/").slice(2).join("/");

  useEffect(() => {
    if (isTemplateCallRequired) {
      const screenId = getScreenId(
        screenIdMapping,
        planStatus
      );

      // Get the template details for the current screen if there is no views present for the user
      if (screenId) {
        getTemplateDetails(screenId, budgetShowHideMetricsData);
      }
    }
  }, []);

  const tabConfig = [
    {
      label: "Settings",
      icon: <ViewSettingIcon />,
      component: {
        compare: null
      },
      applyToTable: {
        tab_key: "view_settings"
      },
      content: (
        <TableSettingsContent
          tableRef={tableRef}
          setGridSettings={setGridSettings}
          setShowHideMetricsDataAction={setShowHideMetricsDataAction}
        />
      )
    },
    {
      label: "Met.& Ver",
      icon: <MetricsIcon />,
      component: {
        compare: null
      },
      applyToTable: {
        tab_key: "show_hide_metrics"
      },
      content: (
        <ShowOrHideMetrics
          tableRef={tableRef}
          setShowHideMetricsDataAction={setShowHideMetricsDataAction}
        />
      )
    }
  ];

  return (
    <>
      <>
        <ListingViews viewDetailsApplyCallback={viewDetailsApplyCallback} />
        <CustomActionButton
          icon={() => <ViewManagementIcon />}
          tooltipText={
            isViewManagementDisabled
              ? VIEW_MANAGEMENT_PANEL_DISABLED_ICON_TOOLTIP
              : VIEW_MANAGEMENT_PANEL_ENABLED_ICON_TOOLTIP
          }
          onClick={() => setIsPanelOpen(true)}
          disabled={isViewManagementDisabled}
        />
      </>
      <SidePanelComponent
        showPanel={isPanelOpen}
        tabConfig={tabConfig}
        handleClose={handlePanelClose}
        panelTitle={"View Management"}
      />
    </>
  );
};

const mapStateToProps = (state) => ({
  screenIdMapping: screenIdMappingSelector(state),
  planStatus: planStatusSelector(state),
  isTemplateCallRequired: isTemplateCallRequiredSelector(state),
  budgetShowHideMetricsData: showHideMetricsDataSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators(
      {
        ...apis
      },
      dispatch
    )
  };
};

ViewManagementController.propTypes = {
  getTemplateDetails: PropTypes.func,
  isTemplateCallRequired: PropTypes.bool,
  isViewManagementDisabled: PropTypes.bool,
  planStatus: PropTypes.number,
  screenIdMapping: PropTypes.object,
  setGridSettings: PropTypes.func,
  setShowHideMetricsDataAction: PropTypes.func,
  tableRef: PropTypes.object,
  viewDetailsApplyCallback: PropTypes.func
};

export default connect(mapStateToProps, mapDispatch)(ViewManagementController);
