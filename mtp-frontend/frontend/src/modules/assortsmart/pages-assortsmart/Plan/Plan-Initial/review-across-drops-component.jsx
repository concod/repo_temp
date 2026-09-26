import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { Card, Typography } from "@mui/material";
import { bindActionCreators } from "redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  filterView,
  getDefaultChannelValue,
  isChannelMultiple,
  getLevelFilters,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  set2_1_Loader,
  getReviewBudgetAcrossDropsData,
  setReviewBudgetAcrossDropsData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { addSnack } from "core/actions/snackbarActions";
import {
  getFooterRowForDropsTable,
  handlePlanLevelsChange,
  configureL3level,
} from "./plan-initial-functions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import { cloneDeep, isEmpty, uniqBy } from "lodash";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { configureLevels } from "../../Plan-Dashboard/components/common-plan-functions";
import { attributeFormatter } from "../../../utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";

const ReviewAcrossDropsTable = (props) => {
  const [channelOptions, setChannelOptions] = useState([]);
  const [channel, setSelectedChannel] = useState(null);
  const [reviewDropsColumns, setReviewDropsColumns] = useState([]);
  const [reviewDropsTableData, setReviewDropsTaleData] = useState([]);
  const [level3Value, setLevel3value] = useState({});
  const [levelsOptions, setLevelsOptions] = useState([]);
  const [levelSelected, setLevelSelected] = useState({});
  const AGInstance = useRef({});
  const [levelThreeOptions, setLevelThreeOptions] = useState([]);
  //const [formData, setFormData] = useState({});
  const formData = useRef({});
  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    if (props.planDetails?.data) {
      let channelOpt = props.planDetails?.data?.channel.map((data) => {
        return {
          label: data,
          value: data,
          id: data,
        };
      });
      setChannelOptions(channelOpt);
      let defaultChannel = getDefaultChannelValue(
        channelOpt,
        props.planDetails?.data
      );
      setSelectedChannel(defaultChannel);
    }
  }, [props.planDetails?.data]);

  useEffect(() => {
    if (AGInstance?.current?.api) {
      AGInstance.current.api.onFilterChanged();
    }
  }, [channel, AGInstance, level3Value]);

  useEffect(() => {
    if (
      props.reviewBudgetAcrossDropsData &&
      !isEmpty(props.reviewBudgetAcrossDropsData)
    ) {
      let reviewDrops = true;
      let columnData = props.reviewBudgetAcrossDropsData?.column;
      columnData = agGridColumnFormatter(
        cloneDeep(columnData),
        props.columnHeaderJson
      );
      setReviewDropsColumns(columnData);
      const levelsData = commonLevelsData();

      let formValues = {};
      Object.keys(props.levelsJson).forEach((level) => {
        if (!isEmpty(levelsData?.selectedValue?.[level])) {
          formValues[level] = levelsData?.selectedValue?.[level]?.label;
        }
      });

      const level3Data = level3common(
        levelsData,
        props.reviewBudgetAcrossDropsData?.data,
        props.levelThreeOptions
      );

      setLevelThreeOptions(level3Data);
      setLevel3value(level3Data[0]);
      formData.current = formValues;
      setLevelsOptions(levelsData?.options);
      setLevelSelected(levelsData?.selectedValue);
      const reviewDropsData = props.reviewBudgetAcrossDropsData?.data;
      let tableData = [],
        tableObj = {};
      reviewDropsData.forEach((item) => {
        tableObj = {};
        let totalFlowLy = 0,
          totalFlowTy = 0;
        tableObj["l1_name"] = item.l1_name;
        tableObj["l2_name"] = item.l2_name;
        tableObj["l3_name"] = item.l3_name;
        tableObj[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] = attributeFormatter(
          item[props.screenConfiguration?.common?.drop_key || "drop"]
        );
        //calculating flow total here
        for (
          let i = 1;
          i <=
          props.planDetails?.data?.[
            `${[
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops",
            ]}_count`
          ];
          i++
        ) {
          totalFlowLy +=
            item[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_budget_ly`
            ];
          totalFlowTy +=
            item[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_budget_ty`
            ];
          tableObj[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }${i}_receipt_ty`
          ] =
            item[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_budget_ty`
            ];
          tableObj[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }${i}_receipt_ly`
          ] =
            item[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_budget_ly`
            ];
        }
        tableObj[
          `${props.screenConfiguration?.common?.drop_key || "drop"}_receipt_ty`
        ] =
          item[
            `${props.screenConfiguration?.common?.drop_key || "drop"}_budget_ty`
          ];
        tableObj[
          `${props.screenConfiguration?.common?.drop_key || "drop"}_receipt_ly`
        ] =
          item[
            `${props.screenConfiguration?.common?.drop_key || "drop"}_budget_ly`
          ];
        tableObj["total_receipt_ly"] = totalFlowLy;
        tableObj["total_receipt_ty"] = totalFlowTy;
        tableObj["carryover_flag"] = item.carryover_flag;
        tableObj["channel"] = item.channel;
        tableObj["sub_channel"] = item.sub_channel;
        tableObj["uniqueID"] =
          item.l3_name +
          item[props.screenConfiguration?.common?.drop_key || "drop"] +
          item.carryover_flag +
          item.l1_name +
          item.l2_name +
          item.channel;
        tableData.push(tableObj);
      });
      props.set2_1_Loader(false);
      getFooterRowForDropsTable(tableData, reviewDrops, props);
      setReviewDropsTaleData(tableData);
    }
  }, [props.reviewBudgetAcrossDropsData]);

  const fetchTableData = async () => {
    props.set2_1_Loader(true);
    try {
      const payload = {
        filters: [
          {
            attribute_name: "plan_code",
            value: [props.planDetails?.data?.plan_code],
            operator: "in",
          },
          ...getLevelFilters(props.planDetails?.data, props.planLevels),
        ],
      };
      const reviewBudgetdata = await props.getReviewBudgetAcrossDropsData(
        payload,
        props.planDetails?.data?.plan_code
      );
      if (reviewBudgetdata?.data?.status) {
        props.set2_1_Loader(false);
        props.setReviewBudgetAcrossDropsData(reviewBudgetdata?.data?.data);
        props.setDisableNext(false);
      }
    } catch (error) {
      props.set2_1_Loader(false);
      props.addSnack({
        message: "Fetching review by sales data failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  useEffect(() => {
    fetchTableData();
  }, []);

  const onChangeChannel = async (channel) => {
    setSelectedChannel(channel);
    AGInstance.current.api.onFilterChanged();
  };

  const handleLevelThreeChange = async (option) => {
    setLevel3value(option);
    AGInstance.current.api.onFilterChanged();
  };
  useEffect(() => {
    let level3NewData = props.reviewBudgetAcrossDropsData?.data;
    let levelsData2 = commonLevelsData();

    if (isChannelMultiple(props.planDetails?.data)) {
      level3NewData = props.reviewBudgetAcrossDropsData?.data?.filter(
        (item) => item.channel == channel?.["value"]
      );
    }

    const l3Values = uniqBy(level3NewData, "l3_name");
    const l3ValuesOpt = l3Values?.map((item) => {
      return {
        label: item.l3_name,
        value: item.l3_name,
        id: item.l3_name,
      };
    });
    let levelThreeData = level3common(levelsData2, level3NewData, l3ValuesOpt);
    setLevelThreeOptions(levelThreeData);
  }, [channel, props.reviewBudgetAcrossDropsData]);
  const commonLevelsData = () => {
    let levels = configureLevels(
      props.planDetails?.data,
      props.levelsJson,
      props.reviewBudgetAcrossDropsData?.data
    );
    return levels;
  };
  const level3common = (levelsData, data, options) => {
    let modifiedData = configureL3level(levelsData, data, options);
    return modifiedData;
  };
  const handleLevelsChange = (option, key) => {
    handlePlanLevelsChange(
      option,
      key,
      props.reviewBudgetAcrossDropsData?.data,
      levelSelected,
      formData,
      levelsOptions,
      setLevelThreeOptions,
      setLevel3value,
      setLevelsOptions,
      setLevelSelected
    );
    AGInstance.current.api.onFilterChanged();
  };

  const loadTableInstance = (params) => {
    AGInstance.current = params;
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    return isChannelMultiple(props.planDetails?.data) ||
      props.levelThreeOptions?.length > 1 ||
      props.planDetails?.data?.l1_name?.length > 1 ||
      props.planDetails?.data?.l2_name?.length > 1
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.levelThreeOptions]);

  const doesExternalFilterPass = useCallback(
    (node) => {
      // Filter based on channel
      if (node.data) {
        let defaultChannel = getDefaultChannelValue(
          channelOptions,
          props.planDetails?.data
        );
        let channelValue = channel?.value
          ? channel?.value
          : defaultChannel?.value;
        let formDataLevels = [];
        Object.keys(formData.current).forEach((formKey) => {
          if (Object.keys(props.levelsJson).includes(formKey)) {
            formDataLevels.push(formKey);
          }
        });
        if (isChannelMultiple(props.planDetails?.data)) {
          return (
            channelValue === node.data?.channel &&
            (level3Value?.value === node?.data?.l3_name ||
              (node?.data?.l3_name === "Total" &&
                level3Value?.value === node?.data?.l3_name_key))
          );
        }
        if (formDataLevels?.length >= 1) {
          let filteredData = [];
          //filter table data based on selected filter values of different levels
          formDataLevels.forEach((level) => {
            if (
              formData.current[level] === node?.data?.[level] &&
              (level3Value?.value === node?.data?.l3_name ||
                (node?.data?.l3_name === "Total" &&
                  level3Value?.value === node?.data?.l3_name_key))
            ) {
              filteredData.push(node?.data?.[level]);
            }
          });
          //Return true if particular row matches levels(l0, l1, l2, etc) value with selected levels value
          return filteredData?.length === formDataLevels?.length;
        }
        return (
          level3Value?.value === node?.data?.l3_name ||
          (node?.data?.l3_name === "Total" &&
            level3Value?.value === node?.data?.l3_name_key)
        );
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channel, level3Value, formData]
  );

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  let dropOrLaunch = attributeFormatter(
    props.screenConfiguration?.common?.drop_key || "drop"
  );

  return (
    <>
      {/* <LoadingOverlay loader={props.isLoading} spinner> */}
      {reviewDropsColumns?.length ? (
        <Card className={globalClasses.paper} id="review-across-drop-table">
          <div className={classes.heading}>
            <Typography variant="h3">
              Review By Sales Across {dropOrLaunch}
            </Typography>
            {Object.keys(props.levelsJson).map((levelKey) => {
              return (
                levelsOptions[levelKey]?.length > 0 &&
                filterView(
                  props.columnHeaderJson?.[levelKey],
                  levelKey,
                  levelsOptions[levelKey],
                  handleLevelsChange,
                  levelSelected[levelKey],
                  classes.formContainer,
                  classes.inputLabel
                )
              );
            })}
            {levelThreeOptions?.length &&
              filterView(
                props.columnHeaderJson?.l3_name,
                "l3_name",
                levelThreeOptions,
                handleLevelThreeChange,
                level3Value,
                classes.formContainer,
                classes.inputLabel
              )}
            {isChannelMultiple(props.planDetails?.data) &&
              filterView(
                "Channel",
                "channel",
                channelOptions,
                onChangeChannel,
                channel,
                classes.formContainer,
                classes.inputLabel
              )}
          </div>
          {reviewDropsColumns?.length && (
            <AgGridTable
              rowdata={reviewDropsTableData || []}
              columns={reviewDropsColumns}
              loadTableInstance={loadTableInstance}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              uniqueRowId={"uniqueID"}
              sideBar={false}
              pagination={false}
              tableId={"review-across-drops-table"}
              enableRowSpan={true}
              rowSpanColumn={[
                "l3_name",
                props.screenConfiguration?.common?.drop_key || "drop",
                "carryover_flag",
              ]}
              getRowData={getRowData}
            ></AgGridTable>
          )}
        </Card>
      ) : null}
      {/* </LoadingOverlay> */}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: planInitialServiceActions.loader_2_1_Selector(state),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    reviewBudgetAcrossDropsData: planInitialServiceActions.reviewBudgetAcrossDropsSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      set2_1_Loader,
      getReviewBudgetAcrossDropsData,
      setReviewBudgetAcrossDropsData,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewAcrossDropsTable);
