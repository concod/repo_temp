import React, { useState, useEffect, useRef, useCallback } from "react";
import AgGridTable from "core/Utils/agGrid";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { common } from "../../../constants-assortsmart/stringContants";
import { times, cloneDeep, uniqBy, isEmpty, isArray } from "lodash";
import {
  getDepthMultiplierData,
  updateDepthMultiplierData,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  getBopTagData,
  getSeasonOptions,
} from "../../../services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  assortAgGridCustomCellRenderer,
  filterView,
  getPlanPayload,
  isChannelMultiple,
} from "../../../utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { bindActionCreators } from "redux";
import { Switch } from "impact-ui";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";

const DepthMultiplierComponent = (props) => {
  const [
    depthMultiplierTableColumns,
    setDepthMultiplierTableColumns,
  ] = useState([]);
  let [depthMultiplierTableData, setDepthMultiplierTableData] = useState([]);
  const [depthMultiplierLoader, setShowDepthMultiplierLoader] = useState(true);
  const classes = useStyles();
  const depthMultiplierInstance = useRef({});
  const [channelSelected, setChannelSelected] = useState({});
  const depthMultiplierData = useRef({});
  const depthMultiplierColumns = useRef({});
  const [channelOptions, setChannelOptions] = useState([]);
  const [planOptions, setPlanOptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [toggleEditState, setToggleEditState] = useState(false);

  useEffect(() => {
    if (!isEmpty(channelSelected)) {
      let groupedData = groupByCustom({
        Group: depthMultiplierData?.current,
        By: ["l3_name", "special_classification"],
      });
      let dynamicRangeData = times(groupedData?.[0]?.length, (rangeIndex) => {
        return {
          label: `Range ${rangeIndex + 1}`,
          column_name: `range${rangeIndex + 1}`,
          ...common.__default_column_attributes,
          is_editable: true,
          type: "float",
          order_of_display: 6 + rangeIndex,
          tc_code: 57,
          width: 100,
          formatter: "roundOfftoTwoDecimals",
          extra: {
            width: 100,
          },
        };
      });
      const columns = cloneDeep(depthMultiplierColumns.current);
      setDepthMultiplierTableColumns(
        agGridColumnFormatter(columns.concat(dynamicRangeData))
      );
      let rangePercentArray = [],
        rangeMulArray = [],
        rangeMulVersionArray = [];

      for (let items of groupedData) {
        let rangePercentObj = {
          metric: "Bottom Of Range (%)",
          version: "-",
          l3_name: items[0].l3_name,
          l2_name: items[0].l2_name,
          l1_name: items[0].l1_name,
          l0_name: items[0].l0_name,
          special_classification: items[0].special_classification,
          year: items[0].year,
          yearly_flag: items[0].yearly_flag,
        };
        for (let i = 0; i < items.length; i++) {
          rangePercentObj[`range${i + 1}`] = parseFloat(items[i].range).toFixed(
            2
          );
          rangePercentObj[`range_multiplier_version${i + 1}`] = parseFloat(
            items[i].range_multiplier_version
          ).toFixed(2);
        }

        let rangeMulObj = {
          metric: "Range Index (Avg. Depth Multiplier)",
          version: "IA",
          l3_name: items[0].l3_name,
          l2_name: items[0].l2_name,
          l1_name: items[0].l1_name,
          l0_name: items[0].l0_name,
          special_classification: items[0].special_classification,
          year: items[0].year,
          yearly_flag: items[0].yearly_flag,
        };
        for (let index = 0; index < items.length; index++) {
          rangeMulObj[`range${index + 1}`] = parseFloat(
            items[index].range_multiplier
          ).toFixed(2);
        }
        if (toggleEditState) {
          let rangeMulVersionObj = {
            metric: "Range Index (Avg. Depth Multiplier)",
            version: "Working",
            l3_name: items[0].l3_name,
            l2_name: items[0].l2_name,
            l1_name: items[0].l1_name,
            l0_name: items[0].l0_name,
            special_classification: items[0].special_classification,
            year: items[0].year,
            yearly_flag: items[0].yearly_flag,
          };
          for (let index = 0; index < items.length; index++) {
            rangeMulVersionObj[`range${index + 1}`] = parseFloat(
              items[index].range_multiplier_version
            ).toFixed(2);
          }
          rangeMulVersionArray.push(rangeMulVersionObj);
        }
        rangePercentArray.push(rangePercentObj);
        rangeMulArray.push(rangeMulObj);
      }
      const tableData = [
        ...rangePercentArray,
        ...rangeMulArray,
        ...rangeMulVersionArray,
      ];
      setDepthMultiplierTableData(tableData);
      setShowDepthMultiplierLoader(false);
    }
  }, [channelSelected?.value, toggleEditState, depthMultiplierData?.current]);

  useEffect(() => {
    const fetchData = async () => {
      setShowDepthMultiplierLoader(true);
      setChannelSelected({});
      let seasonResponse = await props.getSeasonOptions({
        filters: [
          {
            attribute_name: "name",
            value: [props.planDetails?.data?.season],
            operator: "=",
          },
        ],
      });
      if (seasonResponse?.data?.status && seasonResponse?.data?.data?.length) {
        let bopResponse = await props.getBopTagData(
          {
            filters: [
              {
                attribute_name: "steps",
                value: ["2.3", "3"],
                operator: "in",
              },
              {
                attribute_name: "season",
                value: [seasonResponse?.data?.data?.[0]?.name],
                operator: "in",
                filter_type: "non-cascaded",
              },
              {
                attribute_name: "l0_name",
                value: props.planDetails?.data?.l0_name,
                operator: "in",
                filter_type: "cascaded",
              },
              {
                attribute_name: "l1_name",
                value: props.planDetails?.data?.l1_name,
                operator: "in",
                filter_type: "cascaded",
              },
            ],
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );
        if (bopResponse?.data?.status) {
          let options = [];
          bopResponse?.data?.data?.data?.forEach((item) => {
            options.push({
              label: item.name,
              value: item.plan_code,
              id: item.plan_code,
            });
          });
          setPlanOptions(options);
        }
      }
    };
    fetchData();
  }, [props.planDetails?.data]);

  const fetchDepthMultiplierData = async () => {
    setShowDepthMultiplierLoader(true);
    setDepthMultiplierTableData([]);
    depthMultiplierColumns.current = await props.getColumnsAg(
      "table_name=assort_depth_multiplier",
      props.levelsJson
    );
    let finalLevelKey =
      props.screenConfiguration?.common?.final_level === "l2_name"
        ? "l2_name"
        : "l3_name";
    let selectedL3ValueArr =
      isArray(props.selectedL3FilterValue) &&
      props.selectedL3FilterValue.map((obj) => obj.value);
    let planData = { ...props.planDetails?.data };
    if (props.selectedL1FilterValue?.value) {
      planData.l1_name = [props.selectedL1FilterValue?.value];
    }
    if (props.selectedL2FilterValue?.value) {
      planData.l2_name = [props.selectedL2FilterValue?.value];
    }
    planData.l3_name = selectedL3ValueArr?.length
      ? selectedL3ValueArr
      : [props.selectedL3FilterValue?.value];
    planData.plan_code = selectedPlan?.value || planData.plan_code;
    let depthMultiplierPayload = getPlanPayload(
      planData,
      props.planLevels,
      false,
      true
    );
    let startDate = new Date(planData.selling_period_sdate);
    let endDate = new Date(planData.selling_period_edate);
    depthMultiplierPayload.filters.push({
      attribute_name: finalLevelKey,
      operator: "in",
      value: planData[finalLevelKey],
    });
    let no_of_days_H1 = 0,
      no_of_days_H2 = 0;
    // Case1: If both start Date and end Date fall in first half of year, yearly flag: H1
    if (startDate.getMonth() < 6 && endDate.getMonth() < 6) {
      no_of_days_H1 = 1;
    } else if (startDate.getMonth() >= 6 && endDate.getMonth() >= 6) {
      // Case2: If both start Date and end Date fall in second half of year, yearly flag: H2
      no_of_days_H2 = 1;
    } else {
      if (startDate.getMonth() < 6) {
        // Case3: If start Date fall in first half of year, calculate no_of_days_h1 in first half
        let sDate = startDate;
        let eDate = new Date(startDate.getFullYear(), 5, 31);
        var difference = eDate.getTime() - sDate.getTime();
        // Convert the difference from milliseconds to days
        no_of_days_H1 = Math.ceil(difference / (1000 * 60 * 60 * 24));
      } else {
        // Case4: If start Date fall in second half of year, calculate no_of_days_h2 in second half
        let sDate = startDate;
        let eDate = new Date(startDate.getFullYear(), 11, 31);
        var difference = eDate.getTime() - sDate.getTime();
        // Convert the difference from milliseconds to days
        no_of_days_H2 = Math.ceil(difference / (1000 * 60 * 60 * 24));
      }
      if (endDate.getMonth() < 6) {
        // Case4: If end Date fall in first half of year, calculate no_of_days_h1 in first half
        let sDate =
          startDate.getMonth() < 6
            ? startDate
            : new Date(endDate.getFullYear(), 0, 1);
        let eDate = endDate;
        var difference = eDate.getTime() - sDate.getTime();
        // Convert the difference from milliseconds to days
        no_of_days_H1 = Math.ceil(difference / (1000 * 60 * 60 * 24));
      } else {
        // Case5: If end Date fall in second half of year, calculate no_of_days_h2 in second half
        let sDate = new Date(endDate.getFullYear(), 5, 31);
        let eDate = endDate;
        var difference = eDate.getTime() - sDate.getTime();
        // Convert the difference from milliseconds to days
        no_of_days_H2 = Math.ceil(difference / (1000 * 60 * 60 * 24));
      }
    }
    depthMultiplierPayload.filters.push(
      {
        attribute_name: "special_classification",
        operator: "in",
        value: props.planDetails?.data?.channel,
      },
      {
        attribute_name: "yearly_flag",
        operator: "in",
        value: [no_of_days_H2 > no_of_days_H1 ? "H2" : "H1"],
      }
    );

    if (props.planDetails?.data?.sub_channel) {
      depthMultiplierPayload.filters.push({
        attribute_name: "sub_channel",
        operator: "in",
        value: props.planDetails?.data?.sub_channel,
      });
    }

    if (
      props.screenConfiguration?.common?.show_style_level ||
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
    ) {
      depthMultiplierPayload.filters.forEach((payload) => {
        return (payload["prefix"] = "levels");
      });
    }
    let payload = {
      filters: depthMultiplierPayload.filters.filter((payloadData) => {
        return (
          props.screenConfiguration?.common?.endpoint_project_name !==
            "assort-smart" || payloadData.attribute_name !== "plan_code"
        );
      }),
    };
    if (
      props.screenConfiguration?.common?.show_style_level ||
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
    ) {
      payload["wedge_level"] = "choice_level";
    }
    let depthMultiplierResponse = await props.getDepthMultiplierData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );

    depthMultiplierData.current = depthMultiplierResponse?.data?.data;

    const channelData = uniqBy(
      depthMultiplierResponse?.data?.data,
      "special_classification"
    );

    const channelOptions = channelData?.map((item) => {
      return {
        label: item.special_classification,
        value: item.special_classification,
        id: item.special_classification,
      };
    });
    setChannelSelected(channelOptions[0]);
    setChannelOptions(channelOptions);
    depthMultiplierData.current = depthMultiplierResponse?.data?.data;
  };

  useEffect(() => {
    if (selectedPlan?.value) {
      fetchDepthMultiplierData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan]);

  useEffect(() => {
    fetchDepthMultiplierData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChannelChange = (option) => {
    setChannelSelected(option);
    setDepthMultiplierTableColumns([]);
    setDepthMultiplierTableData([]);
  };

  const switchState = (e) => {
    e.stopPropagation();
    setDepthMultiplierTableData([]);
    setToggleEditState(!toggleEditState);
  };

  const updateTableDataOnBlur = async (
    e,
    data,
    column,
    isChanged,
    value,
    initialValue,
    cellData,
    initValue,
    previousValue
  ) => {
    let newValue = initValue;
    let columnId = column.colDef.accessor;
    let tempData = [];
    depthMultiplierInstance.current.api.forEachNode((eachRow, index) => {
      if (eachRow.data.version === data.version) {
        eachRow.data[columnId] = newValue;
      }
      tempData.push(eachRow.data);
    });
    depthMultiplierInstance.current.api.refreshCells({
      update: tempData,
    });
  };

  const generateWedge = async () => {
    depthMultiplierTableData = depthMultiplierTableData.filter(
      (data) => data.version !== "IA"
    );
    let payload = [];
    let tempData = [];
    let planData = props.planDetails?.data;
    let obj = {};
    depthMultiplierTableData.forEach((tableData) => {
      Object.keys(tableData).forEach((key) => {
        if ((toggleEditState && key.includes("range") && !key.includes("range_multiplier_version")) || (!toggleEditState && key.includes("range"))) {
          if (
            tableData?.version === "-" &&
            tableData.special_classification === channelSelected.label
          ) {
            obj = {
              plan_code: planData.plan_code,
              l0_name: tableData?.l0_name,
              l1_name: tableData?.l1_name,
              l2_name: tableData?.l2_name,
              l3_name: tableData?.l3_name,
              year: tableData.year,
              yearly_flag: tableData.yearly_flag,
              special_classification: tableData.special_classification,
            };
            if(!toggleEditState && key.includes("range_multiplier_version")){
              obj["range_multiplier_version"] = parseFloat(tableData[key]);
              obj["range_id"] = key.split("range_multiplier_version")?.[1];
            }else{
              obj["range"] = parseFloat(tableData[key]);
              obj["range_id"] = key.split("range")?.[1];
            }
            tempData.push(obj);
          }
          if (
            tableData?.version === "Working" &&
            tableData.special_classification === channelSelected.label
          ) {
            obj = {
              plan_code: planData.plan_code,
              l0_name: tableData?.l0_name,
              l1_name: tableData?.l1_name,
              l2_name: tableData?.l2_name,
              l3_name: tableData?.l3_name,
              year: tableData.year,
              yearly_flag: tableData.yearly_flag,
              special_classification: tableData.special_classification,
            };
            obj["range_multiplier_version"] = parseFloat(tableData[key]);
            obj["range_id"] = key.split("range")?.[1];
            tempData.push(obj);
          }
        }
      });
    });
    let groupedDataArr = groupByCustom({
      Group: tempData,
      By: ["range_id", "special_classification"],
    });
    groupedDataArr.forEach((groupedData) => {
      let obj = { ...groupedData?.[0] };
      delete obj["range_id"];
      groupedData.forEach((data) => {
        if (data.range_multiplier_version) {
          payload.push({
            ...obj,
            range_multiplier_version: data.range_multiplier_version,
          });
        }
      });
    });
    let response = await props.updateDepthMultiplierData(
      { data: payload },
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (response.data.status) {
      props.toggleViewDepthMultiplier(false);
      props.callOptimizeWedge();
    }
  };

  const isExternalFilterPresent = useCallback(() => {
    // filter incase of wholesale plan and mulitple channels
    return isChannelMultiple(props.planDetails?.data) ? true : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      if (node.data) {
        return node.data.special_classification === channelSelected?.value;
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channelSelected, depthMultiplierTableData]
  );

  const loadTableInstance = (params) => {
    depthMultiplierInstance.current = params;
  };

  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={props.showDepthMultiplierModal}
      fullWidth={true}
      onClose={() => props.toggleViewDepthMultiplier(false)}
    >
      <LoadingOverlay loader={depthMultiplierLoader}>
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            Depth multiplier
            <IconButton aria-label="close" size="large">
              <CloseIcon
                onClick={() => props.toggleViewDepthMultiplier(false)}
              />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div className={classes.heading}>
            {filterView(
              "Channel",
              "channel",
              channelOptions,
              handleChannelChange,
              channelSelected,
              classes.formContainer,
              classes.inputLabel
            )}
            {filterView(
              "Selected Plan",
              "selectedPlan",
              planOptions,
              setSelectedPlan,
              selectedPlan,
              classes.formContainer,
              classes.inputLabel
            )}
            <div className={`${classes.rightEnd} ${classes.paperStyle}`}>
              <Switch
                checked={toggleEditState}
                onChange={(e) => {
                  switchState(e);
                }}
                id="switch-edit"
                leftLabel=""
                rightLabel="Edit"
              />
              <Button
                variant="contained"
                color="primary"
                title={"Generate Wedge"}
                id={"generate-wedge"}
                onClick={() => generateWedge()}
                disabled={!depthMultiplierTableData?.length}
                className={classes.buttonFitMargin}
              >
                Generate Wedge
              </Button>
            </div>
          </div>
          <div className={classes.depthMultiplierDivContainer}>
            <AgGridTable
              rowdata={depthMultiplierTableData || []}
              columns={depthMultiplierTableColumns || []}
              customCellRenderer={(cellProps) =>
                assortAgGridCustomCellRenderer(
                  cellProps,
                  "depth_multiplier_table"
                )
              }
              onBlur={updateTableDataOnBlur}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              loadTableInstance={loadTableInstance}
              pagination={false}
              sideBar={false}
              adjustTableHeight={true}
              staticColId={true}
            />
          </div>
        </DialogContent>
      </LoadingOverlay>
    </Dialog>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getColumnsAg,
      getDepthMultiplierData,
      updateDepthMultiplierData,
      getSeasonOptions,
      getBopTagData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DepthMultiplierComponent));
