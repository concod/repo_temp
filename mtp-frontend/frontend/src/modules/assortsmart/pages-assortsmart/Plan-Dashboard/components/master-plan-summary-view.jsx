import { useEffect, useRef, useState, useCallback } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { Typography, Button, Paper } from "@mui/material";
import AgGridTable from "core/Utils/agGrid";
import LoadingOverlay from "../../../../../core/Utils/Loader/loader";
import AssortBreadCrumbs from "../../assort-bread-crumbs";
import {
  setDashboardLoader,
  getSummaryViewData,
  setSummaryViewData,
  setChoiceViewData,
  getPlanLevels,
  setLevelsJson,
  masterPlanDashboardData
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import {
  filterView,
  generateLevelJson,
  getSummaryViewPayload,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { cloneDeep, isEmpty } from "lodash";
import { useHistory } from "react-router";
import { configureCascading, configureLevels } from "./common-plan-functions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const SummaryView = (props) => {
  const [summaryData, setSummaryData] = useState([]);
  const [summaryColumns, setSummaryColumns] = useState([]);
  const [choiceViewData, setChoiceViewData] = useState([]);
  const [choiceViewColumns, setChoiceViewColumns] = useState([]);
  const [showChoiceView, setShowChoiceView] = useState(false);
  const summaryInstance = useRef({});
  const choiceInstance = useRef({});
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [filterOptions, setFilterOptions] = useState({});
  const [filterSelected, setFilterSelected] = useState({});
  const filterValues = useRef({});
  const history = useHistory();
  const filtersLevels = useRef({});
  const [levelsMapping, setLevelsMapping] = useState({});

  const fetchSummaryViewData = async () => {
    const { selectedPlans } = props.location?.state;
    try {
      props.setDashboardLoader(true);
      const levels = getSummaryViewPayload(selectedPlans);
      const reqBody = {
        filters: levels,
        status: 0,
        meta: {
          sort: [],
          search: [],
          range: [],
        },
      };
      setShowChoiceView(false);
      setSummaryData([]);
      let summaryData = await props.masterPlanDashboardData(reqBody, 0, -1);
      let updatedSummaryData = []
      if (summaryData?.data?.status) {
        summaryData?.data?.data.map((row)=>{
          let newRow = {...row,l3_name: replaceSpecialCharacter(row.l3_name)}
          updatedSummaryData.push(newRow)
        })
        summaryData.data.data = [...updatedSummaryData]
        props.setSummaryViewData(summaryData?.data);
      }
    } catch (error) {
      props.setDashboardLoader(false);
      props.addSnack({
        message: "Fetching summary details failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  useEffect(() => {
    if (props.summaryViewData?.data) {
      let summaryData = cloneDeep(props.summaryViewData?.data);
      summaryData?.forEach((item) => {
        item["uniqueId"] =
          item.l0_name +
          item.l1_name +
          item.l2_name +
          item.l3_name +
          item.channel +
          item.sub_channel +
          item.updated_at +
          item.sales_units +
          item.aur;
      });
      setSummaryData(summaryData);
      props.setDashboardLoader(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.summaryViewData]);

  const fetchSummaryViewColumns = async () => {
    let levelData = await props.getPlanLevels();
    if (levelData?.data?.status) {
      const levelsJson = generateLevelJson(levelData?.data?.data);
      props.setLevelsJson(levelsJson);
      setLevelsMapping(levelsJson);
    }
    const columns = await getColumnsAg(
      "table_name=master_plan_summary_view",
      props.columnHeaderJson,
      true
    )();
    if (columns?.length) {
      setSummaryColumns(columns);
    }
  };

  useEffect(() => {
    fetchSummaryViewColumns();
    fetchSummaryViewData();
    return () => {
      props.setSummaryViewData({});
      props.setChoiceViewData({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.choiceViewData?.data) {
      const filterKeys = {
        l0_name: "l0_name",
        l1_name: "l1_name",
        l2_name: "l2_name",
        l3_name: "l3_name",
        channel: "channel",
      };
      const filters = {
        options: {},
        values: {},
      };
      const levels = configureLevels(
        {},
        filterKeys,
        props.choiceViewData?.data,
        true
      );
      filters.options = levels.options;
      filters.values = levels.selectedValue;
      setFilterOptions(filters.options);
      filtersLevels.current = levels.options;
      setFilterSelected(filters.values);
      for (const key in levels.selectedValue) {
        filterValues.current[key] = levels.selectedValue[key]?.label;
      }
      setChoiceViewData(props.choiceViewData?.data);
      props.setDashboardLoader(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.choiceViewData]);

  const generateChoiceView = async () => {
    if (!summaryInstance?.current?.api?.getSelectedRows()?.length) {
      props.addSnack({
        message: "Please select atleast one summary record",
        options: {
          variant: "options",
        },
      });
      return;
    }
    try {
      props.setDashboardLoader(true);
      setChoiceViewData([]);
      const selectedSummaryRecords = summaryInstance.current.api.getSelectedRows();
      const levels = getSummaryViewPayload(
        selectedSummaryRecords,
        props.planLevels
      );
      const reqBody = {
        filters: levels,
      };
      const columns = await getColumnsAg(
        "table_name=master_plan_choice_view",
        props.columnHeaderJson,
        true
      )();
      if (columns?.length) {
        setChoiceViewColumns(columns);
      }
      const choiceData = await props.getSummaryViewData(reqBody, "choices");
      if (choiceData?.data?.status) {
        setShowChoiceView(true);
        props.setChoiceViewData(choiceData?.data?.data);
        summaryInstance.current.api.deselectAll();
      }
    } catch (error) {
      props.setDashboardLoader(false);
      props.addSnack({
        message: "Feching choice view details failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const loadTableInstance = (params) => {
    summaryInstance.current = params;
  };

  const loadChoiceTableInstance = (params) => {
    choiceInstance.current = params;
  };

  const handleChange = (option, id) => {
    const filterValue = { ...filterSelected };
    filterValues.current[id.filter_id] = option?.label;
    if (id.filter_id !== "l3_name") {
      configureCascading(
        id.filter_id,
        props.choiceViewData?.data,
        option,
        filtersLevels,
        filterSelected,
        filterValues,
        setFilterOptions,
        setFilterSelected,
        props
      );
    } else {
      //Cascading filters for l0, l1 & l2
      filterValue[id.filter_id] = option;
      setFilterSelected(filterValue);
    }
    choiceInstance?.current?.api?.onFilterChanged();
  };

  useEffect(() => {
    if (choiceInstance?.current?.api) {
      choiceInstance?.current?.api?.onFilterChanged();
    }
  }, [filterValues, choiceInstance]);

  const isExternalFilterPresent = useCallback(() => {
    let levelsFilter = false;
    Object.keys(filtersLevels.current).forEach((level) => {
      if (filtersLevels.current[level]?.length > 1)
        return (levelsFilter = true);
    });
    return levelsFilter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      if (node.data) {
        let l0Value =
          filterValues?.current?.l0_name || filterSelected?.l0_name?.label;
        let l1Value =
          filterValues?.current?.l1_name || filterSelected?.l1_name?.label;
        let l2Value =
          filterValues?.current?.l2_name || filterSelected?.l2_name?.label;
        let l3Value =
          filterValues?.current?.l3_name || filterSelected?.l3_name?.label;
        let channel =
          filterValues?.current?.channel || filterSelected?.channel?.label;
        return (
          node.data?.l0_name === l0Value &&
          node.data?.l1_name === l1Value &&
          node.data?.l2_name === l2Value &&
          node?.data?.l3_name === l3Value &&
          node.data?.channel === channel
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterValues]
  );

  return (
    <>
      <AssortBreadCrumbs planStep={0} location={history.location.pathname} />
      <LoadingOverlay loader={props.dashboard_loader}>
        <Paper elevation={3} className={globalClasses.paper}>
          <div className={classes.omniMappingFilterDiv}>
            <Typography variant="h3">Summary View</Typography>
          </div>
          <AgGridTable
            rowdata={summaryData || []}
            columns={summaryColumns || []}
            loadTableInstance={loadTableInstance}
            selectAllHeaderComponent={true}
            uniqueRowId={"uniqueId"}
            skipAutoSizeColumn
            sizeColumnsToFitFlag
            onGridChanged
            sideBar={false}
            tableId={"summary-view-table"}
            adjustTableHeight={summaryData?.length <= 2 ? true : false}
          />
          <div className={classes.rightAlignButtonAssort}>
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              onClick={generateChoiceView}
              id="choice view"
            >
              Generate choice view
            </Button>
          </div>
        </Paper>

        {showChoiceView && (
          <>
            <Paper elevation={3} className={globalClasses.paper}>
              <div className={classes.omniMappingFilterDiv}>
                <Typography variant="h3">Choice View</Typography>
              </div>
              <div className={classes.omniMappingFilterDiv}>
                {!isEmpty(filterOptions) &&
                  !isEmpty(filterSelected) &&
                  Object.keys(filterOptions)?.map((levelKey) => {
                    return (
                      filterOptions[levelKey]?.length &&
                      filterView(
                        levelsMapping[levelKey] || levelKey,
                        levelKey,
                        filterOptions[levelKey],
                        handleChange,
                        filterSelected[levelKey],
                        classes.formContainer,
                        classes.inputLabel
                      )
                    );
                  })}
              </div>
              <AgGridTable
                rowdata={choiceViewData || []}
                columns={choiceViewColumns || []}
                loadTableInstance={loadChoiceTableInstance}
                skipAutoSizeColumn
                sizeColumnsToFitFlag
                onGridChanged
                sideBar={false}
                tableId={"choice-view-table"}
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
              />
            </Paper>
          </>
        )}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    dashboard_loader: planDashboardServiceActions.dashboardLoaderSelector(
      state
    ),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
    summaryViewData: planDashboardServiceActions.summaryDataSelector(state),
    choiceViewData: planDashboardServiceActions.choiceDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  addSnack,
  getSummaryViewData,
  setDashboardLoader,
  setSummaryViewData,
  setChoiceViewData,
  getPlanLevels,
  setLevelsJson,
  masterPlanDashboardData
};
export default connect(mapStateToProps, mapActionsToProps)(SummaryView);
