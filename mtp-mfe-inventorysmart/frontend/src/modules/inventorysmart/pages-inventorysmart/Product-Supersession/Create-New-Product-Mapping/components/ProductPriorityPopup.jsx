import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep } from "lodash";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  setInventorysmartCreateMappingPopupDataLoader,
  setInventorysmartCreateMappingPopupTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import {
  getProductSupersessionPriorityReviewData,
  getProductSupersessionSummaryTableConfig,
  editPriorityAndExceptions,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import EditDatesAndPriorityPopup from "./EditDatesAndPriorityPopup";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { GET_SUPERSESSION_PRIORITY_VIEW_TABLE_CONFIG } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { BottomSheet, Button } from "impact-ui-v3";
import {
  getBottomSheetGridProps,
  getBottomSheetModalHeight,
  BottomSheetFooter,
  bottomSheetGridContentStyle,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const ProductPriorityPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const agGridViewInstance = useRef(null);
  const loadViewTableInstance = (params) => {
    agGridViewInstance.current = params;
  };
  const [render, setRender] = useState(false);
  const [
    productMappingPopupTableColumns,
    setProductMappingPopupTableColumns,
  ] = useState([]);
  const [priorityPopupData, setPriorityPopupData] = useState([]);
  const [initialPriorityData, setInitialPriorityData] = useState([]);
  const [isEditPriorityDialogActive, setIsEditPriorityDialogActive] = useState(
    false
  );
  const [addExceptionData, setAddExceptionData] = useState([]);
  const [existingStoreExceptions, setExistingStoreExceptions] = useState([]);
  const [reviewPriorityData, setReviewPriorityData] = useState(false);
  const [addExceptionButtonClicked, setAddExceptionButtonClicked] = useState(
    false
  );
  const [isEditDataLoading, setEditDataLoader] = useState(true);
  const [viewPriorityRowCount, setViewPriorityRowCount] = useState(1);

  const agGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const openEditPriorityModal = () => {
    setIsEditPriorityDialogActive(true);
  };

  const closeEditPriorityModal = () => {
    setIsEditPriorityDialogActive(false);
  };

  const onClickColumn = async (data) => {
    openEditPriorityModal();
    setReviewPriorityData(data);
    setAddExceptionButtonClicked(false);
  };

  const togglePriorityMappingPopup = (data) => {
    openEditPriorityModal();
  };

  const mappingActionMap = {
    new_style_size: togglePriorityMappingPopup,
  };

  const populatePriorityTablePopup = async () => {
    try {
      setEditDataLoader(true);
      await fetchProductMappingPopupTableConfig();
      if (props?.isVersion3) {
        try {
          const rowData = props?.clickedPriorityData[0];
          let body = {
            filters: props.selectedFilters?.filter(
              (filterItem) => filterItem?.values?.length > 0
            ),
            new_article:
              rowData?.new_article ||
              rowData?.new_sku ||
              rowData?.new_product_code,
            meta: {
              range: [],
              sort: [],
              search: [],
              limit: { limit: props.pageSize || 10, page: 0 },
            },
          };
          let response = await props.getProductSupersessionPriorityReviewData(
            body
          );
          response?.data?.data?.forEach((val) => {
            val.new_style_size = "Edit Priority";
          });
          let clonedData = cloneDeep(response?.data?.data);
          let defaultExceptionData = [];
          let existingExceptions = [];
          clonedData.forEach((thisMap) => {
            if (thisMap?.store === "default") {
              defaultExceptionData.push(thisMap);
            } else {
              existingExceptions.push(thisMap.store);
            }
          });
          // This sets the data for the table that shows up on click of view priority in dashboard.
          setPriorityPopupData(response?.data?.data);
          // Maintaing this to determine changes
          setInitialPriorityData(cloneDeep(response?.data?.data));
          // Maintaining this for editing exceptions
          setAddExceptionData(defaultExceptionData);
          // Maintining this to filter store band in Add exceptions.
          setExistingStoreExceptions(existingExceptions);
          setEditDataLoader(false);
        } catch (error) {
          console.log("Error while fetching Priority", error);
          setPriorityPopupData(defaultTableData.data);
          setEditDataLoader(false);
        }
      } else {
        let oldArticles = [];
        let newArticles = [];
        let priority = [];
        props?.parentAgGridInstance?.current?.api?.forEachNode(
          (item, index) => {
            if (item?.data?.old_article && item?.data?.new_article) {
              oldArticles.push(item?.data?.old_article);
              newArticles.push(item?.data?.new_article);
              priority.push(index + 1);
            }
          }
        );
        let newProductMapping = {
          new_articles: newArticles,
          old_article: oldArticles,
          priority: priority,
          store: "default",
          new_style_size: "Add Priority",
        };
        setPriorityPopupData([newProductMapping]);
        setAddExceptionData(newProductMapping);
        setEditDataLoader(false);
      }
    } catch (error) {
      console.log("Error while fetching Priority", error);
      setPriorityPopupData(defaultTableData.data);
      setEditDataLoader(false);
    } finally {
      props.setInventorysmartCreateMappingPopupTableLoader(false);
      setEditDataLoader(false);
    }
  };

  //Fetch table Config
  const fetchProductMappingPopupTableConfig = async () => {
    try {
      props.setInventorysmartCreateMappingPopupTableLoader(true);
      const payload = {
        tableConfigName: GET_SUPERSESSION_PRIORITY_VIEW_TABLE_CONFIG,
      };
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );
      let columnsUpdated = [...response?.data?.data];
      let columnsUpdatedWithClick = columnsUpdated.map((item) => {
        item.onClick = (tableInfo) => {
          onClickColumn(tableInfo?.cellData?.data || {}, item);
        };
        return item;
      });
      let formattedColumns = agGridColumnFormatter(
        columnsUpdatedWithClick,
        null,
        mappingActionMap
      );
      setProductMappingPopupTableColumns(formattedColumns);
      setRender(true);
    } finally {
      props.setInventorysmartCreateMappingPopupTableLoader(false);
    }
  };

  //Fetch Data for View Only cases
  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      const rowData = props?.clickedPriorityData[0];
      let body = {
        filters: props.selectedFilters?.filter(
          (filterItem) => filterItem?.values?.length > 0
        ),
        new_article:
          rowData?.new_article ||
          rowData?.new_sku ||
          rowData?.new_product_code,
        meta: {
          ...manualbody,
          limit: { limit: CACHE_BLOCKSIZE_STRATEGY, page: pageIndex + 1 },
        },
      };
      let response = await props.getProductSupersessionPriorityReviewData(body);
      response?.data?.data?.forEach((val) => {
        val.new_style_size = "View Priority";
      });
      let formattedData = agGridRowFormatter(
        response?.data?.data,
        params?.api?.checkConfiguration,
        "index"
      );
      const currentPageRowCount = formattedData?.length || 0;
      setViewPriorityRowCount(Math.max(currentPageRowCount, 1));
      return {
        data: formattedData,
        totalCount: response?.data?.total ?? response?.data?.totalCount ?? 0,
      };
    } catch {
      setViewPriorityRowCount(1);
      return defaultTableData;
    }
  };

  const resetProductMappingPopupData = () => {
    setProductMappingPopupTableColumns([]);
    setRender(false);
    setViewPriorityRowCount(1);
  };

  useEffect(() => {
    if (props.active) {
      if (props?.isEditAllowed && props?.selectedFilters)
        populatePriorityTablePopup();
      else fetchProductMappingPopupTableConfig();
    } else {
      resetProductMappingPopupData();
    }
  }, [props.active, props.selectedFilters]);

  //Opens the EditDatesAndPriorityPopup from "AddException" button
  const clickAddException = () => {
    setAddExceptionButtonClicked(true);
    setReviewPriorityData(addExceptionData);
    openEditPriorityModal();
  };

  //This function handles the Save Button on EditDatesAndPriorityPopup
  const updatePriorityExceptions = async (
    updatedProducts,
    hasStoreException,
    storeNames
  ) => {
    let oldPriorityPopupData = [...priorityPopupData];
    if (hasStoreException) {
      storeNames.forEach((store) => {
        let exceptionData = { ...updatedProducts[0] };
        exceptionData.store = store;
        exceptionData.new_style_size = "Edit Exception";
        let index = oldPriorityPopupData.findIndex(
          (data) => data.store === store
        );
        if (index === -1) oldPriorityPopupData.push(exceptionData);
        else oldPriorityPopupData[index].priority = exceptionData.priority;
      });
    } else {
      oldPriorityPopupData.map((data) => {
        if (data.store === updatedProducts[0].store) {
          data.priority = updatedProducts[0].priority;
        }
      });
    }
    setPriorityPopupData(oldPriorityPopupData);
    agGridInstance.current.api.refreshCells({
      force: true,
    });
    closeEditPriorityModal();
  };

  //This function handles the Save Button on this popup
  const updateV3Priority = async () => {
    const payloadPriority = {
      mappings: [],
      action: "",
    };

    const payloadExcecption = {
      mappings: [],
      action: "add_exception",
    };

    let old_article_priority_psa_mapper_Final = {};
    let old_article_priority_psa_mapper_Initial = {};
    let old_article_psa_mapper = {};
    const defaultData = priorityPopupData.filter((thisData) => {
      return thisData.store === "default";
    });
    defaultData[0].old_article.forEach((thisOld, index) => {
      old_article_psa_mapper[thisOld] = defaultData[0]?.ps_codes?.[index];
    });
    priorityPopupData.forEach((thisData) => {
      old_article_priority_psa_mapper_Final = {
        ...old_article_priority_psa_mapper_Final,
        [thisData.store]: {},
      };
      thisData.old_article.forEach((thisArt, index) => {
        old_article_priority_psa_mapper_Final[thisData.store][thisArt] = {
          priority: Number(thisData.priority[index]),
          ps_code: thisData?.ps_codes
            ? Number(thisData.ps_codes[index])
            : Number(old_article_psa_mapper[thisArt]),
        };
      });
    });

    initialPriorityData.forEach((thisData) => {
      old_article_priority_psa_mapper_Initial = {
        ...old_article_priority_psa_mapper_Initial,
        [thisData.store]: {},
      };
      thisData.old_article.forEach((thisArt, index) => {
        old_article_priority_psa_mapper_Initial[thisData.store][thisArt] = {
          priority: Number(thisData.priority[index]),
          ps_code: thisData?.ps_codes ? Number(thisData.ps_codes[index]) : null,
        };
      });
    });

    const InitialStores = Object.keys(old_article_priority_psa_mapper_Initial);

    Object.keys(old_article_priority_psa_mapper_Final).forEach((thisStore) => {
      const old_articles = Object.keys(
        old_article_priority_psa_mapper_Final[thisStore]
      );

      if (!InitialStores.includes(thisStore)) {
        old_articles.forEach((thisArticle) => {
          payloadExcecption.mappings.push({
            store: thisStore,
            ...old_article_priority_psa_mapper_Final[thisStore][thisArticle],
          });
        });
      } else {
        old_articles.forEach((thisArticle) => {
          payloadPriority.mappings.push({
            store: thisStore,
            ...old_article_priority_psa_mapper_Final[thisStore][thisArticle],
          });
        });
      }
    });
    try {
      setEditDataLoader(true);
      if (payloadPriority.mappings.length > 0) {
        await props.editPriorityAndExceptions(payloadPriority);
      }
      if (payloadExcecption.mappings.length > 0) {
        await props.editPriorityAndExceptions(payloadExcecption);
      }
      setEditDataLoader(false);
      props.addSnack({
        message: "Priority Updated Successfully!",
        options: {
          variant: "success",
        },
      });
    } catch (error) {
      setEditDataLoader(false);
      console.log("Error while Saving Priority", error);
    }

    props?.closeModal();
  };

  const exceptionLabel = "Add Exception";
  let priorityLabel = props?.isVersion3 ? "Edit Priority" : "Add Priority";
  if (!props.isEditAllowed) {
    priorityLabel = "View Priority";
  }
  const itemLabel =
    props?.productSupersessionModuleConfig?.priority_popup_table_label ||
    (props?.isVersion3 ? "New SKU ID :" : "Main Style ID :");
  const headerKey =
    props?.productSupersessionModuleConfig?.priority_popup_header_key ||
    "new_article";
  const headerValue =
    props?.clickedPriorityData?.[0]?.[headerKey] ||
    props?.clickedPriorityData?.[0]?.new_article;

  const priorityRowCount = props?.isEditAllowed
    ? priorityPopupData?.length
    : viewPriorityRowCount;
  const priorityGridProps = getBottomSheetGridProps(priorityRowCount, {
    withPagination: true,
  });
  const prioritySheetHeight = getBottomSheetModalHeight(priorityRowCount, {
    withPagination: true,
  });

  return props.active ? (
    <BottomSheet
      open={props.active}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.closeModal();
      }}
      title={props?.isEditAllowed ? "Edit Priority" : "View Priority"}
      withExpandIcon={false}
      maxHeight="calc(100vh - 64px)"
      {...(prioritySheetHeight ? { height: prioritySheetHeight } : {})}
      footerOptions={
        <BottomSheetFooter
          onCancel={() => props.closeModal()}
          primaryButton={
            props?.isEditAllowed ? (
              <Button
                variant="primary"
                disabled={isEditDataLoading}
                onClick={updateV3Priority}
              >
                Save
              </Button>
            ) : null
          }
        />
      }
    >
      <div style={bottomSheetGridContentStyle}>
        <Loader
          loader={
            props.inventorysmartCreateMappingPopupDataLoader ||
            props.inventorysmartCreateMappingPopupTableLoader
          }
          minHeight="0"
        >
          {render && (
            <>
              {/** Below table shows up on click of priority from dashboard in Read only Mode */}
              {!props?.isEditAllowed && (
                <AgGridComponent
                  tableHeader={`${itemLabel} ${replaceSpecialCharacter(
                    headerValue
                  )}`}
                  columns={productMappingPopupTableColumns}
                  uniqueRowId={"index"}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  pagination={true}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  cacheBlockSize={CACHE_BLOCKSIZE_STRATEGY}
                  loadTableInstance={loadViewTableInstance}
                  cardContainer={false}
                  hideTableSetting
                  {...priorityGridProps}
                />
              )}
              {/** Below table shows up on click of priority from dashboard in editable mode */}
              {props?.isEditAllowed && (
                <Loader loader={isEditDataLoading} minHeight="0">
                  <AgGridComponent
                    tableHeader={`${itemLabel} ${replaceSpecialCharacter(
                      headerValue
                    )}`}
                    columns={productMappingPopupTableColumns}
                    rowdata={priorityPopupData}
                    uniqueRowId={"store"}
                    pagination={true}
                    loadTableInstance={loadTableInstance}
                    cardContainer={false}
                    hideTableSetting
                    {...priorityGridProps}
                    topRightOptions={
                      <Button
                        variant="primary"
                        className={classes.button}
                        onClick={clickAddException}
                      >
                        Add Exception
                      </Button>
                    }
                  />
                </Loader>
              )}
            </>
          )}
        </Loader>
      </div>
      {/** Nested bottom sheet */}
      <EditDatesAndPriorityPopup
        dialogTitle={
          addExceptionButtonClicked ? exceptionLabel : priorityLabel
        }
        active={
          reviewPriorityData !== false ? isEditPriorityDialogActive : false
        }
        openModal={openEditPriorityModal}
        closeModal={closeEditPriorityModal}
        priorityMappingData={
          addExceptionButtonClicked && props?.isVersion3
            ? addExceptionData[0]
            : reviewPriorityData
        }
        isSelectStoreDisplayed={addExceptionButtonClicked}
        isEditAllowed={props?.isEditAllowed}
        hideSelectedStoreName={addExceptionButtonClicked}
        updatePriorityExceptions={updatePriorityExceptions}
        isVersion3={props?.isVersion3}
        existingStoreExceptions={existingStoreExceptions}
        clickedPriorityData={props?.clickedPriorityData}
      />
    </BottomSheet>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService.selectedFilters,
    inventorysmartCreateMappingPopupTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateMappingPopupTableLoader,
    inventorysmartCreateMappingPopupDataLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateMappingPopupDataLoader,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    productSupersessionModuleConfig:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .productSupersessionModuleConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
  getProductSupersessionPriorityReviewData: (payload) =>
    dispatch(getProductSupersessionPriorityReviewData(payload)),
  setInventorysmartCreateMappingPopupTableLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingPopupTableLoader(payload)),
  setInventorysmartCreateMappingPopupDataLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingPopupDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  editPriorityAndExceptions: (payload) =>
    dispatch(editPriorityAndExceptions(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductPriorityPopup);
