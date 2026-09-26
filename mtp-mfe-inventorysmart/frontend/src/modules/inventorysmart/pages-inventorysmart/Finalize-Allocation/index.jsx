import React, { useEffect, useState, createContext } from "react";
import {
  CREATE_ALLOCATION,
  VIEW_PAST_ALLOCATION,
  ORDER_BATCHING_PATH,
} from "../../constants-inventorysmart/routesConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Button, Tabs, ButtonGroup, useTranslation } from "impact-ui-v3";
import ProductView from "./components/ProductView";
import StoreView from "./components/StoreView";
import RecommendationProductView from "./Finalize-Allocation-New-Flow/product-view/ProductView";
import RecommendationStoreView from "./Finalize-Allocation-New-Flow/store-view/StoreView";
import StoreCapacity from "./components/StoreLevelCapacity";
import StoreCapacityNewTable from "./components/StoreCapacityNewFlow/StoreCapacityNewTable";
import StoreCapacityBreach from "./components/StoreCapacity";
import Loader from "core/Utils/Loader/loader";
import {
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import {
  setArticleAgGridParams,
  setBackButtonClicked,
  setCreateAllocationArticles,
  setDraftsResult,
  setFilteredSelection,
  setInventorysmartCreateAllocationFilterDependency,
  setIsFiltersValid,
  setIsValidDraft,
  setPOCode,
  setPopUpLinkFromDashbaord,
  setSelectedFilters,
  setShowInvalidDraftModal,
  setCacheKey,
  setAllocTypeStatus,
  setAsnCode,
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
  downloadFinalizeSummary,
  setOriginalAllocationCode,
  setFinalized,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import {
  resetProductView,
  callUpdateToggleAPI,
  hleResetToOriginal,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  PLAN_STATUS_TO_HIDE_BACK_BUTTON,
  PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON,
  PLAN_TYPE_TO_HIDE_BACK_BUTTON,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { generateExteralComponent } from "modules/inventorysmart/client-specific-features-inventorysmart/client-specific-inventorysmart-mapping";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  setSelectedFilters as setSelectedFiltersViewPastAllocation,
  setInventorysmartPastAllocationFilterDependency,
  setBackButtonClicked as setBackButtonClickedViewPastAllocation,
  setFormData,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import {
  setSelectedFilters as setSelectedFiltersOrderBatching,
  setInventorysmartOrderBatchingFilterDependency,
  setBackButtonClicked as setBackButtonClickedOrderBatching,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import {
  shouldDisplayDownloadButton,
  shouldDisplayFinalizeButtons,
} from "../Create-Allocation/helperFunctions";
import { cloneDeep, isEmpty, isUndefined } from "lodash";
import { isActionAllowedOnSubModule } from "../inventorysmart-utility";
import DownloadPlans from "./components/DownloadPlans";
import moment from "moment";
import jsonxml from "jsontoxml";
import { utils, write } from "xlsx";
import { saveFile } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import {
  resetStoreCapacityState,
  setStoreCapacityPlanType,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import {
  replaceSpecialCharToCharCode,
  replaceSpecialCharacter,
} from "core/Utils/functions/utils";
import InvalidAllocation from "./components/InvalidAllocation";
import { setFetchArticleSummary } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchProductDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchProductStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import {
  setAllocationCode as setNewFlowAllocationCode,
  setOriginalAllocationCode as setNewFlowOriginalAllocationCode,
  setPlanStatus as setNewFlowPlanStatus,
  setPlanType as setNewFlowPlanType,
  setArticle as setNewFlowArticle,
  setFetchArticleSummary as setNewFlowFetchArticleSummary,
  setFetchProductDetails as setNewFlowFetchProductDetails,
  setFetchProductStoreDetails as setNewFlowFetchProductStoreDetails,
  setFetchStoreDetails as setNewFlowFetchStoreDetails,
  resetNewFlowStoreView,
  setPackConfigurations as setNewFlowPackConfigurations,
  setSelectedArticles as setNewFlowSelectedArticles,
  enableEdit,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import EyeIcon from "assets/IS_icons/IS_Eye.svg";
import DrawIcon from "assets/IS_icons/IS_Draw.svg";
import { setMandatoryFilter } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";

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
export const finalizeAllocationContext = createContext(null);

const FINALIZE_SELECTED_ARTICLES_KEY_PREFIX = "finalize_selected_articles_";

const FinalizeAllocation = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const params = useParams();
  const location = useLocation();
  const type = new URLSearchParams(window.location.search).get("type");
  const [tabValue, setTabValue] = useState("product");
  const [disabledForViewOnlyAccess, setDisabledForViewOnlyAccess] = useState(
    false
  );
  const [planStatusResponse, updatePlanStatusResponse] = useState(null);
  const [downloadConfig, setDownloadConfig] = useState([]);
  const [showTables, setShowTables] = useState(false);
  const [selectedOption, setSelectedOption] = useState("view");
  const [sessionId, setSessionId] = useState(null);
  const [toggleUpdateResponse, setToggleUpdateResponse] = useState(null);
  const [showNewStoreCapacityFlow, setShowNewStoreCapacityFlow] = useState(
    false
  );
  const [editSchema, setEditSchema] = useState(null);
  const [editPlanStatus, setEditPlanStatus] = useState(null);

  const isNewProductFlow =
    props?.finalizeAllocationConfig?.enableNewFinalizeFlowProductView;
  const isNewStoreFlow =
    props?.finalizeAllocationConfig?.enableNewFinalizeFlowStoreView;
  const isAnyNewFlow = isNewProductFlow || isNewStoreFlow;

  const flowSetAllocationCode = isAnyNewFlow
    ? props.setNewFlowAllocationCode
    : props.setAllocationCode;
  const flowSetOriginalAllocationCode = isAnyNewFlow
    ? props.setNewFlowOriginalAllocationCode
    : props.setOriginalAllocationCode;
  const flowSetPlanStatus = isAnyNewFlow
    ? props.setNewFlowPlanStatus
    : props.setPlanStatus;
  const flowSetPlanType = isAnyNewFlow
    ? props.setNewFlowPlanType
    : props.setPlanType;
  const flowSetArticle = isAnyNewFlow ? props.setNewFlowArticle : props.setArticle;
  const flowSetFetchArticleSummary = isAnyNewFlow
    ? props.setNewFlowFetchArticleSummary
    : props.setFetchArticleSummary;
  const flowSetFetchProductDetails = isAnyNewFlow
    ? props.setNewFlowFetchProductDetails
    : props.setFetchProductDetails;
  const flowSetFetchProductStoreDetails = isAnyNewFlow
    ? props.setNewFlowFetchProductStoreDetails
    : props.setFetchProductStoreDetails;
  const flowSetFetchStoreDetails = isAnyNewFlow
    ? props.setNewFlowFetchStoreDetails
    : props.setFetchStoreDetails;
  const flowResetStoreView = isNewStoreFlow
    ? props.resetNewFlowStoreView
    : props.resetStoreView;

  let allocationCode = new URLSearchParams(window.location.search).get(
    "allocation_code"
  );
  allocationCode = replaceSpecialCharacter(allocationCode);
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
    flowSetFetchProductStoreDetails(null);
    flowSetFetchProductDetails(null);
    flowSetFetchArticleSummary(null);
    flowSetFetchStoreDetails(null);
    // Bridge: also reset old-slice fetch flags so old StoreView triggers loads
    if (isAnyNewFlow && newValue === "store") {
      props.setFetchProductStoreDetails(null);
      props.setFetchProductDetails(null);
      props.setFetchArticleSummary(null);
      props.setFetchStoreDetails(null);
    }
    if (isNewProductFlow) {
      props.setNewFlowPackConfigurations(null);
    }
    if (isAnyNewFlow) {
      props.setNewFlowSelectedArticles(null);
    }
    setTabValue(newValue);
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setMoveToTiageLoader(false);
  };
  const handleBackButtonClick = async () => {
    if (
      props.planStatus === "Finalized" &&
      location?.state?.isRedirectedFrom === "viewPastAllocation"
    ) {
      // props.setSelectedFiltersViewPastAllocation(props.selectedFilters);
      // props.setInventorysmartPastAllocationFilterDependency(
      //   props.inventorySmartFinalizeFilterDependency
      // );
      props.setBackButtonClickedViewPastAllocation(true);
      props.setFormData(props.formFilters);
      setTimeout(() => {
        navigate(VIEW_PAST_ALLOCATION);
      }, 1000);
    } else if (
      (props.planStatus === "Moved to Order Batching" ||
        props.planStatus === "Moved to Allocation Batching") &&
      location?.state?.isRedirectedFrom === "orderBatching"
    ) {
      // may required so keeping for future references
      // props.setSelectedFiltersOrderBatching(props.selectedFilters);
      // props.setInventorysmartOrderBatchingFilterDependency(
      //   props.inventorySmartFinalizeFilterDependency
      // );
      props.setBackButtonClickedOrderBatching(true);
      setTimeout(() => {
        navigate(ORDER_BATCHING_PATH);
      }, 1000);
    } else {
      try {
        // In new flow edit mode, props.allocationCode is the edit_allocation_code.
        // Always navigate back with the original allocation code.
        const originalCode =
          isAnyNewFlow && props.originalAllocationCode
            ? props.originalAllocationCode
            : allocationCode;
        const codeForDrafts = replaceSpecialCharToCharCode(originalCode);

        let l_draftResponse = await props.getDrafts(codeForDrafts);
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
          props.setCreateAllocationArticles(
            l_responseData.createAllocationArticles
          );
          props.setSelectedFilters(l_responseData.filters);
          const mandatoryFromDraft = l_responseData?.mandatory;
          if (mandatoryFromDraft != null && mandatoryFromDraft !== "") {
            props.setMandatoryFilter(
              String(mandatoryFromDraft).replaceAll(" ", "")
            );
          }
          props.setIsValidDraft(l_responseData.is_draft);
          props.setIsFiltersValid(false);
          props.setBackButtonClicked(true);
          props.setShowInvalidDraftModal(l_responseData.is_draft);
          if (l_responseData?.poCode) {
            props.setPOCode(l_responseData?.poCode || null);
          }
          props.setAllocTypeStatus(l_responseData?.alloc_type || null);
          props.setAsnCode(l_responseData?.asnCode || null);
          if (l_responseData?.filteredSelection) {
            props.setFilteredSelection(l_responseData?.filteredSelection || []);
          }
          if (l_responseData?.popupLink) {
            props.setPopUpLinkFromDashbaord(l_responseData?.popupLink || null);
          }
          //for when the redirection to step 2 Review store and DC
          if (l_responseData?.cache_key) {
            props.setCacheKey(l_responseData.cache_key);
          }
          navigate(
            `${CREATE_ALLOCATION}?step=1&type=backButton&allocation_code=${new URLSearchParams(
              window.location.search
            ).get("allocation_code")}`
          );
        }
      } catch (e) {
        handleErrorMessage(e);
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
      } else if (props?.redirectedFrom !== "viewPastAllocation") {
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
    const fetchNewStoreCapacityFlow = async () => {
      try {
        const response = await props.tenantConfigApiCache(1, {
          attribute_name: "new_features",
        });
        setShowNewStoreCapacityFlow(
          response?.data?.data?.[0]?.attribute_value?.CNA
            ?.showNewStoreCapacityFlow === true
        );
      } catch {
        setShowNewStoreCapacityFlow(false);
      }
    };
    fetchNewStoreCapacityFlow();
  }, []);

  useEffect(() => {
    if (!isEmpty(props?.finalizeAllocationConfig)) {
      setDownloadConfig(props?.finalizeAllocationConfig?.downloadPlan);
    }
  }, [props?.finalizeAllocationConfig]);

  const getArticlesForStatus = (p_allocationCode) => {
    try {
      const key = `${FINALIZE_SELECTED_ARTICLES_KEY_PREFIX}${p_allocationCode}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.log(e, "error");
    }
    return props.article ?? [];
  };

  const fethFinalizeScreenData = async (p_allocationCode) => {
    try {
      if (!p_allocationCode) {
        displaySnackMessages("Allocation Code missing for plan", "error");
        return;
      }
      props.setMoveToTiageLoader(true);
      const articles = getArticlesForStatus(p_allocationCode);
      let l_status = await props.getStatus({
        allocation_code: p_allocationCode,
        articles,
      });
      if (l_status.data.status) {
        // if (
        //   l_status.data.data.plan_status === "Finalized"
        //   // &&
        //   // !isEmpty(downloadConfig)
        // ) {
        //   await fetchPlanDataForDownload(p_allocationCode);
        // }
        props.setMoveToTiageLoader(false);
        let status =
          l_status.data.data.plan_status === "N/A"
            ? false
            : l_status.data.data.plan_status;
        flowSetPlanStatus(status);
        updatePlanStatusResponse(l_status.data);
        flowSetPlanType(l_status?.data?.data?.plan_type);
        props.setStoreCapacityPlanType(l_status?.data?.data?.plan_type);
        !l_status?.data?.data?.reallocate && setShowTables(true);
        if (!status) {
          displaySnackMessages("Plan doesn't exist", "error");
        }
      }
      props.setMoveToTiageLoader(false);
    } catch (e) {
      handleErrorMessage(e);
      flowSetPlanStatus(null);
      flowSetPlanType(null);
      props.setStoreCapacityPlanType(null);
    }
  };
  useEffect(() => {
    let l_allocationCode = new URLSearchParams(window.location.search).get(
      "allocation_code"
    );

    if (l_allocationCode && !isUndefined(location?.state?.isRedirectedFrom)) {
      // If location is undefined -> Redirected from another screen
      // props.resetProductView([]);
      flowResetStoreView([]);
      props.resetStoreCapacityState([]);
      flowSetAllocationCode(l_allocationCode);
    }
    fethFinalizeScreenData(l_allocationCode);
  }, [params, location.search]);

  useEffect(() => {
    let l_allocationCode = new URLSearchParams(window.location.search).get(
      "allocation_code"
    );
    flowSetAllocationCode(l_allocationCode);
    const storageKey = `${FINALIZE_SELECTED_ARTICLES_KEY_PREFIX}${l_allocationCode}`;
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key?.startsWith(FINALIZE_SELECTED_ARTICLES_KEY_PREFIX) &&
          key !== storageKey
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.log(e, "error");
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const l_articles = JSON.parse(stored);
        if (Array.isArray(l_articles) && l_articles.length > 0) {
          flowSetArticle(l_articles);
        } else {
          flowSetArticle([]);
        }
      } else {
        flowSetArticle([]);
      }
    } catch (e) {
      flowSetArticle([]);
      console.log(e, "error");
    }
    // reset showTables and planStatus to initial state on url change
    setShowTables(false);
    flowSetPlanStatus(null);
    props.setFinalized(false);
    // fethFinalizeScreenData(l_allocationCode);
    props.articleTableGlobalInstance.current = [];
    props.articleTableColumnRef.current = [];
    props.setAllocationPlanName("");
    props.setOptimizationDetails({});
  }, [location.search]);

  const fetchPlanDataForDownload = async (p_allocationCode) => {
    try {
      props.setMoveToTiageLoader(true);
      let l_triageResponse = await props.changePlanStatus({
        // allocation_code: p_allocationCode,
        edited_allocation_code: null,
        status: 3,
      });
      if (
        l_triageResponse.data.status &&
        !l_triageResponse.data?.data?.display_error
      ) {
        props.setDownloadPlan(l_triageResponse.data.data.output);
      }
      props.setMoveToTiageLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  useEffect(() => {
    props.setDraftSaved(false);
    props.setActionType("");
    // reset store and product views state on unmount
    return () => {
      props.resetProductView([]);
      flowResetStoreView([]);
      props.resetStoreCapacityState([]);
    };
  }, []);

  // Bridge: old-slice-reading components (TriageButton, FinalizeButton,
  // SaveButton, StoreView children) must always see the correct values even
  // when isAnyNewFlow=true writes exclusively to the new slice. Sync on every
  // relevant value change — not gated to a specific tab because the bottom-bar
  // buttons are visible on all tabs. Remove this effect once every consumer
  // reads from the new slice directly.
  useEffect(() => {
    if (isAnyNewFlow) {
      if (props.allocationCode) {
        props.setAllocationCode(props.allocationCode);
      }
      if (props.originalAllocationCode) {
        props.setOriginalAllocationCode(props.originalAllocationCode);
      }
      if (props.planStatus) {
        props.setPlanStatus(props.planStatus);
      }
      if (props.planType) {
        props.setPlanType(props.planType);
      }
      if (props.article) {
        props.setArticle(props.article);
      }
    }
  }, [isAnyNewFlow, props.allocationCode, props.originalAllocationCode, props.planStatus, props.planType, props.article]);

  const downloadFinalizeSummary = async () => {
    props
      .downloadFinalizeSummary({
        allocation_code: [props.allocationCode],
      })
      .then(() => {
        displaySnackMessages(
          "Download Request is running in background. You will get a notification once it is ready to download",
          "info"
        );
      });
  };

  const getTabData = () => {
    let tabName = [
      {
        label: `${dynamicLabelsBasedOnTenant("article")} View`,
        value: "product",
      },
      {
        label: t("inventorysmart.finalizeStoreView"),
        value: "store",
      },
    ];
    if (
      props?.redirectedFrom !== "viewPastAllocation" &&
      props?.planStatus !== "Finalized" &&
      !props?.finalized &&
      (!props?.finalizeAllocationConfig?.drillDown ||
        props?.finalizeAllocationConfig?.drillDown?.hidden?.indexOf(
          "storeCapacityBreach"
        ) < 0)
    ) {
      tabName = [
        ...tabName,
        {
          label:
            props.finalizeAllocationConfig?.storeCapacityBreachTabLabel ||
            t("inventorysmart.finalizeStoreCapacity"),
          value: "store_capacity",
        },
      ];
    }
    return tabName;
  };

  const renderNewFinalizeAllocationView = (type) => {
    return (
      <finalizeAllocationContext.Provider
        value={{
          selectedOption,
          setSelectedOption,
          sessionId,
          setSessionId,
          toggleUpdateResponse,
          renderToggleSummary: props.renderToggleSummary,
          editSchema,
          editPlanStatus,
        }}
      >
        {type === "product" ? (
          isNewProductFlow ? (
            <RecommendationProductView />
          ) : (
            <ProductView />
          )
        ) : isNewStoreFlow ? (
          <RecommendationStoreView />
          // <StoreView />
        ) : (
          <StoreView />
        )}
      </finalizeAllocationContext.Provider>
    );
  };

  const renderTabComponents = () => {
    let tabMapper = {};

    tabMapper = {
      product: renderNewFinalizeAllocationView("product"),
      store: renderNewFinalizeAllocationView("store"),
      store_capacity: (
        <div>
          {" "}
          {showNewStoreCapacityFlow ? (
            <StoreCapacityNewTable />
          ) : props.finalizeAllocationConfig
              ?.capacity_breach_article_store_level ? (
            <StoreCapacityBreach />
          ) : (
            <StoreCapacity />
          )}
        </div>
      ),
    };
    let tabsList = getTabData();
    let tablePanel = tabsList.map((thisTab) => {
      let tabValue = thisTab?.value;
      return <div>{tabMapper[tabValue]}</div>;
    });
    return tablePanel;
  };

  const refreshAllTables = () => {
    flowSetFetchArticleSummary(false);
    flowSetFetchProductDetails(false);
    flowSetFetchProductStoreDetails(false);
    flowSetFetchStoreDetails(false);
    setTimeout(() => {
      flowSetFetchArticleSummary(null);
      flowSetFetchProductDetails(null);
      flowSetFetchProductStoreDetails(null);
      flowSetFetchStoreDetails(null);
    }, 0);
  };

  const handleDiscardAllChanges = async () => {
    try {
      props.setMoveToTiageLoader(true);
      const payload = {
        allocation_code: props.allocationCode,
        session_id: sessionId,
      };

      const response = await props.hleResetToOriginal(payload);

      if (response.data?.status) {
        displaySnackMessages(
          "All changes have been discarded successfully",
          "success"
        );
        // Switch back to view mode
        setSelectedOption("view");
        setSessionId(null);
        // Reset to original allocation code if available
        // if (props.originalAllocationCode) {
        //   props.setAllocationCode(props.originalAllocationCode);
        // }

        refreshAllTables();
      } else {
        displaySnackMessages(
          response.data?.message || "Failed to discard changes",
          "error"
        );
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setMoveToTiageLoader(false);
    }
  };

  const isViewEditDisabled =
    props.moveToTiageLoader ||
    Boolean(props.productViewLoader) ||
    Boolean(props.productStoreViewSummaryLoader);

  const onButtonGroupChange = async (event, newValue) => {
    if (isViewEditDisabled) return;
    props.setMoveToTiageLoader(true);
    if (newValue === "edit") {
      try {
        let session_id = "";
        if (window.crypto && window.crypto.getRandomValues) {
          // Generate 16 random bytes and convert to hex string
          const array = new Uint8Array(16);
          window.crypto.getRandomValues(array);
          session_id = Array.from(array, (b) =>
            b.toString(16).padStart(2, "0")
          ).join("");
        }
        setSessionId(session_id);

        if (isAnyNewFlow) {
          const enableEditResponse = await props.enableEdit({
            allocation_code: allocationCode,
            session_id: session_id,
          });
          const responseData = enableEditResponse?.data?.data;
          if (enableEditResponse?.data?.status) {
            displaySnackMessages(
              enableEditResponse.data?.message || "Edit mode enabled",
              "success"
            );
            setSessionId(responseData?.session_id);
            setSelectedOption(newValue);
            !props.originalAllocationCode &&
              flowSetOriginalAllocationCode(props.allocationCode);
            flowSetAllocationCode(responseData?.edit_allocation_code);
            setEditSchema(responseData?.edit_schema || null);
            setEditPlanStatus(responseData?.plan_status ?? null);
            refreshAllTables();
          }
        } else {
          let toggleUpdateResponse = await props.callUpdateToggleAPI({
            allocation_code:
              props.originalAllocationCode || props.allocationCode,
            session_id: session_id,
            is_update_mode: true,
          });
          setToggleUpdateResponse(toggleUpdateResponse);
          if (
            toggleUpdateResponse.data?.show_message ||
            toggleUpdateResponse.data?.status
          ) {
            displaySnackMessages(
              toggleUpdateResponse.data?.message,
              "success"
            );
            setSelectedOption(newValue);
            !props.originalAllocationCode &&
              flowSetOriginalAllocationCode(props.allocationCode);
            flowSetAllocationCode(
              toggleUpdateResponse?.data?.data?.edit_allocation_code
            );
            refreshAllTables();
          }
        }
      } catch (e) {
        setSessionId(null);
        setEditSchema(null);
        setEditPlanStatus(null);
        setSelectedOption("view");
        handleErrorMessage(e);
      }
    } else {
      setSelectedOption(newValue);
      setEditSchema(null);
      setEditPlanStatus(null);
      refreshAllTables();
    }
    props.setMoveToTiageLoader(false);
  };

  //refactored function
  function getFinalizeButtonType() {
    return props?.finalizeAllocationConfig?.subComponent === "triageButton"
      ? PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON.includes(props.planStatus)
        ? null
        : "triageButton"
      : props.planType === "Auto Allocation" &&
        props?.finalizeAllocationConfig?.saveButtonForAutoAllocation
      ? null
      : props.planStatus === "Finalized"
      ? null
      : "finalizeButton";
  }

  const showDownloadSummary =
    props?.finalizeAllocationConfig?.drillDown?.downloadFinalizeSummary;
  const showViewEditToggle =
    props.renderToggleSummary &&
    props.planStatus !== "Finalized" &&
    !props.finalized;

  const downloadSummaryButton = showDownloadSummary && (
    <div className={classes.alignRight}>
      <Button
        variant="contained"
        color="primary"
        onClick={downloadFinalizeSummary}
      >
        Download Summary
      </Button>
    </div>
  );

  const viewEditToggleOptions = [
    {
      label: t("inventorysmart.finalizeViewMode"),
      value: "view",
      icon: <EyeIcon />,
    },
    {
      label: t("inventorysmart.finalizeEditMode"),
      value: "edit",
      icon: <DrawIcon />,
    },
  ];

  return (
    <div style={{ marginTop: props.moveToTiageLoader ? "24px" : "0" }}>
      {isAnyNewFlow && props.planStatus && showTables && (
        <>
          {downloadSummaryButton}
          <div className={classes.cnaTabsRow}>
            <Tabs
              value={tabValue}
              onChange={handleChangeTabValue}
              orientation="horizontal"
              tabNames={getTabData()}
              tabPanels={getTabData().map(() => (
                <></>
              ))}
              className={classes.tabContainerInCNAFinalize}
            />
            {showViewEditToggle && tabValue !== "store_capacity" && (
              <ButtonGroup
                onChange={onButtonGroupChange}
                selectedOption={selectedOption}
                options={viewEditToggleOptions}
                isDisabled={isViewEditDisabled}
              />
            )}
          </div>
        </>
      )}
      <Loader loader={props.moveToTiageLoader}>
        <div className={classes.paddingBottom2rem}>
          <div
            className={`${classes.mainWrapperFinalize} ${!isAnyNewFlow ? classes.marginTop24 : ""}`}
          >
        {props.planStatus && showTables && (
          <>
            {!isAnyNewFlow && (
              <>
                <div
                  className={showDownloadSummary ? classes.tabHeaderDesign : ""}
                >
                  {downloadSummaryButton}
                </div>
                <div style={{ position: "relative", marginBottom: "24px" }}>
                  {showViewEditToggle && tabValue !== "store_capacity" && (
                    <div
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "0",
                        zIndex: 10,
                      }}
                    >
                      <ButtonGroup
                        onChange={onButtonGroupChange}
                        selectedOption={selectedOption}
                        options={viewEditToggleOptions}
                      />
                    </div>
                  )}
                  <Tabs
                    value={tabValue}
                    onChange={handleChangeTabValue}
                    orientation="horizontal"
                    tabNames={getTabData()}
                    tabPanels={renderTabComponents()}
                    className={
                      showViewEditToggle
                        ? tabValue !== "store_capacity"
                          ? classes.tabContainerInCNAFinalizeOldFlow
                          : classes.tabPanelPaddingInCNAFinalize
                        : ""
                    }
                  />
                </div>
              </>
            )}
          </>
        )}
            {isAnyNewFlow && props.planStatus && showTables && (
              <div className={classes.cnaTabPanels}>
                {tabValue === "product" &&
                  renderNewFinalizeAllocationView("product")}
                {tabValue === "store" &&
                  renderNewFinalizeAllocationView("store")}
                {tabValue === "store_capacity" && (
                  <div>
                    {showNewStoreCapacityFlow ? (
                      <StoreCapacityNewTable />
                    ) : props.finalizeAllocationConfig
                        ?.capacity_breach_article_store_level ? (
                      <StoreCapacityBreach />
                    ) : (
                      <StoreCapacity />
                    )}
                  </div>
                )}
              </div>
            )}

            {planStatusResponse && (
              <InvalidAllocation
                resposne={planStatusResponse}
                closeCallback={() => setShowTables(true)}
                finalizeButtonType={getFinalizeButtonType()}
                updatePlanStatusResponse={updatePlanStatusResponse}
                {...props}
              />
            )}
          </div>
          {props.planStatus && (
            // <Grid
            //   container
            //   // sx={{
            //   //   gap: 1,
            //   //   background: "white",
            //   //   borderRadius: "8px",
            //   //   position: "absolute",
            //   //   left: "0",
            //   // }}
            //   className={`${globalClasses.bottomButtonsContainer}  ${globalClasses.flexAlignBetweenCenter} ${globalClasses.evenPaddingAround}`}
            // >
            <div className={`${classes.bottomButtonsWrapper}`}>
              <div className={classes.bottomButtonsGreyBar}></div>
              <div
                className={`${classes.bottomButtonsContainer24} ${globalClasses.flexAlignBetweenCenter}`}
              >
                {
                  // !shouldDisplayBackButton(
                  //   props.planStatus,
                  //   props.planType,
                  //   flowType,
                  //   props.finalized
                  // )
                  true && (
                    <Button
                      variant="outlined"
                      id="finalizeBtn"
                      onClick={handleBackButtonClick}
                      disabled={
                        disabledForViewOnlyAccess ||
                        props.finalized ||
                        (props.planType?.includes("Auto Allocation") &&
                          props.planStatus !== "Finalized" &&
                          location?.state?.isRedirectedFrom !==
                            "orderBatching" &&
                          location?.state?.isRedirectedFrom !==
                            "viewPastAllocation")
                      }
                    >
                      {location?.state?.isRedirectedFrom ===
                        "viewPastAllocation" ||
                      location?.state?.isRedirectedFrom === "orderBatching"
                        ? "< Back"
                        : "< Back to review store and DC"}
                    </Button>
                  )
                }
                {/* add save button here for higher level edits */}
                {
                  // !shouldDisplayFinalizeButtons(
                  //   props.planStatus,
                  //   props.planType,
                  //   flowType
                  // )
                  true && (
                    <div
                      className={`${globalClasses.flexRow} ${globalClasses.gap}`}
                    >
                      {/* {props.renderToggleSummary && (
                      <Button
                        variant="contained"
                        color="secondary"
                        id="finalize-save-edit-btn"
                        disabled={selectedOption === "view"}
                        // onClick={() => showSaveAllChangesPrompt()}
                      >
                        Save
                      </Button>
                    )} */}
                      {!isAnyNewFlow &&
                        props.renderToggleSummary &&
                        props.planStatus !== "Moved to Order Batching" &&
                        props.planStatus !== "Moved to Allocation Batching" && (
                          <Button
                            variant="tertiary"
                            id="discard-all-changes-btn"
                            onClick={handleDiscardAllChanges}
                            disabled={selectedOption === "view"}
                          >
                            Discard All Changes
                          </Button>
                        )}
                      <React.Fragment>
                        {generateExteralComponent(getFinalizeButtonType(), {
                          classes,
                          disabledForViewOnlyAccess,
                          resposne: props.isStoreBand
                            ? planStatusResponse
                            : null,
                          inventorysmartScreenConfig:
                            props.inventorysmartScreenConfig,
                          updatePlanStatusResponse: updatePlanStatusResponse,
                          setShowTables: setShowTables,
                          selectedOption: selectedOption,
                          articlesParams: props.article ?? [],
                          ...(isAnyNewFlow && {
                            isNewFlow: isAnyNewFlow,
                            sessionId,
                            editSchema,
                            editPlanStatus,
                          }),
                        })}
                      </React.Fragment>
                    </div>
                  )
                }
                {shouldDisplayDownloadButton(
                  downloadConfig,
                  props.downloadPlan
                ) && (
                  <DownloadPlans
                    downloadConfig={downloadConfig}
                    onClickHandler={(type) => onClickHandler(type)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const finalizeAllocationConfig =
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartFinalizeAllocationConfig;
  const isNewProductFlow = finalizeAllocationConfig?.enableNewFinalizeFlowProductView;
  const isNewStoreFlow = finalizeAllocationConfig?.enableNewFinalizeFlowStoreView;
  const isAnyNewFlow = isNewProductFlow || isNewStoreFlow;
  const oldStoreView =
    store.inventorysmartReducer.inventorySmartFinalizeStoreViewService;
  const newStoreView =
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService;
  const storeView = isAnyNewFlow ? newStoreView : oldStoreView;

  return {
    finalized: oldStoreView.finalized,
    moveToTiageLoader: oldStoreView.moveToTiageLoader,
    productViewLoader:
      store.inventorysmartReducer.inventorySmartNewFlowProductViewService
        .productViewLoader,
    productStoreViewSummaryLoader:
      store.inventorysmartReducer.inventorySmartNewFlowProductViewService
        .productStoreViewSummaryLoader,
    planStatus: storeView.planStatus,
    planType: storeView.planType,
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
    downloadPlan: oldStoreView.downloadPlan,
    allocationCode: storeView.allocationCode,
    article: storeView.articles,
    originalAllocationCode: storeView.originalAllocationCode,
    isStoreBand:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isStoreBand,
    renderToggleSummary:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig?.enableHLE,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
    inventorysmartReducer: store.inventorysmartReducer,
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
  resetStoreCapacityState: (payload) =>
    dispatch(resetStoreCapacityState(payload)),
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
  setAllocTypeStatus: (payload) => dispatch(setAllocTypeStatus(payload)),
  setAsnCode: (payload) => dispatch(setAsnCode(payload)),
  setFilteredSelection: (payload) => dispatch(setFilteredSelection(payload)),
  setPopUpLinkFromDashbaord: (payload) =>
    dispatch(setPopUpLinkFromDashbaord(payload)),
  //temp change: cacheKey for when the redirection to step 2 Review store and DC
  setCacheKey: (payload) => dispatch(setCacheKey(payload)),
  setCreateAllocationArticles: (payload) =>
    dispatch(setCreateAllocationArticles(payload)),
  setMandatoryFilter: (payload) => dispatch(setMandatoryFilter(payload)),
  downloadFinalizeSummary: (payload) =>
    dispatch(downloadFinalizeSummary(payload)),
  setFetchProductStoreDetails: (payload) =>
    dispatch(setFetchProductStoreDetails(payload)),
  setFetchProductDetails: (payload) =>
    dispatch(setFetchProductDetails(payload)),
  setFetchArticleSummary: (payload) =>
    dispatch(setFetchArticleSummary(payload)),
  setFetchStoreDetails: (payload) => dispatch(setFetchStoreDetails(payload)),
  callUpdateToggleAPI: (payload) => dispatch(callUpdateToggleAPI(payload)),
  enableEdit: (payload) => dispatch(enableEdit(payload)),
  hleResetToOriginal: (payload) => dispatch(hleResetToOriginal(payload)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
  setNewFlowAllocationCode: (payload) =>
    dispatch(setNewFlowAllocationCode(payload)),
  setNewFlowOriginalAllocationCode: (payload) =>
    dispatch(setNewFlowOriginalAllocationCode(payload)),
  setNewFlowPlanStatus: (payload) => dispatch(setNewFlowPlanStatus(payload)),
  setNewFlowPlanType: (payload) => dispatch(setNewFlowPlanType(payload)),
  setNewFlowArticle: (payload) => dispatch(setNewFlowArticle(payload)),
  setNewFlowFetchArticleSummary: (payload) =>
    dispatch(setNewFlowFetchArticleSummary(payload)),
  setNewFlowFetchProductDetails: (payload) =>
    dispatch(setNewFlowFetchProductDetails(payload)),
  setNewFlowFetchProductStoreDetails: (payload) =>
    dispatch(setNewFlowFetchProductStoreDetails(payload)),
  setNewFlowFetchStoreDetails: (payload) =>
    dispatch(setNewFlowFetchStoreDetails(payload)),
  resetNewFlowStoreView: () => dispatch(resetNewFlowStoreView()),
  setNewFlowPackConfigurations: (payload) =>
    dispatch(setNewFlowPackConfigurations(payload)),
  setNewFlowSelectedArticles: (payload) =>
    dispatch(setNewFlowSelectedArticles(payload)),
  setFinalized: (payload) => dispatch(setFinalized(payload)),
  setSelectedFiltersOrderBatching: (payload) =>
    dispatch(setSelectedFiltersOrderBatching(payload)),
  setInventorysmartOrderBatchingFilterDependency: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterDependency(payload)),
  setBackButtonClickedOrderBatching: (payload) =>
    dispatch(setBackButtonClickedOrderBatching(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FinalizeAllocation);
