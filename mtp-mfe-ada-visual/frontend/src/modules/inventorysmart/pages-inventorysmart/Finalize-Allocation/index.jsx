import React, { useEffect, useState } from "react";
import {
  CREATE_ALLOCATION,
  VIEW_PAST_ALLOCATION,
} from "../../constants-inventorysmart/routesConstants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Button, Grid, Tab, Tabs } from "@mui/material";
import ProductView from "./components/ProductView";
import StoreView from "./components/StoreView";
import StoreCapacity from "./components/StoreCapacity";
import Loader from "core/Utils/Loader/loader";
import { useHistory } from "react-router-dom";
import { connect } from "react-redux";
import {
  setArticleAgGridParams,
  setBackButtonClicked,
  setDraftsResult,
  setFilteredSelection,
  setInventorysmartCreateAllocationFilterDependency,
  setIsFiltersValid,
  setIsValidDraft,
  setPOCode,
  setPopUpLinkFromDashbaord,
  setSelectedFilters,
  setShowInvalidDraftModal,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import {
  getDrafts,
  getStatus,
  changePlanStatus,
  resetStoreView,
  setAllocationCode,
  setArticle,
  setMoveToTiageLoader,
  setPlanStatus,
  setPlanType,
  setDownloadPlan,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { resetProductView } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { addSnack } from "core/actions/snackbarActions";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  PLAN_STATUS_TO_HIDE_BACK_BUTTON,
  PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON,
  PLAN_TYPE_TO_HIDE_BACK_BUTTON,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { generateExteralComponent } from "modules/inventorysmart/client-specific-features-inventorysmart/client-specific-inventorysmart-mapping";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  setSelectedFilters as setSelectedFiltersViewPastAllocation,
  setInventorysmartPastAllocationFilterDependency,
  setBackButtonClicked as setBackButtonClickedViewPastAllocation,
  setFormData,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import {
  shouldDisplayDownloadButton,
  shouldDisplayFinalizeButtons,
} from "../Create-Allocation/helperFunctions";
import { cloneDeep, isEmpty } from "lodash";
import { isActionAllowedOnSubModule } from "../inventorysmart-utility";
import DownloadPlans from "./components/DownloadPlans";
import moment from "moment";
import jsonxml from "jsontoxml";
import { utils, write } from "xlsx";
import { saveFile } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { setStoreCapacityPlanType } from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";

function sortPOItemByItemPos(a, b) {
  if (Number(a.item_pos) < Number(b.item_pos)) {
    return -1;
  }
  if (Number(a.item_pos) > Number(b.item_pos)) {
    return 1;
  }
  return 0;
}

export const generateXMLDataForDownload = (p_planXmlData) => {
  let l_planXmlData = cloneDeep(p_planXmlData);
  let PO = [];
  let POQtys = [];
  let POItems = [];
  l_planXmlData.po.forEach((po) => {
    let PoObj = {
      attrs: {
        empl_name: po.empl_name,
        po_no: po.po_no,
        sbs_no: po.sbs_no,
        store_no: po.store_no,
        // store_name: po.store_name,
        dc_code: po.dc_code,
        po_type: po.po_type,
        status: po.status,
        active: po.active,
        shipto_store_no: po.shipto_store_no,
        billto_store_no: po.billto_store_no,
        vend_code: po.vend_code,
        created_date: moment(po.created_date).format("YYYY-MM-DDThh:mm:ss"),
        modified_date: moment(po.modified_date).format("YYYY-MM-DDThh:mm:ss"),
        shipping_date: moment(po.shipping_date).format("YYYY-MM-DDThh:mm:ss"),
        cancel_date: moment(po.cancel_date).format("YYYY-MM-DDThh:mm:ss"),
        sent_date: moment(po.sent_date).format("YYYY-MM-DDThh:mm:ss"),
        delivery_date: moment(po.delivery_dt).format("YYYY-MM-DDThh:mm:ss"),
        season_code: po.season_code,
      },
    };
    POItems = [];
    po.po_item.sort(sortPOItemByItemPos);
    po.po_item.forEach((poItem) => {
      POQtys = [];
      poItem.po_qty.forEach((qty) => {
        POQtys.push({
          name: "PO_QTY",
          attrs: {
            store_no: qty.store_no,
            ord_qty: qty.ord_qty,
          },
        });
      });
      POItems.push({
        name: "PO_ITEM",
        attrs: {
          item_pos: poItem.item_pos,
          item_sid: poItem.item_sid,
          price: poItem.price,
          cost: poItem.cost,
        },
        children: [{ name: "PO_QTYS", children: [...POQtys] }],
      });
    });

    PoObj.name = "PO";
    PoObj.children = [{ name: "PO_ITEMS" }];
    PoObj.children[0].children = [...POItems];
    PO.push(PoObj);
  });

  const poResponse = {
    DOCUMENT: [
      {
        name: "POS",
        children: [...PO],
      },
    ],
  };

  let InvItems = [];

  l_planXmlData.invn.forEach((inv) => {
    let invObj = {
      name: "INVN",
      attrs: {
        item_sid: inv.item_sid,
        upc: inv.upc,
      },
    };

    inv.invn_sb.forEach((invSb) => {
      let invSBS = [];

      let SBQtys = [];
      invSb.invn_sbs_qty.forEach((qty) => {
        SBQtys.push({
          attrs: {
            store_no: qty.store_no,
            min_qty: qty.min_qty,
            max_qty: qty.max_qty,
          },
          name: "INVN_SBS_QTY",
        });
      });
      invSBS.push({
        name: "INVN_SBS",
        attrs: {
          sbs_no: invSb.sbs_no,
          modified_date: invSb.modified_date,
        },
        children: [{ name: "INVN_SBS_QTYS", children: [...SBQtys] }],
      });

      InvItems.push({
        name: "INVENTORY",
        children: [invObj, ...invSBS],
      });
    });
  });
  const invResponse = {
    DOCUMENT: [
      {
        name: "INVENTORYS",
        children: [...InvItems],
      },
    ],
  };
  return {
    po: jsonxml(poResponse),
    invn: jsonxml(invResponse),
  };
};

const FinalizeAllocation = (props) => {
  const history = useHistory();
  const classes = useStyles();
  const globalClasses = globalStyles();

  const type = new URLSearchParams(window.location.search).get("type");

  const [tabValue, setTabValue] = useState(0);
  const [disabledForViewOnlyAccess, setDisabledForViewOnlyAccess] = useState(
    false
  );
  const [downloadConfig, setDownloadConfig] = useState([]);
  const allocationCode = new URLSearchParams(window.location.search).get(
    "allocation_code"
  );

  // When we navigate from New Store Screen we have a query param named flow
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const tabProps = (index) => {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  };

  const handleBackButtonClick = async () => {
    if (props.planStatus === "Finalized") {
      props.setSelectedFiltersViewPastAllocation(props.selectedFilters);
      props.setInventorysmartPastAllocationFilterDependency(
        props.inventorySmartFinalizeFilterDependency
      );
      props.setBackButtonClickedViewPastAllocation(true);
      props.setFormData(props.formFilters);
      setTimeout(() => {
        history?.push(VIEW_PAST_ALLOCATION);
      }, 1000);
    } else {
      try {
        props.setMoveToTiageLoader(true);
        let l_draftResponse = await props.getDrafts(allocationCode);
        if (l_draftResponse.data.status) {
          let l_responseData = l_draftResponse?.data?.data;
          props.setDraftsResult(l_responseData);
          props.setInventorysmartCreateAllocationFilterDependency(
            l_responseData.filter_dependency
          );
          props.setArticleAgGridParams({
            setAll: l_responseData.set_all,
            selection: l_responseData.selection,
            prevAction: l_responseData.prev_action,
            displayedAndHiddenCheckedRows:
              l_responseData.displayedAndHiddenCheckedRows,
          });
          props.setSelectedFilters(l_responseData.filters);
          props.setIsValidDraft(l_responseData.is_draft);
          props.setIsFiltersValid(false);
          props.setBackButtonClicked(true);
          props.setShowInvalidDraftModal(l_responseData.is_draft);
          if (l_responseData?.poCode) {
            props.setPOCode(l_responseData?.poCode || null);
          }
          if (l_responseData?.filteredSelection) {
            props.setFilteredSelection(l_responseData?.filteredSelection || []);
          }
          if (l_responseData?.popUpLinkFromDashbaord) {
            props.setPopUpLinkFromDashbaord(
              l_responseData?.popUpLinkFromDashbaord || null
            );
          }
          setTimeout(() => {
            history?.push(
              `${CREATE_ALLOCATION}?step=0&type=backButton&allocation_code=${new URLSearchParams(
                window.location.search
              ).get("allocation_code")}`
            );
          }, 1000);
        }
      } catch {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        props.setMoveToTiageLoader(false);
      }
    }
  };

  const onClickHandler = (p_downLoadType) => {
    switch (p_downLoadType) {
      case "xlsx":
        let l_planExcelData = cloneDeep(props.downloadPlan);
        let data = [];
        l_planExcelData.po.forEach((po) => {
          let po_obj = {
            Empl_Name: po.empl_name,
            "PO NO": po.po_no,
            "SBS NO": po.sbs_no,
            "Store No": po.store_no,
            "Store Name": po.store_name,
            "DC Name": po.dc_name,
            "PO Type": po.po_type,
            "Ship to Store NO": po.shipto_store_no,
            "Bill to Store NO": po.billto_store_no,
            "Vend Code": po.vend_code,
            "Created Date": moment(po.created_date).format(
              "YYYY-MM-DDThh:mm:ss"
            ),
            "Modified Date": moment(po.modified_date).format(
              "YYYY-MM-DDThh:mm:ss"
            ),
            "Shipping Date": moment(po.shipping_date).format(
              "YYYY-MM-DDThh:mm:ss"
            ),
            "Cancel Date": moment(po.cancel_date).format("YYYY-MM-DDThh:mm:ss"),
            "Sent Date": moment(po.sent_date).format("YYYY-MM-DDThh:mm:ss"),
            "Season Code": po.season_code,
          };
          po.po_item.forEach((po) => {
            let final_obj = {
              ...po_obj,
              "Item sid": po.item_sid,
              "Item POS": po.item_pos,
              Department: po.department,
              Gender: po.gender,
              "Sub-Category": po.subcat,
              DCS: po.dcs,
              Article: po.article,
              Style: po.style_name,
              "Color Desc": po.color_desc,
              Actual_ROS: po.actual_ros,
              Target_WOS: po.target_wos,
              "On Hand": po.oh,
              "On Order": po.oo,
              "In Transit": po.it,
              Min_Constraint: po.min_constraint,
              Size: po.size,
              Price: po.price,
              Cost: po.cost,
              "Order Quantity": po.po_qty[0]?.ord_qty,
            };
            data.push(final_obj);
          });
        });
        const worksheet = utils.json_to_sheet(data);
        const workbook = {
          Sheets: {
            "Allocation Plan": worksheet,
          },
          SheetNames: ["Allocation Plan"],
        };
        const excelBuffer = write(workbook, {
          bookType: "xlsx",
          type: "array",
        });
        saveFile(excelBuffer, `${allocationCode}.xlsx`);
        break;
      case "xml":
        let l_planXmlData = cloneDeep(props.downloadPlan);
        let { po, invn } = generateXMLDataForDownload(l_planXmlData);
        saveFile(po, `${allocationCode}.xml`);
        saveFile(invn, `inventory_${allocationCode}.xml`);
        break;
      default:
        break;
    }
  };

  const shouldDisplayBackButton = (
    p_planStatus,
    p_planType,
    p_flowType,
    p_isFinalized
  ) => {
    if (p_flowType) {
      return true;
    }
    if (p_isFinalized) {
      return true;
    }
    if (p_planStatus === "Finalized") {
      if (
        // hide the button for auto allocation flow if its for signet
        PLAN_TYPE_TO_HIDE_BACK_BUTTON.includes(p_planType) &&
        props.inventorysmartScreenConfig.roleBasedAccess &&
        props?.redirectedFrom !== "viewPastAllocation"
      ) {
        return true;
      } else if ( props?.redirectedFrom !== "viewPastAllocation") {
        // This is for a case when user comes to a finalized allocation from notifications or using allocation code.
        // Hide the back button in this case.
        return true;
      }
      return false;
    } else {
      return (
        PLAN_STATUS_TO_HIDE_BACK_BUTTON.includes(p_planStatus) ||
        PLAN_TYPE_TO_HIDE_BACK_BUTTON.includes(p_planType)
        // || (type && type === "edit")
      );
    }
  };

  useEffect(() => {
    if (!isEmpty(props.inventorysmartModulesPermission)) {
      let l_roleWithCreateAccess = isActionAllowedOnSubModule(
        props.inventorysmartModulesPermission,
        "inventorysmart_create_allocation",
        INVENTORY_SUBMODULES_NAMES.INVENTORY_FINALIZE_PRODUCT_STORE_TABLE,
        "create"
      );
      setDisabledForViewOnlyAccess(!l_roleWithCreateAccess);
    }
  }, [props.inventorysmartModulesPermission]);

  useEffect(() => {
    if (!isEmpty(props?.inventorysmartScreenConfig)) {
      setDownloadConfig(
        props?.inventorysmartScreenConfig?.finalize?.downloadPlan
      );
    }
  }, [props?.inventorysmartScreenConfig]);

  const fethFinalizeScreenData = async (p_allocationCode) => {
    try {
      let l_status = await props.getStatus(p_allocationCode);
      if (l_status.data.status) {
        if (
          l_status.data.data.plan_status === "Finalized"
          // &&
          // !isEmpty(downloadConfig)
        ) {
          await fetchPlanDataForDownload();
        }
        props.setPlanStatus(l_status.data.data.plan_status);
        props.setPlanType(l_status?.data?.data?.plan_type);
        props.setStoreCapacityPlanType(l_status?.data?.data?.plan_type);
      }
    } catch {
      props.setPlanStatus(null);
      props.setPlanType(null);
      props.setStoreCapacityPlanType(null);
    }
  };
  useEffect(() => {
    const unlisten = history.listen((location, action) => {
      if (action === "PUSH") {
        let l_allocationCode = new URLSearchParams(window.location.search).get(
          "allocation_code"
        );
        if (l_allocationCode) {
          props.resetProductView([]);
          props.resetStoreView([]);
          props.setAllocationCode(l_allocationCode);
          fethFinalizeScreenData(l_allocationCode);
        }
      }
    });

    return () => {
      unlisten(); // Clean up the listener when the component unmounts
    };
  }, [history]);

  useEffect(() => {
    let l_allocationCode = new URLSearchParams(window.location.search).get(
      "allocation_code"
    );
    props.setAllocationCode(l_allocationCode);
    let l_articles = new URLSearchParams(window.location.search).getAll(
      "article"
    );
    if (l_articles.length > 0) {
      props.setArticle(l_articles);
    }
    fethFinalizeScreenData(l_allocationCode);
  }, []);

  const fetchPlanDataForDownload = async () => {
    try {
      props.setMoveToTiageLoader(true);
      let l_triageResponse = await props.changePlanStatus({
        allocation_code: allocationCode,
        edited_allocation_code: null,
        status: 3,
      });
      if (
        l_triageResponse.data.status &&
        !l_triageResponse.data?.data?.display_error
      ) {
        props.setDownloadPlan(l_triageResponse.data.data.output);
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setMoveToTiageLoader(false);
    }
  };

  useEffect(() => {
    // reset store and product views state on unmount
    return () => {
      props.resetProductView([]);
      props.resetStoreView([]);
    };
  }, []);

  return (
    <>
      <Loader loader={props.moveToTiageLoader}>
        <div className={globalClasses.tableWrapper}>
          {props.planStatus && (
            <>
              <div className={classes.tabHeaderDesign}>
                <Tabs
                  value={tabValue}
                  onChange={handleChangeTabValue}
                  aria-label="finalize-allocation-tabs"
                  classes={{
                    flexContainer: globalClasses.marginTop,
                  }}
                >
                  <Tab
                    label={`${dynamicLabelsBasedOnTenant("article")} View`}
                    {...tabProps(0)}
                  />
                  <Tab label="Store View" {...tabProps(1)} />
                  {props?.redirectedFrom !== "viewPastAllocation" &&
                    (!props?.inventorysmartScreenConfig?.finalize?.drillDown ||
                      props?.inventorysmartScreenConfig?.finalize?.drillDown?.hidden?.indexOf(
                        "storeCapacityBreach"
                      ) < 0) && <Tab label="Store Capacity" {...tabProps(2)} />}
                </Tabs>
              </div>
              <CustomAccordion label="Details table" defaultExpanded={true}>
                <div>
                  {tabValue === 0 ? (
                    <ProductView />
                  ) : tabValue === 1 ? (
                    <StoreView />
                  ) : (
                    <StoreCapacity />
                  )}
                </div>
              </CustomAccordion>
            </>
          )}

          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
            className={globalClasses.marginAround}
          >
            {!shouldDisplayBackButton(
              props.planStatus,
              props.planType,
              flowType,
              props.finalized
            ) && (
              <React.Fragment>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  id="finalizeBtn"
                  onClick={handleBackButtonClick}
                  disabled={disabledForViewOnlyAccess || props.finalized}
                >
                  Back
                </Button>
              </React.Fragment>
            )}
            {!shouldDisplayFinalizeButtons(
              props.planStatus,
              props.planType,
              flowType
            ) && (
              <React.Fragment>
                {generateExteralComponent("saveButton", {
                  classes,
                  history,
                  disabledForViewOnlyAccess,
                })}
              </React.Fragment>
            )}
            {!shouldDisplayFinalizeButtons(
              props.planStatus,
              props.planType,
              flowType
            ) && (
              <React.Fragment>
                {generateExteralComponent(
                  props?.inventorysmartScreenConfig?.finalize?.subComponent ===
                    "triageButton"
                    ? PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON.includes(
                        props.planStatus
                      )
                      ? null
                      : "triageButton"
                    : props.planType === "Auto Allocation" &&
                      props?.inventorysmartScreenConfig?.finalize
                        ?.saveButtonForAutoAllocation
                    ? null
                    : props.planStatus === "Finalized"
                    ? null
                    : "finalizeButton",
                  {
                    classes,
                    history,
                    disabledForViewOnlyAccess,
                  }
                )}
              </React.Fragment>
            )}
            {shouldDisplayDownloadButton(
              downloadConfig,
              props.downloadPlan
            ) && (
              <DownloadPlans
                downloadConfig={downloadConfig}
                onClickHandler={(type) => onClickHandler(type)}
              />
            )}
          </Grid>
        </div>
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    finalized:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .finalized,
    moveToTiageLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .moveToTiageLoader,
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    invalidAllocation:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .invalidAllocation,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorySmartFinalizeFilterDependency:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .inventorySmartFinalizeFilterDependency,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .selectedFilters,
    formFilters:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .formFilters,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    redirectedFrom:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .redirectedFrom,
    downloadPlan:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .downloadPlan,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setBackButtonClicked: (payload) => dispatch(setBackButtonClicked(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsValidDraft: (payload) => dispatch(setIsValidDraft(payload)),
  setInventorysmartCreateAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartCreateAllocationFilterDependency(payload)),
  setArticleAgGridParams: (payload) =>
    dispatch(setArticleAgGridParams(payload)),
  getDrafts: (payload) => dispatch(getDrafts(payload)),
  getStatus: (payload) => dispatch(getStatus(payload)),
  setPlanStatus: (payload) => dispatch(setPlanStatus(payload)),
  setPlanType: (payload) => dispatch(setPlanType(payload)),
  setStoreCapacityPlanType: (payload) =>
    dispatch(setStoreCapacityPlanType(payload)),
  setShowInvalidDraftModal: (payload) =>
    dispatch(setShowInvalidDraftModal(payload)),
  changePlanStatus: (payload) => dispatch(changePlanStatus(payload)),
  setMoveToTiageLoader: (payload) => dispatch(setMoveToTiageLoader(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setDraftsResult: (payload) => dispatch(setDraftsResult(payload)),
  resetProductView: (payload) => dispatch(resetProductView(payload)),
  resetStoreView: (payload) => dispatch(resetStoreView(payload)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  setArticle: (payload) => dispatch(setArticle(payload)),
  setSelectedFiltersViewPastAllocation: (payload) =>
    dispatch(setSelectedFiltersViewPastAllocation(payload)),
  setInventorysmartPastAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterDependency(payload)),
  setBackButtonClickedViewPastAllocation: (payload) =>
    dispatch(setBackButtonClickedViewPastAllocation(payload)),
  setFormData: (payload) => dispatch(setFormData(payload)),
  setDownloadPlan: (payload) => dispatch(setDownloadPlan(payload)),
  setPOCode: (payload) => dispatch(setPOCode(payload)),
  setFilteredSelection: (payload) => dispatch(setFilteredSelection(payload)),
  setPopUpLinkFromDashbaord: (payload) =>
    dispatch(setPopUpLinkFromDashbaord(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FinalizeAllocation);
