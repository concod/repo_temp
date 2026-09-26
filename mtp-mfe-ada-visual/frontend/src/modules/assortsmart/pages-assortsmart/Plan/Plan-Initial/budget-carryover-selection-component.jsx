import { getColumnsAg } from "core/actions/tableColumnActions";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { bindActionCreators } from "redux";
import AgGridTable from "core/Utils/agGrid";
import {
  set2_1_Loader,
  optimizationCarryOverLogic,
  fetchPlanCarryoverData,
  updatePlanCarryoverData,
  getCarryoverOptimizeL3Data,
  fetchPlanCarryoverPercView,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { BUDGET_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import { addSnack } from "core/actions/snackbarActions";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { Button, IconButton, Typography } from "@mui/material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { rowdata } from "./store-addition-table-data";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { Switch } from "impact-ui";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import {
  filterView,
  isChannelMultiple,
  scrollIntoView,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { cloneDeep, isEmpty, uniqBy } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  getOptimiseL3Payload,
  assortAgGridCustomCellRenderer,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { attributeToBeRemovedFromCarryover } from "modules/assortsmart/constants-assortsmart/stringContants";
import RuleEngineModal from "./rule-engine-modal-component";
import { generateCarryoverTotalFooter } from "./budget-carryover-function";

const carryoverStyle = makeStyles(() => ({
  container: {
    display: "flex",
    columnGap: "10px",
  },
  storeAdditionContainer: {
    width: "50%",
  },
  closeIcon: {
    display: "flex",
    justifyContent: "space-between",
  },
  carryoverActionButtons: {
    display: "flex",
    margin: "10px 0",
    "& .buttons": {
      height: "40px",
    },
  },

  percentageTableContainer: {
    margin: "20px 0",
  },
}));

const BudgetCarryoverSelectionComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [carryoverTableData, setCarryoverTableData] = useState([]);
  const [storeAdditionColumn, setStoreAdditionColumn] = useState([]);
  const [selectedColorID, setSelectedColorID] = useState(null);
  const [l3Options, setL3Options] = useState([]);
  const [selectedL3FilterValue, setSelectedL3FilterValue] = useState({});
  const [channelOptions, setChannelOptions] = useState([]);
  const [selectedChannelFilterValue, setSelectedChannelFilterValue] = useState(
    {}
  );
  const [perViewColumnData, setPercentageViewColumnData] = useState([]);
  const [selectedTab, setSelectedTab] = useState("style_color");
  const [styleIdColumnData, setStyleIdColumnData] = useState([]);
  const [styleIdRowData, setStyleIdRowData] = useState([]);
  const [showPercentageView, setShowPercentageView] = useState(false);
  const [percentageToggle, setPercentageToggle] = useState(true);
  const [percentageViewTableData, setPercentageViewTableData] = useState([]);
  const [showRuleEnginePopup, setShowRuleEnginePopup] = useState(false);
  let [updatedCarryoverRow, setUpdatedCarryoverRow] = useState([]);
  const [totalFooter, setTotalFooter] = useState([]);
  const [filteredFooter, setFilteredFooter] = useState([]);
  const CarryoverSelectionInstance = useRef({});
  const CarryoverStyleInstance = useRef({});
  const CarryoverPercViewInstance = useRef({});
  let formData = useRef({});
  const classes = useStyles();
  const globalClasses = globalStyles();
  const carryoverClasses = carryoverStyle();
  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;

  useEffect(() => {
    const fetchData = async () => {
      props.setShowLoader(true);
      props.set2_1_Loader(true);
      let carryoverStyleColumns = await getColumnsAg(
        "table_name=plan_carryover_style_selection",
        props.columnHeaderJson
      )();
      setStyleIdColumnData(carryoverStyleColumns);

      let cols = await getColumnsAg(
        "table_name=plan_carryover_selection",
        props.columnHeaderJson
      )();
      cols.forEach((eachCol) => {
        // To be uncomented whenever we need this feature
        // if (eachCol.accessor === "store_list") {
        //   eachCol.sub_headers.map((subCol) => {
        //     if (subCol.type === "link") {
        //       subCol.cellRenderer = (instance) => {
        //         subCol.onClick = onStoreNameClick;
        //         let cellData = { ...instance };
        //         // If condition is true show link
        //         // NOTE: Condition to show link need to be revisted once confirmed
        //         if (cellData.value > 90) {
        //           return (
        //             <CellRenderers
        //               cellData={cellData}
        //               column={subCol}
        //             ></CellRenderers>
        //           );
        //         } else return cellData.value;
        //       };
        //     }
        //   });
        // }
      });
      setColumns(cols);
      if (cols?.length) {
        const planDetailsData = props.planDetails?.data;
        if (
          planDetailsData.plan_step !== 2.1 || props.planSubstep !== "review_target" ||
          props.initialLoadBudgetComponent
        ) {
          return fetchCarryOverTableData(selectedTab);
        }
        let optimisePayload = {
          plan_code: planDetailsData.plan_code,
          filters: {
            l0_name: planDetailsData.l0_name,
            l1_name: planDetailsData.l1_name,
            l2_name: planDetailsData.l2_name,
            season: [planDetailsData.season],
            compare_year: [planDetailsData.compare_year],
            time_period: [
              planDetailsData.selling_period_sdate,
              planDetailsData.selling_period_edate,
            ],
          },
        };
        if (planDetailsData.data_pull_source) {
          optimisePayload.filters.data_pull_source = [
            planDetailsData.data_pull_source,
          ];
        }
        optimisePayload.compare_season = [planDetailsData.compare_season || ""];
        let optimiseCarryoverResponse = await props.optimizationCarryOverLogic(
          optimisePayload
        );
        if (optimiseCarryoverResponse?.data?.data?.status) {
          setShowPercentageView(true);
        } else {
          props.addSnack({
            message: optimiseCarryoverResponse?.data?.data?.message,
            options: {
              variant: "error",
            },
          });
          props.setShowLoader(false);
          props.set2_1_Loader(false);
        }
      }
    };
    if (props.callCarryOverData) {
      fetchData();
    }
  }, [props.callCarryOverData]);

  useEffect(() => {
    const fetchData = async () => {
      let reoptimizeResponse = await updateCarryover();
      if (reoptimizeResponse) {
        fetchCarryOverTableData(selectedTab);
        let carryoverPercViewColumns = await getColumnsAg(
          "table_name=plan_carryover_perc_view",
          props.columnHeaderJson
        )();
        carryoverPercViewColumns.map((col) => {
          col.suppressSizeToFit = false;
        });
        setPercentageViewColumnData(carryoverPercViewColumns);
        if (carryoverPercViewColumns?.length) {
          let payload = {
            filters: [
              {
                attribute_name: "plan_code",
                value: [props.planDetails?.data.plan_code],
                operator: "in",
              },
            ],
          };
          let planCarryoverPercResponse = await props.fetchPlanCarryoverPercView(
            payload
          );
          if (planCarryoverPercResponse?.data?.data?.status) {
            setPercentageViewTableData(
              planCarryoverPercResponse.data.data?.data
            );
            if (CarryoverPercViewInstance?.current?.api) {
              CarryoverPercViewInstance?.current?.api.refreshCells({
                force: true,
                suppressFlash: false,
              });
            }
          }
        }
      }
    };

    if (showPercentageView) {
      fetchData();
    }
  }, [showPercentageView]);

  const fetchCarryOverTableData = async (tab, isSetLoader) => {
    const planDetailsData = props.planDetails?.data;
    let payload = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [planDetailsData.plan_code],
          operator: "in",
        },
        {
          attribute_name: "l0_name",
          value: planDetailsData.l0_name,
          prefix: "levels",
          operator: "in",
        },
        {
          attribute_name: "l1_name",
          value: planDetailsData.l1_name,
          prefix: "levels",
          operator: "in",
        },
        {
          attribute_name: "is_grouping",
          operator: "in",
          value: [tab],
        },
      ],
    };
    try {
      let budgetCarryoverData = await props.fetchPlanCarryoverData(payload);
      if (budgetCarryoverData?.data?.status) {
        if (tab === "style_color") {
          setCarryoverTableData([]);
          // Setting table data for style color table
          let budgetCarryoverTableData = budgetCarryoverData?.data?.data?.data;
          if (isEmpty(selectedL3FilterValue)) {
            getL3FilterDropdownOption(budgetCarryoverTableData);
          }
          if (isEmpty(selectedChannelFilterValue)) {
            getChannelFilterDropdownOption(budgetCarryoverTableData);
          }
          budgetCarryoverTableData.forEach((data) => {
            data.old_store_list = data.store_codes.length;
            data.new_store_list = data.store_codes.length;
            data.multificative_factor = 1;
            data.store_count = data.store_codes.length;
            data.uniqueRowId = data.style_color_id + data.channel;
            data.st_ty = data.st_ty * 100;
            data.is_selected = data.is_active;
          });
          setCarryoverTableData(budgetCarryoverTableData);
          props.setCarryoverOptData(budgetCarryoverData?.data?.data);
          if (CarryoverSelectionInstance?.current?.api) {
            CarryoverSelectionInstance?.current?.api.refreshCells({
              force: true,
              suppressFlash: false,
            });
          }
        } else {
          // Setting table data for style table
          getL3FilterDropdownOption(budgetCarryoverData?.data?.data?.data);
          setStyleIdRowData(budgetCarryoverData?.data?.data?.data);
          if (CarryoverStyleInstance?.current?.api) {
            CarryoverStyleInstance?.current?.api.refreshCells({
              force: true,
              suppressFlash: false,
            });
          }
        }
      }
      if (!isSetLoader) {
        props.set2_1_Loader(false);
        props.setShowLoader(false);
      }
    } catch (err) {
      props.set2_1_Loader(false);
      props.setShowLoader(false);
    }
  };

  const getL3FilterDropdownOption = (budgetCarryoverTableData) => {
    let l3Values = uniqBy(budgetCarryoverTableData, "l3_name");
    let l3ValuesOpt = l3Values?.map((item) => {
      return {
        label: item.l3_name,
        value: item.l3_name,
        id: item.l3_name,
      };
    });
    setL3Options(l3ValuesOpt);
    //VB specific logic for carryover selection
    const l3Selected = l3ValuesOpt.filter((item) => item.label === "Core");
    setSelectedL3FilterValue(l3Selected[0]);
  };

  const getChannelFilterDropdownOption = (budgetCarryoverTableData) => {
    let channelValues = uniqBy(budgetCarryoverTableData, "channel");
    let channelValuesOpt = channelValues?.map((item) => {
      return {
        label: item.channel,
        value: item.channel,
        id: item.channel,
      };
    });
    setChannelOptions(channelValuesOpt);
    setSelectedChannelFilterValue(channelValuesOpt[0]);
  };

  const updateCarryover = async () => {
    if (updatedCarryoverRow?.length) {
      props.set2_1_Loader(true);
      let plan_carryover_data = [];
      updatedCarryoverRow.map((tableData) => {
        let filterValues = {
          style: tableData.style_id,
          l0_name: tableData.l0_name,
          l1_name: tableData.l1_name,
          l2_name: tableData.l2_name,
          l3_name: tableData.l3_name,
          color_id: tableData.style_color_id,
        };
        let attributeValues = {
          reg_weeks_ty: tableData.reg_weeks_ty,
          aur_ty: tableData.aur_ty,
          gross_margin_perc_ty: tableData.gross_margin_perc_ty,
          multificative_factor: tableData.multificative_factor,
          st_ty: tableData.st_ty / 100,
          store_count: tableData.store_count,
          is_locked: tableData.is_locked,
          is_edited_forecasted_units: tableData.is_edited_forecasted_units,
          is_edited_aur: tableData.is_edited_aur,
          is_edited_st: tableData.is_edited_st,
        };
        attributeToBeRemovedFromCarryover.forEach((key) => {
          delete attributeValues[key];
        });
        plan_carryover_data.push({
          style_color_id: tableData.style_color_id,
          plan_code: tableData.plan_code,
          store_code: tableData?.store_codes,
          is_active: tableData.is_active ? true : false,
          filters: filterValues,
          attribute_value: attributeValues,
        });
      });
      let reoptimizePayload = { plan_carryover_data };
      let reoptimizeResponse = await props.updatePlanCarryoverData(
        reoptimizePayload
      );
      setUpdatedCarryoverRow([]);
      if (reoptimizeResponse?.data?.status) {
        return reoptimizeResponse;
      } else {
        return false;
      }
    } else {
      return true;
    }
  };

  const onReoptimizeCarryoverSelction = async () => {
    let updateCarryoverResponse = await updateCarryover();
    if (updateCarryoverResponse) {
      const planDetailsData = props.planDetails?.data;
      let optimisePayload = {
        plan_code: planDetailsData.plan_code,
        filters: {
          l0_name: planDetailsData.l0_name,
          l1_name: planDetailsData.l1_name,
          l2_name: planDetailsData.l2_name,
          season: [planDetailsData.season],
          compare_year: [planDetailsData.compare_year],
          time_period: [
            planDetailsData.selling_period_sdate,
            planDetailsData.selling_period_edate,
          ],
        },
      };
      let optimiseCarryoverResponse = await props.optimizationCarryOverLogic(
        optimisePayload
      );
      if (optimiseCarryoverResponse?.data?.data?.status) {
        fetchCarryOverTableData(selectedTab);
      } else {
        props.addSnack({
          message: optimiseCarryoverResponse?.data?.data?.message,
          options: {
            variant: "error",
          },
        });
        props.setShowLoader(false);
        props.set2_1_Loader(false);
      }
    }
  };

  const switchViewState = (e) => {
    setPercentageToggle(e.target.checked);
    if (e.target.checked) {
      perViewColumnData.map((col) => {
        if (col.type === "percentage") {
          col.is_hidden = false;
        }
        if (col.type === "dollar" || col.type === "int") {
          col.is_hidden = true;
        }
      });
      let column = agGridColumnFormatter(perViewColumnData);
      column.map((col) => {
        col.suppressSizeToFit = false;
      });
      setPercentageViewColumnData(column);
    } else {
      perViewColumnData.map((col) => {
        if (col.type === "dollar" || col.type === "int") {
          col.is_hidden = false;
        }
        if (col.type === "percentage") {
          col.is_hidden = true;
        }
      });
      let column = agGridColumnFormatter(perViewColumnData);
      column.map((col) => {
        col.suppressSizeToFit = false;
      });
      setPercentageViewColumnData(column);
    }
  };

  const handleChangeTab = async (_event, selectedData) => {
    props.set2_1_Loader(true);
    setSelectedTab(selectedData);
    if (selectedData === "style") {
      let reoptimizeResponse = await updateCarryover();
      if (reoptimizeResponse) {
        fetchCarryOverTableData(selectedData);
      }
    } else {
      fetchCarryOverTableData(selectedData);
    }
  };

  const handleL3ValueChange = (option) => {
    formData.current = { ...formData.current, l3_name: option?.label };
    setSelectedL3FilterValue(option);
    CarryoverSelectionInstance.current.api.onFilterChanged();
    setFilteredFooter(props.getFilteredFooter(totalFooter, formData.current));
  };

  const handleChannelValueChange = (option) => {
    formData.current = { ...formData.current, channel: option?.label };
    setSelectedChannelFilterValue(option);
    CarryoverSelectionInstance.current.api.onFilterChanged();
    setFilteredFooter(props.getFilteredFooter(totalFooter, formData.current));
  };

  const onStoreNameClick = async (ins) => {
    setSelectedColorID(ins.cellData.data);
    let cols = await getColumnsAg(
      "table_name=plan_store_addition",
      props.columnHeaderJson
    )();
    if (cols?.length) {
      setStoreAdditionColumn(cols);
    }
  };

  const onChangeSaleUnits = (row) => {
    let newObj = row;
    newObj["sales_ty"] = newObj["sales_units_ty"] * newObj["aur_ty"];
    newObj["buy_units_ty"] = newObj["st_ty"]
      ? newObj["sales_units_ty"] / (newObj["st_ty"] / 100)
      : 0;
    newObj["retail_receipts_ty"] = newObj["st_ty"]
      ? (newObj["sales_units_ty"] * newObj["aur_ty"]) / (newObj["st_ty"] / 100)
      : 0;

    newObj["gross_margin_ty"] =
      newObj["sales_units_ty"] *
      newObj["aur_ty"] *
      newObj["gross_margin_perc_ty"];
    newObj["aps_ty"] =
      newObj["new_store_list"] && newObj["reg_weeks_ty"]
        ? newObj["sales_units_ty"] /
          newObj["new_store_list"] /
          newObj["reg_weeks_ty"]
        : 0;
    return newObj;
  };

  const updateCarryoverRowData = async (
    e,
    data,
    column,
    isChanged,
    newValue,
    initialValue
  ) => {
    setShowPercentageView(false);
    const tempData = [];
    CarryoverSelectionInstance?.current?.api?.forEachNode((node) => {
      if (node.data.style_color_id !== "Total") {
        tempData.push(node.data);
      }
    });
    let value = parseFloat(newValue);
    let footers = [];
    //Change Sales value whenever AUR or Sales Units changes
    switch (column.colId) {
      case "sales_units_ty":
        let tableData = tempData.map((eachRow) => {
          let newObj = { ...eachRow };
          if (eachRow.style_color_id === data.style_color_id) {
            newObj["multificative_factor"] = parseFloat(value / initialValue);
            newObj["sales_units_ty"] = value;
            newObj = onChangeSaleUnits(newObj);
            newObj.is_edited_forecasted_units = true;
            setUpdatedCarryoverRowToState(newObj);
          }
          return newObj;
        });
        setCarryoverTableData(tableData);
        footers = generateCarryoverTotalFooter(tableData);
        setTotalFooter(footers);
        break;
      case "aur_ty":
        let updatedTableData = tempData.map((eachRow) => {
          let newObj = { ...eachRow };
          if (eachRow.style_color_id === data.style_color_id) {
            newObj["aur_ty"] = value;
            newObj["sales_ty"] = newObj["aur_ty"] * newObj["sales_units_ty"];
            newObj["retail_receipts_ty"] = newObj["st_ty"]
              ? (newObj["sales_units_ty"] * value) / (newObj["st_ty"] / 100)
              : 0;
            newObj["gross_margin_ty"] =
              newObj["sales_units_ty"] * value * newObj["gross_margin_perc_ty"];
            newObj["is_edited_aur"] = true;
            setUpdatedCarryoverRowToState(newObj);
          }
          return newObj;
        });
        setCarryoverTableData(updatedTableData);
        footers = generateCarryoverTotalFooter(updatedTableData);
        setTotalFooter(footers);
        break;
      case "reg_weeks_ty":
        let changedTableData = tempData.map((eachRow) => {
          let newObj = { ...eachRow };
          if (eachRow.style_color_id === data.style_color_id) {
            let oldUnits = cloneDeep(newObj["sales_units_ty"]);
            newObj["sales_units_ty"] = newObj["reg_weeks_ty"]
              ? (value * newObj["ia_recommended_sales_units"]) /
                newObj["reg_weeks_ty"]
              : 0;
            let newUnits = newObj["sales_units_ty"];
            newObj["multificative_factor"] = newUnits / oldUnits;
            newObj["reg_weeks_ty"] = value;
            newObj = onChangeSaleUnits(newObj);
            setUpdatedCarryoverRowToState(newObj);
          }
          return newObj;
        });
        setCarryoverTableData(changedTableData);
        footers = generateCarryoverTotalFooter(changedTableData);
        setTotalFooter(footers);
        break;
      case "is_active":
        let activedtableData = tempData.map((eachRow) => {
          let newObj = { ...eachRow };
          if (eachRow.style_color_id === data.style_color_id) {
            newObj["is_active"] = newValue;
            setUpdatedCarryoverRowToState(newObj);
          }
          return newObj;
        });
        footers = generateCarryoverTotalFooter(activedtableData);
        setTotalFooter(footers);
        setCarryoverTableData(activedtableData);
        break;
      case "st_ty":
        let updatedSTData = tempData.map((eachRow) => {
          let newObj = { ...eachRow };
          if (eachRow.style_color_id === data.style_color_id) {
            if (newValue < 100) {
              newObj["st_ty"] = newValue;
              setUpdatedCarryoverRowToState(newObj);
            } else {
              props.addSnack({
                message: `ST can't be more than 100%`,
                options: {
                  variant: "error",
                },
              });
            }
          }

          return newObj;
        });
        footers = generateCarryoverTotalFooter(updatedSTData);
        setTotalFooter(footers);
        setCarryoverTableData(updatedSTData);
        break;
      case "is_locked":
        let lockedTableData = tempData.map((eachRow) => {
          let newObj = { ...eachRow };
          if (eachRow.style_color_id === data.style_color_id) {
            newObj["is_locked"] = newValue;
            setUpdatedCarryoverRowToState(newObj);
          }
          return newObj;
        });
        footers = generateCarryoverTotalFooter(lockedTableData);
        setTotalFooter(footers);
        setCarryoverTableData(lockedTableData);
        break;
      default:
        break;
    }
  };

  const setUpdatedCarryoverRowToState = (newObj) => {
    updatedCarryoverRow = updatedCarryoverRow.filter(
      (row) => row.style_color_id !== newObj.style_color_id
    );
    updatedCarryoverRow.push(newObj);
    setUpdatedCarryoverRow(updatedCarryoverRow);
  };

  const onL3PollingSucess = () => {
    props.addSnack({
      message: `Successfully optimized ${props.columnHeaderJson?.l3_name} details`,
      options: {
        variant: "success",
      },
    });
    props.set2_1_Loader(false);
    props.setShowLevel3(true);
    if (optimizationLevels.includes("l2_name")) {
      props.setShowLevel2(true);
    }
  };

  const onL3PollingFailure = (data) => {
    props.addSnack({
      message: data.message,
      options: {
        variant: "error",
      },
    });
    props.set2_1_Loader(false);
  };

  const fetchOptimizeL3Data = async () => {
    try {
      props.set2_1_Loader(true);
      props.setInitialLoadDepthChoice(true);
      props.setInitialLoadWedge(true);
      props.setInitialLoadFinalize(true);
      props.setFromDashboardScreen_2_2(false);
      props.setFromDashboardScreen_2_3(false);
      props.setFromDashboardScreen_2_4(false);
      let reoptimizeResponse = await updateCarryover();
      if (reoptimizeResponse) {
        const isSetLoader = true;
        fetchCarryOverTableData(selectedTab, isSetLoader);
        const planDetailsData = props.planDetails?.data;
        let optimisePayload = getOptimiseL3Payload(planDetailsData);
        if (planDetailsData.data_pull_source) {
          optimisePayload.data_pull_source = planDetailsData.data_pull_source;
        }
        if (planDetailsData.compare_season) {
          optimisePayload.compare_season = planDetailsData.compare_season;
        }
        let plan_sub_step = "optimization_table_l3_name";
        if (optimizationLevels.includes("carryover")) {
          plan_sub_step = optimizationLevels.slice(2)?.[0]
            ? `optimization_table_${optimizationLevels.slice(2)?.[0]}`
            : "optimization_table_l3_name";
        } else {
          plan_sub_step = optimizationLevels.slice(1)?.[0]
            ? `optimization_table_${optimizationLevels.slice(1)?.[0]}`
            : "optimization_table_l3_name";
        }
        optimisePayload.plan_sub_step = plan_sub_step;
        props.setShowLevel3(false);
        const optimizeResponse = await props.getCarryoverOptimizeL3Data(
          optimisePayload
        );
        if (optimizeResponse?.data?.data?.status) {
          const reqId = optimizeResponse?.data?.data?.task_id;
          //Poll to the server till we receive the response
          pollingService(
            `${BUDGET_POLL}${reqId}`,
            onL3PollingSucess,
            onL3PollingFailure
          );
          scrollIntoView("budget-level-three-table");
          props.addSnack({
            message: "Please wait for sometime till we process!",
            options: {
              variant: "success",
            },
          });
        } else {
          props.addSnack({
            message: `Optimising ${props.columnHeaderJson?.l3_name} details failed`,
            options: {
              variant: "error",
            },
          });
          //props.set2_1_Loader(false);
        }
      }
    } catch (error) {
      props.set2_1_Loader(false);
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
    }
  };

  const handlePercentageView = () => {
    scrollIntoView("percentage-table");
    setShowPercentageView(!showPercentageView);
    setPercentageToggle(true);
  };

  const isExternalFilterPresent = useCallback(() => {
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      if (node.data) {
        let l3Selected = l3Options.filter((item) => item.label === "Core");
        let selectedLevelThree = formData?.current?.l3_name
          ? formData?.current?.l3_name
          : l3Selected?.[0]?.value;
        let selectedChannel = formData?.current?.channel
          ? formData?.current?.channel
          : channelOptions?.[0]?.value;
        return (
          selectedLevelThree === node?.data?.l3_name &&
          selectedChannel === node?.data?.channel
        );
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData?.current, carryoverTableData]
  );

  useEffect(() => {
    if (CarryoverSelectionInstance?.current?.api) {
      formData.current.l3_name = selectedL3FilterValue?.label;
      CarryoverSelectionInstance.current.api?.onFilterChanged();
    }
    if (carryoverTableData?.length > 0) {
      let carryOverFooter = generateCarryoverTotalFooter(carryoverTableData);
      setTotalFooter(carryOverFooter);
      setFilteredFooter(
        props.getFilteredFooter(carryOverFooter, formData?.current)
      );
    }
  }, [carryoverTableData]);

  useEffect(() => {
    if (totalFooter?.length > 0) {
      formData.current.l3_name = selectedL3FilterValue?.label;
      setFilteredFooter(
        props.getFilteredFooter(totalFooter, formData?.current)
      );
    }
  }, [JSON.stringify(totalFooter)]);

  const loadTableInstance = (params) => {
    CarryoverSelectionInstance.current = params;
  };

  const loadStyleTableInstance = (params) => {
    CarryoverStyleInstance.current = params;
  };

  const loadCarryoverPercTableInstance = (params) => {
    CarryoverPercViewInstance.current = params;
  };

  const onRowSelected = (event) => {
    let tempData = event.data;
    tempData["is_active"] = event.node.selected;
    const updatedTableData = [];
    CarryoverSelectionInstance?.current?.api?.forEachNode((node) => {
      if (node.data.style_color_id !== "Total") {
        if (node.data.uniqueRowId === tempData.uniqueRowId) {
          node.data["is_active"] = event.node.selected;
        }
        updatedTableData.push(node.data);
      }
    });
    setCarryoverTableData(updatedTableData);
    setUpdatedCarryoverRowToState(tempData);
  };

  return (
    <div>
      <Box
        className={classes.marginBottom15}
        sx={{ width: "100%", typography: "body1" }}
      >
        <TabContext value={selectedTab}>
          <Box sx={{ borderColor: "divider" }}>
            <TabList
              onChange={handleChangeTab}
              aria-label="lab API tabs example"
            >
              <Tab label="Style Color" value="style_color" />
              <Tab label="Styles" value="style" />
            </TabList>
          </Box>
        </TabContext>
      </Box>
      {selectedTab === "style" ? (
        <div>
          <AgGridTable
            columns={styleIdColumnData}
            rowdata={styleIdRowData}
            loadTableInstance={loadStyleTableInstance}
            sideBar={false}
            uniqueRowId={"style_id"}
            sizeColumnsToFitFlag
          />
        </div>
      ) : (
        <>
          <div className={carryoverClasses.carryoverActionButtons}>
            {l3Options?.length > 1 &&
              filterView(
                props.columnHeaderJson?.l3_name,
                "l3_name",
                l3Options,
                handleL3ValueChange,
                selectedL3FilterValue,
                classes.formContainer,
                classes.inputLabel
              )}
            {isChannelMultiple(props.planDetails?.data) &&
              channelOptions?.length > 1 &&
              filterView(
                "Channel",
                "channel",
                channelOptions,
                handleChannelValueChange,
                selectedChannelFilterValue,
                classes.formContainer,
                classes.inputLabel
              )}
            <div className={`${classes.rightEnd} buttons`}>
              <Button
                variant="outlined"
                color="primary"
                title={"Percentage View"}
                id={"percentage_view"}
                onClick={handlePercentageView}
                className={classes.smallPrimaryButton}
              >
                {showPercentageView ? "Hide" : "Show"} Percentage Table
              </Button>
              <Button
                variant="outlined"
                color="primary"
                title={"Rules"}
                onClick={() => setShowRuleEnginePopup(true)}
                id={"rules"}
                className={classes.smallPrimaryButton}
              >
                Rules
              </Button>
              <Button
                variant="contained"
                color="primary"
                title={"Reoptimize"}
                onClick={() => onReoptimizeCarryoverSelction()}
                id={"reoptimize"}
                className={classes.smallPrimaryButton}
              >
                Reoptimize
              </Button>
              {/* <Button
                variant="outlined"
                color="primary"
                title={"Add Style Color"}
                id={"add-style-color"}
                className={classes.smallPrimaryButton}
              >
                Add Style Color
              </Button> */}
            </div>
          </div>
          <div className={carryoverClasses.container}>
            <div
              className={
                selectedColorID
                  ? globalClasses.halfWidth
                  : globalClasses.fullWidth
              }
            >
              {!props.isLoading && carryoverTableData?.length > 0 && (
                <AgGridTable
                  columns={columns}
                  rowdata={carryoverTableData}
                  loadTableInstance={loadTableInstance}
                  onBlur={updateCarryoverRowData}
                  onRowSelected={onRowSelected}
                  selectAllHeaderComponent={true}
                  uniqueRowId={"uniqueRowId"}
                  isExternalFilterPresent={isExternalFilterPresent}
                  doesExternalFilterPass={doesExternalFilterPass}
                  sideBar={false}
                  tableId={"style_color-table"}
                  customCellRenderer={(cellProps) =>
                    assortAgGridCustomCellRenderer(
                      cellProps,
                      "style_color-table"
                    )
                  }
                  pinnedBottomRowData={filteredFooter}
                  adjustTableHeight={true}
                />
              )}
            </div>
            {selectedColorID && (
              <div className={carryoverClasses.storeAdditionContainer}>
                <div className={carryoverClasses.closeIcon}>
                  <Typography variant="h3">{`Store Addition (Style ID: ${selectedColorID?.style_id})`}</Typography>
                  <IconButton
                    aria-label="close"
                    onClick={() => setSelectedColorID(null)}
                    size="large"
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
                <AgGridTable
                  columns={storeAdditionColumn}
                  rowdata={rowdata}
                  loadTableInstance={loadTableInstance}
                  sideBar={false}
                  adjustTableHeight={true}
                />
              </div>
            )}
          </div>
          {showPercentageView && (
            <div
              className={carryoverClasses.percentageTableContainer}
              id="percentage-table"
            >
              <div className={globalClasses.marginBottom}>
                <Switch
                  onChange={(e) => {
                    switchViewState(e);
                  }}
                  id="switch-percentage-view"
                  color="primary"
                  checked={percentageToggle}
                  leftLabel="Show Percentage View"
                />
              </div>
              <AgGridTable
                columns={perViewColumnData}
                rowdata={percentageViewTableData || []}
                loadTableInstance={loadCarryoverPercTableInstance}
                uniqueRowId="tag"
                sideBar={false}
                adjustTableHeight={true}
                sizeColumnsToFitFlag
              />
            </div>
          )}
          {showRuleEnginePopup && (
            <RuleEngineModal
              showRuleEnginePopup={showRuleEnginePopup}
              setShowRuleEnginePopup={setShowRuleEnginePopup}
              updateCarryover={updateCarryover}
              fetchCarryOverTableData={fetchCarryOverTableData}
              selectedTab={selectedTab}
              selectedL3FilterValue={selectedL3FilterValue}
            />
          )}
        </>
      )}
      <div className={classes.rightAlignButtonAssort}>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={() => fetchOptimizeL3Data()}
          //disabled={carryoverTableData?.length > 0 ? false : true}
          id="reoptimize-carryover-selection"
        >
          Optimize for {props?.columnHeaderJson?.l3_name}
        </Button>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    isLoading: planInitialServiceActions.loader_2_1_Selector(state),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      set2_1_Loader,
      optimizationCarryOverLogic,
      fetchPlanCarryoverData,
      updatePlanCarryoverData,
      getCarryoverOptimizeL3Data,
      fetchPlanCarryoverPercView,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(BudgetCarryoverSelectionComponent));
