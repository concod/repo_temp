import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import classnames from "classnames";
import { Dialog, DialogContent, Typography } from "@mui/material";
import { Button } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  setInventorysmartCreateMappingPopupDataLoader,
  setInventorysmartCreateMappingPopupTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import {
  getProductSupersessionPriorityReviewData,
  getProductSupersessionSummaryTableConfig,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import EditDatesAndPriorityPopup from "./EditDatesAndPriorityPopup";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { GET_SUPERSESSION_PRIORITY_VIEW_TABLE_CONFIG } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

import styles from "../index.module.scss";

const ProductPriorityPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const { hideStoreException, precalculatedPriority, choiceLabels } =
    props.inventorysmartScreenConfig?.inventorysmart_configuration
      ?.supersession || {};

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
  const [isEditPriorityDialogActive, setIsEditPriorityDialogActive] = useState(
    false
  );
  const [addExceptionData, setAddExceptionData] = useState([]);
  const [reviewPriorityData, setReviewPriorityData] = useState(false);
  const [addExceptionButtonClicked, setAddExceptionButtonClicked] = useState(
    false
  );
  const agGridInstance = useRef(null);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const openEditPriorityModal = () => {
    setIsEditPriorityDialogActive(true);
  };

  const closeEditPriorityModal = () => {
    setIsEditPriorityDialogActive(false);

    // On hiding store exception, need to skip this pop-up and display the edit priority pop-up
    if (hideStoreException) {
      updatePriority();
    }
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
      await fetchProductMappingPopupTableConfig();

      let oldArticles = [];
      let newArticles = [];
      let priority = [];

      props?.parentAgGridInstance?.current?.api?.forEachNode((item, index) => {
        if (item?.data?.old_article && item?.data?.new_article) {
          oldArticles.push(item?.data?.old_article);
          newArticles.push(item?.data?.new_article);

          let newPriority = index + 1;

          if (precalculatedPriority) {
            const mapping = props.productsMappingReviewData.find(
              (data) => data.old_article === item?.data?.old_article
            );

            newPriority = mapping?.priority?.[0]?.value ?? mapping?.priority ?? newPriority;
          }

          priority.push(newPriority);
        }
      });

      let newProductMapping = {
        new_articles: newArticles,
        old_article: oldArticles,
        priority: priority,
        store: "default",
        new_style_size: "Add Priority",
      };

      const newPriorityPopupData = [...priorityPopupData];
      const foundIndex = newPriorityPopupData.findIndex(
        (data) => data.store === "default"
      );

      if (foundIndex === -1) {
        newPriorityPopupData.unshift(newProductMapping);
      } else {
        newPriorityPopupData[foundIndex] = newProductMapping;
      }

      setPriorityPopupData(newPriorityPopupData);
      setAddExceptionData(newProductMapping);
    } catch (error) {
      console.log("Error while fetching Priority", error);
      setPriorityPopupData(defaultTableData.data);
    } finally {
      props.setInventorysmartCreateMappingPopupTableLoader(false);
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
      let body = {
        filters: props.selectedFilters?.filter(
          (filterItem) => filterItem?.values?.length > 0
        ),
        new_article: props?.clickedPriorityData?.new_article,
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

      // On hiding store exception, need to skip this pop-up and display the edit priority pop-up
      if(hideStoreException && formattedData?.[0]) {
        onClickColumn(formattedData[0]);
      }

      return {
        data: formattedData,
      };
    } catch (error) {
      return defaultTableData;
    }
  };

  const resetProductMappingPopupData = () => {
    setProductMappingPopupTableColumns([]);
    setRender(false);
  };

  useEffect(() => {
    if (props.active) {
      if (props?.isEditAllowed) populatePriorityTablePopup();
      else fetchProductMappingPopupTableConfig();
    } else {
      resetProductMappingPopupData();
    }
  }, [props.active]);

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
        exceptionData.new_style_size = "Add Priority";

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
  const updatePriority = () => {
    let updatedPriority = [];

    for (const item of priorityPopupData) {
      for (let i = 0; i < item.old_article?.length; i++) {
        let index = updatedPriority.findIndex(
          (article) => article.articleName === item.old_article[i]
        );

        if (index === -1) {
          let articleObject = {
            articleName: item.old_article[i],
            stores: [],
            storesPriority: [],
          };

          if (item.store === "default") {
            articleObject.defaultPriority = item.priority[i];
          } else {
            articleObject.stores.push(item.store);
            articleObject.storesPriority.push(item.priority[i]);
            articleObject.has_store_exception = true;
          }

          updatedPriority.push(articleObject);
        } else {
          if (item.store === "default") {
            updatedPriority[index].defaultPriority = item.priority[i];
          } else {
            if (!updatedPriority[index].stores.includes(item.store)) {
              updatedPriority[index].stores.push(item.store);
              updatedPriority[index].storesPriority.push(item.priority[i]);
              updatedPriority[index].has_store_exception = true;
            }
          }
        }
      }
    }

    props?.closeModal();
    props.updatePriorityMapping(updatedPriority);
  };

  const onClose = (_event, reason) => {
    if (reason === "backdropClick") {
      return;
    }

    props.closeModal();
  };

  useEffect(() => {
    // On hiding store exception, need to skip this pop-up and display the edit priority pop-up
    if (hideStoreException && props.active && priorityPopupData?.[0] && props.isEditAllowed) {
      onClickColumn(priorityPopupData[0]);
    }
  }, [props.active, priorityPopupData, onClickColumn]);

  if (!props.active) {
    return null;
  }

  return (
    <Dialog
      id="storeInventoryDialog"
      aria-labelledby="store-invenotry-dialog"
      open={props.active}
      maxWidth="md"
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={onClose}
      classes={{
        paperFullWidth: classes.paperFullWidth,
      }}
      style={
        hideStoreException
          ? {
              // On hiding store exception, need to skip this pop-up and display the edit priority pop-up
              display: "none",
            }
          : null
      }
    >
      <DialogContent
        dividers
        classes={{
          root: classnames(
            classes.dialogContentRoot,
            globalClasses.flexRow,
            globalClasses.layoutAlignBetweenCenter,
            globalClasses.overflowHidden
          ),
        }}
      >
        <Typography classes={{ root: globalClasses.moduleTitle }}>
          {props?.isEditAllowed ? "Add Priority" : "View Priority"}
        </Typography>
        <IconButton color="primary" onClick={props.closeModal} size="large">
          <CloseIcon fontSize="medium" />
        </IconButton>
      </DialogContent>
      <DialogContent
        dividers
        classes={{
          root: classnames(
            globalClasses.dialogContentBody,
            globalClasses.paddingHorizontal
          ),
        }}
      >
        <Loader
          loader={
            props.inventorysmartCreateMappingPopupDataLoader ||
            props.inventorysmartCreateMappingPopupTableLoader
          }
          minHeight={"350px"}
        >
          {render && (
            <div>
              <div className={globalClasses.marginBottom}>
                <Typography
                  classes={{ root: globalClasses.dialogTitle }}
                  className={styles["pt-0"]}
                >
                  {choiceLabels?.main ?? 'Main Choice'} ID : {props?.clickedPriorityData?.new_article}
                </Typography>
              </div>
              {props?.isEditAllowed && !props.isStoreExceptionHidden && (
                <div
                  className={classnames(
                    globalClasses.layoutAlignEnd,
                    globalClasses.marginBottom
                  )}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    className={classes.button}
                    onClick={clickAddException}
                  >
                    Add Exception
                  </Button>
                </div>
              )}
              {!props?.isEditAllowed && (
                <AgGridComponent
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
                />
              )}
              {props?.isEditAllowed && (
                <AgGridComponent
                  columns={productMappingPopupTableColumns}
                  rowdata={priorityPopupData}
                  uniqueRowId={"store"}
                  pagination={true}
                  loadTableInstance={loadTableInstance}
                />
              )}
              <div
                className={classnames(
                  classes.buttonGroupWrapper,
                  globalClasses.marginAround
                )}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  className={classes.button}
                  onClick={() => props.closeModal()}
                >
                  Cancel
                </Button>
                {props?.isEditAllowed && (
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    onClick={updatePriority}
                  >
                    Save
                  </Button>
                )}
              </div>
              <EditDatesAndPriorityPopup
                dialogTitle={
                  addExceptionButtonClicked ? "Add Exception" : "Add Priority"
                }
                active={
                  hideStoreException || (
                  reviewPriorityData !== false
                    ? isEditPriorityDialogActive
                    : false)
                }
                openModal={openEditPriorityModal}
                closeModal={closeEditPriorityModal}
                priorityMappingData={reviewPriorityData}
                isSelectStoreDisplayed={addExceptionButtonClicked}
                isEditAllowed={props?.isEditAllowed}
                hideSelectedStoreName={addExceptionButtonClicked}
                updatePriorityExceptions={updatePriorityExceptions}
              />
            </div>
          )}
        </Loader>
      </DialogContent>
    </Dialog>
  );
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
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductPriorityPopup);
