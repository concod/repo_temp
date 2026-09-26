import React, { useState } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import DollarIcon from "@mui/icons-material/AttachMoney";
import InventoryIcon from "@mui/icons-material/Inventory";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { addSnack } from "core/actions/snackbarActions";
import { groupByCustom } from "core/Utils/formatter/index";
import ReceiptDrawerComponent from "./Receipt-Drawer/index";
import BopComponent from "./BOP/index";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import {
  getReceiptDrawerData,
  setReceiptDrawerLoader,
  setBOPLoader,
} from "../../../services-assortsmart/Plan/BOP-Receipt-Drawer/bop-receipt-drawer-service";
import {
  getBopTagData,
  getSeasonOptions,
} from "../../../services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { common } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  attributeFormatter,
  isWholesalePlan,
  isChannelMultiple,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { extractDropsArr } from "../../Plan-Dashboard/components/common-plan-functions";
import { configureFiltersResponse } from "../../../../clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import { updatePlanAPI } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import NonLinearEditDrawer from "./Non-Linear-Edit-Drawer";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { isEmpty } from "lodash";

const BOPReceiptDrawerRootComponent = (props) => {
  const [showReceiptDrawerAlert, setShowReceiptDrawerAlert] = useState(false);
  const [showBopAlert, setShowBopAlert] = useState(false);
  const [showNonLinearEditAlert, setShowNonLinearEditAlert] = useState(false);
  const [receiptDrawerColumns, setReceiptDrawerColumns] = useState([]);
  const [receiptDrawerData, setReceiptDrawerData] = useState([]);
  const [receiptDrawerViewData, setReceiptDrawerViewData] = useState([]);
  const [receiptDrawerViewColumns, setReceiptDrawerViewColumns] = useState([]);
  const [loadingNLE, setLoadingNLE] = useState(false);
  const [RTinstance, setRTinstance] = useState(null);
  const [nonLinearRTinstance, setNonLinearRTinstance] = useState(null);
  const [bopOptions, setBopOptions] = useState([]);
  const [selectedBop, setSelectedBop] = useState({});
  const [selectedChannel, setSelectedChannel] = useState({});
  const [channelOptions, setChannelOptions] = useState([]);
  const [formValue, setFormData] = useState({});
  const classes = useStyles();

  const history = useHistory();

  let defaultIconAttributes = {
    className: classes.receiptDrawerButton,
  };

  const displayMessage = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  const onToggleReceiptDrawer = (value) => {
    let selectedPlanDetails = props.planDetails?.data;
    setShowReceiptDrawerAlert(value);
    setRTinstance(null);
    if (value) {
      props.setReceiptDrawerLoader(true);
      const fetchData = async () => {
        try {
          let receiptDrawerResp = await props.getReceiptDrawerData(
            {
              plan_step: props.activeStep,
              plan_code: selectedPlanDetails.plan_code,
              store_type: selectedPlanDetails?.channel?.[0],
            },
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          let cols = await agGridColumnFormatter(
            receiptDrawerResp?.data?.data?.columns,
            props.levelsJson
          );
          cols.forEach((col) => {
            if (
              col.accessor ===
              (props.screenConfiguration?.common?.drop_key || "drop")
            ) {
              col.filter = "agTextColumnFilter";
            }
          });
          setReceiptDrawerColumns(cols);
          receiptDrawerResp?.data?.data?.data?.length &&
            receiptDrawerResp?.data?.data?.data.map((drawerData) => {
              drawerData[
                props.screenConfiguration?.common?.drop_key || "drop"
              ] = attributeFormatter(
                drawerData[
                  props.screenConfiguration?.common?.drop_key || "drop"
                ]
              );
              drawerData.uniqueId =
                drawerData.l1_name +
                drawerData.l2_name +
                drawerData.l3_name +
                drawerData.channel +
                drawerData.subChannel +
                drawerData[
                  props.screenConfiguration?.common?.drop_key || "drop"
                ] +
                +drawerData.tag;
              return drawerData;
            });
          setReceiptDrawerData(receiptDrawerResp?.data?.data?.data);
          if (receiptDrawerResp?.data?.data?.receipt_drawer_view) {
            let viewCols = await getColumnsAg(
              "table_name=receipt_drawer_view",
              props.columnHeaderJson
            )();
            setReceiptDrawerViewColumns(viewCols);
            let viewData = receiptDrawerResp?.data?.data?.receipt_drawer_view?.filter(
              (item) => {
                //To temporarily hide new and carryover rows in receipt drawer overall view
                return (
                  (item.tag !== "Total Carryover" &&
                    item.tag !== "Total New" &&
                    item.tag !== "Initial Target") ||
                  !props.screenConfiguration?.["2.1"]?.hide_carry_over
                );
              }
            );
            viewData = viewData?.map((item) => {
              item.uniqueId = item.tag;
              return item;
            });
            setReceiptDrawerViewData(viewData);
          }
          props.setReceiptDrawerLoader(false);
        } catch (err) {
          props.setReceiptDrawerLoader(false);
          props.addSnack({
            message: "Fetching Receipt drawer details failed",
            options: {
              variant: "error",
            },
          });
        }
      };

      fetchData();
    }
  };

  const configureBopOptions = (bopResponse) => {
    let selectedBOP = {},
      options = [];
    bopResponse?.data?.data?.data.forEach(async (item) => {
      let bopPlan = props.currentBopPlan
        ? props.currentBopPlan
        : props.planDetails?.data?.bop_tag_plan_code;
      if (
        item.plan_code === bopPlan ||
        bopResponse?.data?.data?.data?.length === 1
      ) {
        selectedBOP = {
          label: item.name,
          value: item.plan_code,
          id: item.plan_code,
        };
        setSelectedBop(selectedBOP);
        if (
          bopResponse?.data?.data?.data?.length === 1 &&
          selectedBOP?.value !== bopPlan
        ) {
          const reqBody = {
            ...props.planDetails.data,
            [[
              props.screenConfiguration?.common?.drop_key || "drops",
            ]]: extractDropsArr(
              props.planDetails["data"],
              props.screenConfiguration?.common?.drop_key,
              "edit"
            ),
            [props.screenConfiguration?.common?.flow_key ||
            "flow"]: extractDropsArr(
              props.planDetails["data"],
              props.screenConfiguration?.common?.drop_key,
              "edit"
            ),
            filters: configureFiltersResponse(
              props.planLevels?.data?.level_info,
              props.planDetails["data"]
            ),
          };

          //Add BOP plan code if BOP icon is selected
          reqBody["bop_tag_plan_code"] = selectedBOP?.value;

          let updateResponse = await props.updatePlanAPI(
            reqBody,
            props.planDetails.data.plan_code,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          if (updateResponse?.data?.status) {
            props.setCurrentBopPlan(selectedBOP?.value);
            //callBopLevel(bopOrBenchmarkPlan);
          } else {
            props.setBOPLoader(false);
            displayMessage("Updateing Prev. Season Plan failed", "error");
          }
        }
      }
      options.push({
        label: item.name,
        value: item.plan_code,
        id: item.plan_code,
      });
    });
    if (isEmpty(selectedBOP)) {
      selectedBOP = options[0];
      setSelectedBop(selectedBOP);
    }
    setBopOptions(options);
  };

  const onToggleBop = (title, value) => {
    let selectedPlanData = props.planDetails?.data;
    setShowBopAlert(value);
    if (value) {
      props.setBOPLoader(true);
      const fetchData = async () => {
        if (title.includes("BOP")) {
          let seasonResponse = await props.getSeasonOptions({
            filters: [
              {
                attribute_name: "name",
                value: [selectedPlanData?.season],
                operator: "=",
              },
            ],
          });
          if (
            seasonResponse?.data?.status &&
            seasonResponse?.data?.data?.length
          ) {
            let prevSesasonResponse = await props.getSeasonOptions({
              filters: [
                {
                  attribute_name: "incremental_id",
                  value: [
                    seasonResponse?.data?.data?.[0]?.attribute_value
                      .incremental_id - 1,
                  ],
                  prefix: "attribute_value",
                  operator: "=",
                },
              ],
            });
            if (prevSesasonResponse?.data?.status) {
              let bopResponse = await props.getBopTagData({
                filters: [
                  {
                    attribute_name: "steps",
                    value: common.__Finalize_Steps,
                    operator: "in",
                  },
                  {
                    attribute_name: "season",
                    value: [prevSesasonResponse?.data?.data?.[0]?.name],
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
              });
              if (bopResponse?.data?.status) {
                configureBopOptions(bopResponse);
              }
            }
          }
        }
        props.setBOPLoader(false);
      };

      fetchData();
    }
  };

  const onToggleNonLinearEdit = (value) => {
    setShowNonLinearEditAlert(value);
    if (value) {
      const fetchData = async () => {
        setLoadingNLE(true);

        if (props.planDetails?.data?.channel?.length > 1) {
          let channelOptions = props.planDetails?.data?.channel.map((data) => {
            return {
              label: data,
              value: data,
              id: data,
            };
          });
          setSelectedChannel(channelOptions[0]);
          setChannelOptions(channelOptions);
        }
      };
      fetchData();
    }
  };

  const getTotalFooterRow = (tableData, props, totalRowData) => {
    //To group data based on drop and sub_channel
    const groupBy_properties = [
      props.screenConfiguration?.common?.drop_key || "drop",
    ];
    if (isWholesalePlan(props?.planDetails?.data)) {
      groupBy_properties.push("sub_channel");
    }
    if (!isChannelMultiple(props?.planDetails?.data)) {
      groupBy_properties.push("channel");
    }
    if (props.planDetails?.data?.l2_name?.length > 1) {
      groupBy_properties.push("l2_name");
    }
    if (props.planDetails?.data?.l1_name?.length > 1) {
      groupBy_properties.push("l1_name");
    }
    const groupedDataArray = groupByCustom({
      Group: tableData,
      By: groupBy_properties,
    });
    groupedDataArray?.length &&
      groupedDataArray.forEach((groupedData) => {
        let total_penetration_ly = 0,
          total_penetration_ty = 0,
          total_receipts_quantity_ly = 0,
          total_receipts_quantity_ty = 0,
          total_budget_ly = 0,
          total_budget_ty = 0,
          total_aur_ly = 0,
          total_aur_ty = 0;
        // Addition
        groupedData.forEach((data) => {
          let optimizationLevel =
            props.screenConfiguration?.["2.1"]?.budget_optimization_level;
          if (
            !optimizationLevel.includes("carryover") ||
            (optimizationLevel.includes("carryover") &&
              data.carryover_flag === "Total")
          ) {
            total_penetration_ly = total_penetration_ly + data.penetration_ly;
            total_penetration_ty =
              total_penetration_ty + parseFloat(data.penetration_ty);
            total_receipts_quantity_ly =
              total_receipts_quantity_ly + data.receipts_quantity_ly;
            total_receipts_quantity_ty =
              total_receipts_quantity_ty + parseInt(data.receipts_quantity_ty);
            total_budget_ly = total_budget_ly + data.budget_ly;
            total_budget_ty = total_budget_ty + data.budget_ty;
            total_aur_ly = total_aur_ly + data.aur_ly;
            total_aur_ty = total_aur_ty + parseInt(data.aur_ty);
          }
        });
        // Push the calculated total as a new row to the main table data
        tableData.push({
          penetration_ly: total_penetration_ly,
          penetration_ty: Math.round(total_penetration_ty),
          receipts_quantity_ly: total_receipts_quantity_ly,
          receipts_quantity_ty: total_receipts_quantity_ty,
          original_receipts_quantity_ty: total_receipts_quantity_ty,
          budget_ly: total_budget_ly,
          budget_ty: total_budget_ty,
          aur_ly: total_budget_ly / total_receipts_quantity_ly,
          aur_ty: total_budget_ty / total_receipts_quantity_ty,
          l3_name: "Total",
          l2_name: groupedData[0]?.l2_name,
          l1_name: groupedData[0]?.l1_name,
          [props.screenConfiguration?.common?.drop_key ||
          "drop"]: groupedData?.[0]?.[
            props.screenConfiguration?.common?.drop_key || "drop"
          ],
          sub_channel: groupedData?.[0]?.sub_channel,
          channel: groupedData?.[0]?.channel,
          hierarchy: [
            groupedData[0]?.l1_name + groupedData[0]?.l2_name + "Total",
          ],
          uniqueId:
            "Total" +
            groupedData[0]?.l1_name +
            groupedData[0]?.l2_name +
            groupedData[0]?.l3_name +
            groupedData?.[0]?.channel +
            groupedData?.[0]?.sub_channel +
            groupedData?.[0]?.[
              props.screenConfiguration?.common?.drop_key || "drop"
            ] +
            groupedData?.[0]?.carryover_flag,
          totalRowData: totalRowData?.[0],
        });
      });
  };

  let BOPReceiptDrawerLayout = [
    props.activeStep > 0
      ? {
          ...defaultIconAttributes,
          ...{
            title: "Receipt drawer",
            openIconClassName:
              classes.receiptDrawerButtonEnabled +
              " " +
              classes.receiptDrawerButton,
            closedIconClassName: classes.receiptDrawerButtonDisabled,
            showIcon: props.showReceiptDrawerIcon,
            onOpenPopup: (title) => {
              setReceiptDrawerViewData([]);
              onToggleReceiptDrawer(title, true);
            },
            visibility: "visible",
          },
        }
      : {
          visibility: "hidden",
        },

    props.activeStep > 2.2
      ? {
          ...defaultIconAttributes,
          ...{
            title: "Non linear edit",
            openIconClassName:
              classes.receiptDrawerButtonEnabled +
              " " +
              classes.receiptDrawerButton +
              " " +
              classes.nonLinearButton,
            closedIconClassName: classes.receiptDrawerButtonDisabled,
            showIcon:
              !history?.location.pathname.includes("view") &&
              props.showNonLinearEditIcon,
            onOpenPopup: (title) => onToggleNonLinearEdit(title, true),
            visibility: "visible",
          },
        }
      : {
          visibility: "hidden",
        },

    props.showBopIcon
      ? {
          title: "BOP details",
          openIconClassName:
            classes.receiptDrawerButtonEnabled +
            " " +
            classes.receiptDrawerButton +
            " " +
            classes.bopButton,
          closedIconClassName: classes.receiptDrawerButtonDisabled,
          showIcon:
            !history?.location.pathname.includes("view") && props.showBopIcon,
          onOpenPopup: (title) => onToggleBop(title, true),
          visibility: "visible",
        }
      : {},
  ];

  return (
    <div>
      {BOPReceiptDrawerLayout.map((item, index) => (
        <nav id={item.id} title={item.title}>
          <span
            className={
              item.showIcon ? item.openIconClassName : item.closedIconClassName
            }
            onClick={() => (item.showIcon ? item.onOpenPopup(item.title) : {})}
          >
            {item.showIcon ? (
              index === 2 ? (
                <InventoryIcon />
              ) : index === 1 ? (
                <AutorenewIcon />
              ) : index === 3 ? (
                <CompareArrowsIcon />
              ) : (
                <DollarIcon />
              )
            ) : (
              <div />
            )}
          </span>
        </nav>
      ))}
      {showReceiptDrawerAlert && (
        <ReceiptDrawerComponent
          receiptDrawerData={receiptDrawerData}
          activeStep={props.activeStep}
          setShowAlert={setShowReceiptDrawerAlert}
          onToggleReceiptDrawer={onToggleReceiptDrawer}
          receiptDrawerColumns={receiptDrawerColumns}
          RTinstance={RTinstance}
          setRTinstance={setRTinstance}
          setReceiptDrawerData={setReceiptDrawerData}
          receiptDrawerViewColumns={receiptDrawerViewColumns}
          receiptDrawerViewData={receiptDrawerViewData}
          formValue={formValue}
          setFormData={setFormData}
        ></ReceiptDrawerComponent>
      )}
      {showBopAlert && (
        <BopComponent
          setShowAlert={setShowBopAlert}
          onToggleBop={onToggleBop}
          bopOptions={bopOptions}
          selectedBop={selectedBop}
          setSelectedBop={setSelectedBop}
          setCurrentBopPlan={props.setCurrentBopPlan}
          currentBopPlan={props.currentBopPlan}
        ></BopComponent>
      )}
      {showNonLinearEditAlert && (
        <NonLinearEditDrawer
          onToggleNonLinearEdit={onToggleNonLinearEdit}
          setRTinstance={setNonLinearRTinstance}
          RTinstance={nonLinearRTinstance}
          loading={loadingNLE}
          setLoading={setLoadingNLE}
          isWedgeOpen={props.isWedgeOpen}
          activeStep={props.activeStep}
          getTotalFooterRow={getTotalFooterRow}
          selectedChannel={selectedChannel}
          channelOptions={channelOptions}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    loaderReceiptDrawer:
      store.assortsmartReducer.bopReceiptDrawerReducer.loaderReceiptDrawer,
    columnHeaderJson:
      store.assortsmartReducer.planDashboardReducer.columnHeaderJson,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setReceiptDrawerLoader: (payload) =>
    dispatch(setReceiptDrawerLoader(payload)),
  getReceiptDrawerData: (payload, endpoint) =>
    dispatch(getReceiptDrawerData(payload, endpoint)),
  setBOPLoader: (payload) => dispatch(setBOPLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getBopTagData: (payload) => dispatch(getBopTagData(payload)),
  getSeasonOptions: (payload) => dispatch(getSeasonOptions(payload)),
  updatePlanAPI: (payload, planCode, endpoint) =>
    dispatch(updatePlanAPI(payload, planCode, endpoint)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(BOPReceiptDrawerRootComponent));
