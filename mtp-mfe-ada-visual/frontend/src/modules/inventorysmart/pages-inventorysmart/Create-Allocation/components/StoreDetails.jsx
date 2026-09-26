import Button from "@mui/material/Button";
import AgGridComponent from "core/Utils/agGrid";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import { cloneDeep, fill, isEmpty, merge, omit } from "lodash";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  DRAFT_FLOW,
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  createAllocationApi,
  deleteDrafts,
  saveDraft,
  savePlanForDraft,
  setIsFiltersValid,
  setStoreDcTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import {
  checkValidationForArticles,
  getValuesFromObject,
  onlySpaces,
} from "../helperFunctions";
import StoreSetAllModal from "./StoreSetAllModal";
import Validation from "./Validation";

const REVIEWED_ARTICLES_MAPPING_TO_PREP_REQUEST = {
  "APS/ROS": "APS_ROS",
  min_stock: "Min_Stock",
  max_stock: "Max_Stock",
  WOS_rounded: "WOS",
  onhand: "onhand",
  intransit: "intransit",
  onorder: "onorder",
  transit_time: "Transit_Time",
  original_forecast: "original_forecast",
  lt_forecast: "lt_forecast",
  isWosEdited: "isWosEditedList",
};

const StoreDetails = (props) => {
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [
    createAllocationButtonEnabled,
    setCreateAllocationButtonEnabled,
  ] = useState(true);
  const [forwardButtonEnabled, setForwardButtonEnabled] = useState(false);
  const [disabledForViewOnlyAccess, setDisabledForViewOnlyAccess] = useState(
    false
  );
  const [refStoreChanged, setRefStoreChanged] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [
    articlesWithValidationError,
    setArticlesWithValidationError,
  ] = useState({
    articlesWithValidationError: [],
    validationErrorMessage: "",
    articlesListWithAllPossibleValidation: [],
  });
  const history = useHistory();

  const {
    storeData,
    storeColumnm,
    onBlur,
    loadTableInstance,
    pollingReq,
    applyChanges,
    allocationName,
    storeRequest,
    storeResponse,
    selectedArticle,
    agGridInstance,
    updatedStores,
    updatedDcs,
    articleTableGridInstance,
    updatedRows,
    selectedRows,
    onSelectionChanged,
    updatedStoresStoreGroup,
    updatedStoresDcs,
    updatedStoresProductProfile,
    setTotalEstimatedDemad,
    setSelectedRows,
  } = props;

  const classes = useStyles();
  const type = new URLSearchParams(window.location.search).get("type");

  useEffect(() => {
    if (agGridInstance?.current) {
      agGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [buttonEnabled]);

  useEffect(() => {
    if (type !== DRAFT_FLOW) {
      if (props.backButtonClicked) {
        setCreateAllocationButtonEnabled(false);
        setForwardButtonEnabled(true);
      } else {
        setCreateAllocationButtonEnabled(true);
        setForwardButtonEnabled(false);
      }
    }
  }, [props.backButtonClicked]);

  useEffect(() => {
    if (
      !isEmpty(props.inventorysmartModulesPermission) &&
      !isEmpty(props.module)
    ) {
      let l_roleWithCreateAccess = isActionAllowedOnSubModule(
        props.inventorysmartModulesPermission,
        props.module,
        INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_ALLOCATION_STORE_TABLE,
        "create"
      );
      setDisabledForViewOnlyAccess(!l_roleWithCreateAccess);
    }
  }, [props.inventorysmartModulesPermission, props.module]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onSelectionChangedHandler = (event) => {
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled = agGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    onSelectionChanged(event);
  };

  const getReviewedDetails = (p_articleStoreData, p_updatesStores) => {
    let l_req = {},
      l_reviewed = false,
      l_updatedStoresForSelectedArticle =
        p_updatesStores?.[p_articleStoreData?.Product_Code],
      l_selectedStores = Object.values(
        l_updatedStoresForSelectedArticle || []
      ).filter((val) => val?.is_selected),
      l_channel = props.selectedFilters?.filter(
        (filter) => filter.attribute_name === "channel"
      )[0].values[0];

    let l_storeArticleData = [];
    if (p_articleStoreData.Product_Code === selectedArticle.value) {
      l_reviewed = true;
      agGridInstance.current.api.forEachNode((node) => {
        l_storeArticleData.push(node.data);
      });
      if (!isEmpty(l_selectedStores)) {
        l_storeArticleData = cloneDeep(l_selectedStores);
      }
    } else if (
      Object.keys(storeResponse).includes(p_articleStoreData.Product_Code)
    ) {
      l_reviewed = true;
      l_storeArticleData =
        storeResponse[p_articleStoreData.Product_Code]?.["data"];
      if (!isEmpty(l_selectedStores)) {
        l_storeArticleData = cloneDeep(l_selectedStores);
      }
    }

    if (l_reviewed) {
      l_req = {
        ...getValuesFromObject(
          l_storeArticleData,
          REVIEWED_ARTICLES_MAPPING_TO_PREP_REQUEST
        ),
        Modified_Flag: true,
        channel: l_channel
          ? fill(Array(l_storeArticleData.length), l_channel)
          : null,
        Store_List: l_storeArticleData?.map(
          (storeArticle) => storeArticle.store_code
        ),
        Store_Size_List: l_storeArticleData?.map((val) => {
          return {
            Store: val["store_code"],
            Store_Level_Propotion: val["overall_proportion"],
            Size: val["size_desc"],
            Size_Level_Proportion: val["size_level_proportion"],
            "original_min_stock": val?.["size_desc"].map( item =>{
              return val?.[item+"_min_stock"]
            }),  
            "original_max_stock": val?.["size_desc"].map( item =>{
              return val?.[item+"_max_stock"]
            }),  
          };
        }),
        minMaxEdited: l_storeArticleData?.some(
          (storeArticle) => storeArticle.minMaxEdited
        ),
      };
    }
    return l_req;
  };

  const onCellValueChanged = (p_instance) => {
    const { column, newValue, oldValue } = p_instance;
    if (
      column?.colId === "ref_store" &&
      newValue !== oldValue &&
      !refStoreChanged
    ) {
      setRefStoreChanged(true);
    }
    if (type !== DRAFT_FLOW) {
      !createAllocationButtonEnabled && setCreateAllocationButtonEnabled(true);
      forwardButtonEnabled && setForwardButtonEnabled(false);
    }
  };

  const pushPrevDraftData = (
    p_requestToSaveDraft,
    p_requestToSaveDraftMapping
  ) => {
    let l_storeRequest = {
      DC_Codes: [],
      ...storeRequest[selectedArticle.value],
    };
    let l_draftData = props.draftResult;
    let isDraftEmpty = isEmpty(l_draftData);
    for (let mappingKey in p_requestToSaveDraftMapping) {
      let l_mappedValues =
        l_storeRequest[p_requestToSaveDraftMapping?.[mappingKey]];
      let l_arrayValues = Array.isArray(l_mappedValues)
        ? l_mappedValues
        : [l_mappedValues];
      p_requestToSaveDraft["req_top_table"][mappingKey].push(
        ...l_arrayValues,
        ...(!isDraftEmpty ? l_draftData[mappingKey] : [])
      );
    }
  };

  const getChangedArticlesAndDcFromPrevDraft = (
    p_changedRowsFromPrevDraftFlow,
    p_accessor
  ) => {
    return (
      p_changedRowsFromPrevDraftFlow &&
      p_changedRowsFromPrevDraftFlow[p_accessor]
    );
  };

  const getRequestForSavePlanForDraft = (p_createAllocationRequest) => {
    try {
      return p_createAllocationRequest?.map((value) => {
        return {
          article: value.Product_Code,
          inventory_source: value.Inventory_Source,
          store_code: value.Store_List ? value.Store_List : value.mapped_stores,
        };
      });
    } catch {
      return [];
    }
  };

  const callDraftAndAllocationApi = async ({
    l_allocationName,
    l_request,
    isDraft,
    l_updatesStores,
    excludeAndContinueWithAllocation,
  }) => {
    try {
      new URLSearchParams(window.location.search).get("allocation_code") &&
        (await props.deleteDrafts(
          new URLSearchParams(window.location.search).get("allocation_code")
        ));
      let l_draftResponse = await props.saveDraft(l_request);
      if (
        l_draftResponse.data.status &&
        l_draftResponse.data.data.allocation_id
      ) {
        let l_storeDetailsAfterExclusion = !isEmpty(
          articlesWithValidationError?.articlesListWithAllPossibleValidation
        )
          ? omit(
              storeRequest,
              articlesWithValidationError?.articlesListWithAllPossibleValidation
            )
          : storeRequest;
        let l_req = Object.values(l_storeDetailsAfterExclusion)?.map(
          (articleStoreData) => {
            return {
              ...articleStoreData,
              Modified_Flag: false,
              Allocation_Name: l_draftResponse.data.data?.allocation_name,
              ...getReviewedDetails(articleStoreData, l_updatesStores),
            };
          }
        );
        if (isDraft) {
          let l_savePlanForDraftResponse = await props.savePlanForDraft({
            data: getRequestForSavePlanForDraft(l_req),
            allocation_name:
              l_draftResponse.data.data?.allocation_name ||
              l_draftResponse.data.data?.allocation_id,
            allocation_code: l_draftResponse.data.data?.allocation_id,
          });
          displaySnackMessages(l_savePlanForDraftResponse.data.message, "info");
          props.setStoreDcTableLoader(false);
          if (l_savePlanForDraftResponse.data.status) {
            props.setIsFiltersValid(false);
          }
        } else {
          let l_createAllocationResponse = await props.createAllocationApi(
            {
              input: l_req,
              allocationID: l_draftResponse.data.data?.allocation_id,
            },
            props.isV3?.includes("allocation")
          );
          displaySnackMessages(l_createAllocationResponse.data.message, "info");
          props.setStoreDcTableLoader(false);
          if (l_createAllocationResponse.data.status) {
            props.setIsFiltersValid(false);
          }
        }
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setStoreDcTableLoader(false);
    }
  };

  const createAllocation = async ({
    isDraft,
    excludeAndContinueWithAllocation = false,
  }) => {
    try {
      if (
        (onlySpaces(allocationName) || !allocationName) &&
        props.isNameMandatory
      ) {
        displaySnackMessages("Please Enter Allocation Plan Name", "error");
        return;
      }
      let l_articlesWithValidationError = {};
      if (!excludeAndContinueWithAllocation) {
        l_articlesWithValidationError = checkValidationForArticles(
          props.polledResults?.filter(
            (result) =>
              !articlesWithValidationError.articlesListWithAllPossibleValidation?.includes(
                result.article
              )
          ),
          "article",
          props.storeGroupStoreMap,
          props.storesForSelectedStoreFilters,
          false,
          true,
          props.reserve_quantity_flag
        );
      }
      if (
        l_articlesWithValidationError?.articlesWithValidationError?.length &&
        !excludeAndContinueWithAllocation
      )
        setArticlesWithValidationError((old) => {
          return {
            ...l_articlesWithValidationError,
            articlesListWithAllPossibleValidation: [
              ...old.articlesListWithAllPossibleValidation,
              ...l_articlesWithValidationError?.articlesWithValidationError,
            ],
          };
        });
      else {
        props.setStoreDcTableLoader(true);
        let l_updatesStores = { ...updatedStores };
        let isUpdatedRowsEmpty = isEmpty(updatedRows);
        let l_changedRowsFromPrevDraftFlow = props.draftResult?.changed_rows;
        if (!isUpdatedRowsEmpty || !isEmpty(selectedRows)) {
          l_updatesStores = {
            ...l_updatesStores,
            [selectedArticle.value]: {
              ...l_updatesStores[selectedArticle.value],
              ...updatedRows,
              ...selectedRows,
            },
          };
        }

        let l_request = {
          mandatory: props.mandatoryFilter,
          req_top_table: {
            filters: props.selectedFilters,
            filter_dependency:
              props.inventorysmartCreateAllocationFilterDependency,
            selection:
              articleTableGridInstance.current?.api?.checkConfiguration,
            set_all:
              articleTableGridInstance?.current?.api?.checkAllSetAllRequest,
            prev_action: articleTableGridInstance?.current?.api?.prevAction,
            allocation_name: allocationName,
            store_group_codes: [...updatedStoresStoreGroup],
            dc_codes: [...updatedStoresDcs],
            poCode: props.poCode,
            filteredSelection: !isEmpty(props.filteredSelection)
              ? props.filteredSelection
              : [],
            // props.filteredSelection,
            popupLink: props.popUpLinkFromDashbaord,
            product_profile_codes: [...updatedStoresProductProfile],
            displayedAndHiddenCheckedRows: {
              ...props.displayedAndHiddenCheckedRows,
            },
          },
          data: {
            changed_articles: {
              ...getChangedArticlesAndDcFromPrevDraft(
                l_changedRowsFromPrevDraftFlow,
                "changed_articles"
              ),
              ...articleTableGridInstance.current.api.updatedRows,
            },
            changed_articles_store: {
              ...merge(
                l_changedRowsFromPrevDraftFlow?.["changed_articles_store"]
                  ? cloneDeep(
                      l_changedRowsFromPrevDraftFlow["changed_articles_store"]
                    )
                  : {},
                cloneDeep(l_updatesStores)
              ),
            },
            changed_articles_dc: {
              ...getChangedArticlesAndDcFromPrevDraft(
                l_changedRowsFromPrevDraftFlow,
                "changed_articles_dc"
              ),
              ...updatedDcs,
            },
          },
        };
        if (!isUpdatedRowsEmpty) {
          pushPrevDraftData(l_request, {
            store_group_codes: "Store_Group_Code",
            dc_codes: "DC_Codes",
            product_profile_codes: "Product_Profile_Code",
          });
        }
        let l_allocationName = allocationName;
        callDraftAndAllocationApi({
          l_allocationName,
          l_request,
          isDraft,
          l_updatesStores,
          excludeAndContinueWithAllocation,
        });
      }
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setIsFiltersValid(false);
      props.setStoreDcTableLoader(false);
    }
  };

  const onApplyChangesHandler = async () => {
    setShowAlert(false);
    applyChanges();
    setRefStoreChanged(false);
  };

  const excludeAllHandler = () => {
    createAllocation({
      isDraft: false,
      excludeAndContinueWithAllocation: false,
    });
    // setUncheckableArticles({
    //   uncheckableRows: articlesWithValidationError?.articlesWithValidationError,
    //   callBackFunction: setUncheckableArticles,
    // });
  };

  return (
    <div>
      <AgGridComponent
        rowdata={storeData}
        columns={storeColumnm}
        selectAllHeaderComponent={true}
        onBlur={onBlur}
        onSelectionChanged={onSelectionChangedHandler}
        onCellValueChanged={onCellValueChanged}
        uniqueRowId={"store_code"}
        loadTableInstance={loadTableInstance}
        getRowStyle={(params) => {
          if (params.data.delta_store_flag) {
            return { background: "#ffffcc" };
          }
        }}
        suppressFieldDotNotation
        // below three props are used to remove pagination and add scrolling for table in client side row model
        pagination={false}
        hideSelectCurrentPageRecords
      />
      <div className={classes.buttonGroupWrapper}>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          disabled={disabledForViewOnlyAccess || !buttonEnabled}
          onClick={() => setShowSetAllModal(true)}
        >
          Set All
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          disabled={disabledForViewOnlyAccess || !refStoreChanged}
          onClick={() => setShowAlert(true)}
        >
          Apply Changes
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          disabled={disabledForViewOnlyAccess || !isEmpty(pollingReq)}
          onClick={() => createAllocation({ isDraft: true })}
        >
          Save as Draft
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          disabled={
            disabledForViewOnlyAccess ||
            !createAllocationButtonEnabled ||
            !isEmpty(pollingReq)
          }
          onClick={() => createAllocation({ isDraft: false })}
        >
          Create Allocation
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          disabled={disabledForViewOnlyAccess || !forwardButtonEnabled}
          onClick={() =>
            history.push(
              `${CREATE_ALLOCATION}?step=1&allocation_code=${new URLSearchParams(
                window.location.search
              ).get("allocation_code")}`
            )
          }
        >
          Forward
        </Button>
      </div>
      <Validation
        articles={articlesWithValidationError}
        excludeAllHandler={excludeAllHandler}
      />
      {showSetAllModal && (
        <StoreSetAllModal
          setShowSetAllModal={setShowSetAllModal}
          agGridInstance={agGridInstance}
          setTotalEstimatedDemad={setTotalEstimatedDemad}
          setSelectedRows={setSelectedRows}
          showSizeLevelBulkEdit={props?.createAllocationProps?.showSizeLevelBulkEdit}
        />
      )}
      <Prompt
        isOpen={showAlert}
        title="Confirmation Alert"
        subHeading="APS values will be overwritten, Are you sure you want to continue?"
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            onApplyChangesHandler(true);
            setShowAlert(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowAlert(false),
        }}
        variant="warning"
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    storeDcTableLoader:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .storeDcTableLoader,
    allocationName:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .allocationName,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .selectedFilters,
    mandatoryFilter:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .mandatoryFilter,
    inventorysmartCreateAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .inventorysmartCreateAllocationFilterDependency,
    draftResult:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .draftResult,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .backButtonClicked,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_create_allocation
        ?.isNameMandatory,
    poCode:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.poCode,
    filteredSelection:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .filteredSelection,
    popUpLinkFromDashbaord:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .popUpLinkFromDashbaord,
    createAllocationArticles:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .createAllocationArticles,
    reserve_quantity_flag:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.["validationMessage"]?.[
        "reserve_quantity"
      ],
    createAllocationProps: store.inventorysmartReducer?.inventorySmartCommonService?.
      inventorysmartScreenConfig.inventorysmart_create_allocation
  };
};

const mapDispatchToProps = (dispatch) => ({
  createAllocationApi: (payload, isV3) =>
    dispatch(createAllocationApi(payload, isV3)),
  savePlanForDraft: (payload) => dispatch(savePlanForDraft(payload)),
  saveDraft: (payload) => dispatch(saveDraft(payload)),
  deleteDrafts: (payload) => dispatch(deleteDrafts(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setStoreDcTableLoader: (payload) => dispatch(setStoreDcTableLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreDetails);
