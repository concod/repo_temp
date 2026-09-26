import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { cloneDeep } from "lodash";
import classNames from "classnames";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
  START_END_DATE_ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import {
  getProductSupersessionSummaryData,
  getProductSupersessionSummaryTableConfig,
  setInventorysmartProductSupersessionSummaryLoader,
  setInventorysmartProductSupersessionTableLoader,
  deleteProductSupersessionMappings,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import ReviewSKULevelMappingViewPopup from "../Create-New-Product-Mapping/components/ReviewSKULevelMappingViewPopup";
import EditSizeMappingPopup from "./EditSizeMappingPopup";
// import DownloadButton from "../../StoreInventoryAlerts/components/Download";
import { SUPERSESSION_DOWNLOAD_LINK } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import ProductPriorityPopup from "../Create-New-Product-Mapping/components/ProductPriorityPopup";
import { Button } from "impact-ui-v3";
import DeleteIcon from "@mui/icons-material/Delete";
import EditDatesAndPriorityPopup from "../Create-New-Product-Mapping/components/EditDatesAndPriorityPopup";
import { Prompt, useTranslation } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { saveProductMappingReviewData, updateProductMapping } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-review-mapping-service";
import moment from "moment";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import {
  INVENTORY_SUBMODULES_NAMES
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const ProductSupersessionDashboard = function (props) {
  const { t } = useTranslation();
  const pageSize =
    props?.inventorysmartScreenConfig?.inventorysmart_page_count || 10;
  const isSaveMappingButtonEnabled = props?.productSupersessionModuleConfig?.save_mapping || false;
  const isSizeLevelReMappingEnabled = props?.productSupersessionModuleConfig?.isSizeLevelReMappingEnabled || false;
  const globalClasses = globalStyles();
  const agGridInstance = useRef(null);
  const { tenantDateFormat } = getTenantTimeZoneDetails();

  const [render, setRender] = useState(false);
  const [
    productsSupersessionSummaryColumnConfig,
    setProductsSupersessionSummaryColumnConfig,
  ] = useState([]);
  const [sizeMappingData, setSizeMappingData] = useState(null);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [
    openProductMappingViewOnlyDialog,
    setOpenProductMappingViewOnlyDialog,
  ] = useState(false);
  const [enableReportDownload, setEnableReportDownload] = useState(true);

  //Hiding Save Mapping
  const [isSaveMappingEnabled, setIsSaveMappingEnabled] = useState(false);

  const [updatedDateRecords, setUpdatedDateRecords] = useState([]);
  const [clickedPriorityData, setClickedPriorityData] = useState(false);
  const [
    isPriorityMappingDialogActive,
    setIsPriorityMappingDialogActive,
  ] = useState(false);
  const [
    isEditDatesAndPriorityDialogActive,
    setIsEditDatesAndPriorityDialogActive,
  ] = useState(false);
  const [showDeleteConfirmationDialog, setShowDeleteConfirmationDialog] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [modifiedMappings, setModifiedMappings] = useState([]);
  const isRevertingRef = useRef(false);
  const [openProductMappingEditDialog, setOpenProductMappingEditDialog] = useState(false);
  const [editSizeMappingData, setEditSizeMappingData] = useState(null);

  const isMultipleMappingDeleteEnabled = props?.productSupersessionModuleConfig?.isMultipleMappingDeleteEnabled || false;

  const permissionCheckToDisable = isActionAllowedOnSubModule(
    props?.inventorysmartModulesPermission,
    props?.module,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_SUPERSESSION_DASHBOARD,
    "edit"
  );

  const openEditDatesAndPriorityModal = () => {
    setIsEditDatesAndPriorityDialogActive(true);
  };

  const closeEditDatesAndPriorityModal = () => {
    setIsEditDatesAndPriorityDialogActive(false);
  };

  const openProductMappingViewOnlyPopUp = () => {
    setOpenProductMappingViewOnlyDialog(true);
  };

  const closeProductMappingViewOnlyPopUp = () => {
    setSizeMappingData(null);
    setOpenProductMappingViewOnlyDialog(false);
  };

  const editSKULevelMapping = () => {
    const currentSizeMappingData = sizeMappingData;
    closeProductMappingViewOnlyPopUp();
    if (!currentSizeMappingData) return;
    setEditSizeMappingData({ ...currentSizeMappingData });
    setOpenProductMappingEditDialog(true);
  };

  const cancelProductMappingEditPopUp = () => {
    setEditSizeMappingData(null);
    setOpenProductMappingEditDialog(false);
  };

  const onSaveSizeMappingFromPopup = async (mappingData) => {
    if (!mappingData) return;
    try {
      props.setInventorysmartProductSupersessionSummaryLoader(true);

      const payload = {
        mappings: [
          {
            new_article: mappingData.new_article,
            old_article: mappingData.old_article,
            ps_codes: mappingData.ps_codes,
            new_product_codes: mappingData.new_product_codes,
            old_product_codes: mappingData.old_product_codes,
          },
        ],
      };

      const response = await props.updateProductMapping(payload);
      if (response.data?.status) {
        displaySnackMessages(
          t("inventorysmart.sizeMappingUpdatedSuccessfully"),
          "success"
        );
        setRender(false);
        fetchProductSupersessionSummaryTableConfig();
      } else {
        displaySnackMessages(
          t("inventorysmart.errorWhileSavingSizeMapping"),
          "error"
        );
      }
    } catch (error) {
      displaySnackMessages(
        t("inventorysmart.errorWhileSavingSizeMapping"),
        "error"
      );
    } finally {
      props.setInventorysmartProductSupersessionSummaryLoader(false);
    }
  };

  const toggleReviewSKULevelMappingPopup = (data) => {
    setSizeMappingData(data);
    openProductMappingViewOnlyPopUp();
  };

  const openPriorityMappingViewOnlyPopUp = () => {
    setIsPriorityMappingDialogActive(true);
  };

  const closePriorityMappingViewOnlyPopUp = () => {
    setIsPriorityMappingDialogActive(false);
  };

  const editPriorityMapping = () => {
    closePriorityMappingViewOnlyPopUp();
  };

  const togglePriorityMappingPopup = (data) => {
    openPriorityMappingViewOnlyPopUp();
  };

  const reviewSKULevelMappingActionMap = {
    mapped_sizes: toggleReviewSKULevelMappingPopup,
    priority: togglePriorityMappingPopup,
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedRows([...selections]);
    props.setSelectedProductMappings([...selections]);
  };
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;
  const parseDate = (dateValue) => {
    const parsed = moment(dateValue, DATE_FORMAT, true);
    if (parsed.isValid()) return parsed;
    return moment(dateValue);
  };
  const validateDates = (data) => {
    if (data.start_date && data.end_date) {
      const startDate = parseDate(data.start_date);
      const endDate = parseDate(data.end_date);
            
      if (startDate.isValid() && endDate.isValid()) {
        return startDate.isSameOrBefore(endDate);
      }
    }
    return true;
  };

  const onCellValueChanged = (params) => {
    if (isRevertingRef.current) return;
    const { data, column } = params;
    if (column.colId === 'start_date' || column.colId === 'end_date') {
      if (!data[column.colId]) {
        const existingIndex = modifiedMappings.findIndex(mapping => mapping.index === data.index);
        if (existingIndex !== -1) {
          const updatedMappings = [...modifiedMappings];
          updatedMappings[existingIndex] = { ...data, isModified: true };
          setModifiedMappings(updatedMappings);
        }
        return;
      }
      if (!validateDates(data)) {
        displaySnackMessages(START_END_DATE_ERROR_MESSAGE, "error");
        
        if (column.colId === 'end_date') {
          isRevertingRef.current = true;
          params.node.setDataValue('end_date', params.oldValue);
          isRevertingRef.current = false;
          return;
        }
        if (column.colId === 'start_date') {
          isRevertingRef.current = true;
          params.node.setDataValue('start_date', params.oldValue);
          isRevertingRef.current = false;
          return;
        }
      }
    }
    
    const index = modifiedMappings.findIndex(mapping => mapping.index === data.index);
    
    if (index === -1) {
      setModifiedMappings([...modifiedMappings, { ...data, isModified: true }]);
    } else {
      const updatedMappings = [...modifiedMappings];
      updatedMappings[index] = { ...data, isModified: true };
      setModifiedMappings(updatedMappings);
    }
  };

  const formatProductSupersessionSummary = (data, no_size_mapping) => {
    const formattedData = data?.map((mapping, index) => {
      mapping.index = index;
      mapping.new_product_code = [...mapping.new_product_codes];
      mapping.old_product_code = [...mapping.old_product_codes];

      if (
        !no_size_mapping ||
        props?.productSupersessionModuleConfig?.sizeMapping
      ) {
        const sizesLength = mapping?.new_sizes?.length;
        mapping.mapped_sizes = sizesLength;
        mapping.new_size = [...mapping?.new_sizes];
        mapping.old_size = [...mapping?.old_sizes];
      }
      return mapping;
    });

    return formattedData;
  };

  const fetchProductSupersessionSummaryTableConfig = async () => {
    try {
      props.setInventorysmartProductSupersessionTableLoader(true);
      const payload = {
        tableConfigName: "product-supersession-summary",
      };
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );
      let columnsUpdated = response?.data?.data?.filter(
        (col) => col.column_name !== "priority"
      );
      let columnsUpdatedWithClick = columnsUpdated?.map((item) => {
        if(item.is_editable && item.type !== "link"){
          item.disabled = !permissionCheckToDisable;
        }
        item.onClick = (tableInfo) => {
          onClickColumn(tableInfo?.cellData?.data || {}, item);
        };
        return item;
      });

      let formattedColumns = agGridColumnFormatter(
        columnsUpdatedWithClick,
        null,
        reviewSKULevelMappingActionMap,
      );
      setProductsSupersessionSummaryColumnConfig(formattedColumns);
      setRender(true);
    } finally {
      props.setInventorysmartProductSupersessionTableLoader(false);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    // Fetch summary data for old skus.
    try {
      props.setInventorysmartProductSupersessionSummaryLoader(true);

      let body = {
        filters: props.selectedFilters?.filter(
          (filterItem) => filterItem?.values?.length > 0
        ),
        meta: {
          ...manualbody,
          limit: { limit: pageSize, page: pageIndex + 1 },
        },
      };

      let response = await props.getProductSupersessionSummaryData(body);
      let mappedProductSupersessionSummary = formatProductSupersessionSummary(
        response?.data?.data,
        props?.inventorysmart_product_supersession_v3
      );
      mappedProductSupersessionSummary.forEach((val) => {
        val.priority_action = "View Priority";
      });
      let formattedData = agGridRowFormatter(
        mappedProductSupersessionSummary,
        params?.api?.checkConfiguration,
        "index"
      );
      setEnableReportDownload(formattedData?.length === 0 ? true : false);
      return {
        data: formattedData,
      };
    } catch {
      setEnableReportDownload(true);
      return defaultTableData;
    } finally {
      props.setInventorysmartProductSupersessionSummaryLoader(false);
    }
  };

  const getDownloadRequestBody = () => {
    let filters = props.selectedFilters?.filter(
      (filterItem) => filterItem?.values?.length > 0
    );
    const payload = {
      filters,
      table_config: [...productsSupersessionSummaryColumnConfig],
    };
    return payload;
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const deleteRowAction = (params) => {
    setRowToDelete(params.data);
    setShowDeleteConfirmationDialog(true);
  };

  const deleteSelectedMappings = () => {
    const selectedRows = agGridInstance.current?.api?.getSelectedRows() || [];
    setShowDeleteConfirmationDialog(true);
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setRender(false);
      fetchProductSupersessionSummaryTableConfig();
    }
  }, [props.selectedFilters]);

  const onClickColumn = async (data, column) => {
    let clickedData = data;
    let clickedDataArray = [];
    if (column.column_name === "priority_action") {
      clickedData.action = "View Priority";
      clickedDataArray.push(clickedData);
      openPriorityMappingViewOnlyPopUp();
    } else {
      clickedData.action = "Mapped Sizes";
      openProductMappingViewOnlyPopUp();
    }
    setClickedPriorityData(clickedDataArray);
    setSizeMappingData(clickedData);
  };

  const closeDeleteConfirmation = () => {
    setShowDeleteConfirmationDialog(false);
    setRowToDelete(null);
  };

  const handleDeleteMapping = async () => {
    try {
      props.setInventorysmartProductSupersessionSummaryLoader(true);
      setShowDeleteConfirmationDialog(false);

      let mappings;
      if (isMultipleMappingDeleteEnabled) {
        const gridSelectedRows = agGridInstance.current?.api?.getSelectedRows() || [];
        mappings = gridSelectedRows.map((row) => ({
          new_article: row.new_article,
          old_article: row.old_article,
        }));
      } else {
        mappings = [{
          old_article: rowToDelete?.old_article,
          new_article: rowToDelete?.new_article,
        }];
      }

      const payload = { mappings };
      
      const response = await props.deleteProductSupersessionMappings(payload);
      
      if (response.data?.status) {
        displaySnackMessages(
          mappings.length > 1
            ? `${mappings.length} mappings deleted successfully`
            : "Mapping deleted successfully",
          "success"
        );
        setSelectedRows([]);
        props.setSelectedProductMappings([]);
        setRender(false);
        fetchProductSupersessionSummaryTableConfig();
      } else {
        displaySnackMessages(
          t("inventorysmart.errorWhileDeletingMapping"),
          "error"
        );
      }
    } catch (error) {
      displaySnackMessages(
        t("inventorysmart.errorWhileDeletingMapping"),
        "error"
      );
      props.setInventorysmartProductSupersessionSummaryLoader(false);
    } finally {
      props.setInventorysmartProductSupersessionSummaryLoader(false);
      setRowToDelete(null);
    }
  };

  const handleSaveModifiedMappings = async () => {
    try {
      props.setInventorysmartProductSupersessionSummaryLoader(true);
      
      if (!modifiedMappings.length) {
        displaySnackMessages(t("inventorysmart.noChangesToSave"), "info");
        return;
      }
      
      const hasInvalidDate = modifiedMappings.some(mapping => {
        const { start_date, end_date } = mapping;
        return (
          !start_date ||
          !end_date ||
          start_date === "Invalid date" ||
          end_date === "Invalid date"
        );
      });
      if (hasInvalidDate) {
        displaySnackMessages(
          t("inventorysmart.invalidDateInSomeMappings"),
          "error"
        );
        return;
      }

      const invalidMappings = modifiedMappings.filter(mapping => !validateDates(mapping));
      if (invalidMappings.length > 0) {
        displaySnackMessages(START_END_DATE_ERROR_MESSAGE, "error");
        return;
      }
      
      const mappingsToSave = modifiedMappings.map(mapping => {
        return {
          old_article: mapping.old_article,
          new_article: mapping.new_article,
          old_product_codes: mapping.old_product_codes,
          new_product_codes: mapping.new_product_codes,
          start_date: parseDate(mapping.start_date).format(TENANT_DATE_FORMAT),
          end_date: parseDate(mapping.end_date).format(TENANT_DATE_FORMAT),
          priority: mapping.priority,
          old_product_description: mapping.old_product_description,
          has_store_exception: mapping.has_store_exception,
          old_l2_name: mapping.old_l2_name,
          old_l3_name: mapping.old_l3_name,
          old_l4_name: mapping.old_l4_name,
        };
      });
      
      const payload = {
        mappings: mappingsToSave
      };
      
      const response = await props.saveProductMappingReviewData(payload);
      
      if (response.data?.status) {
        displaySnackMessages(
          t("inventorysmart.changesSavedSuccessfully"),
          "success"
        );
        setModifiedMappings([]);
        setRender(false);
        fetchProductSupersessionSummaryTableConfig();
      } else {
        displaySnackMessages(
          t("inventorysmart.errorWhileSavingChanges"),
          "error"
        );
      }
    } catch (error) {
      displaySnackMessages(
        t("inventorysmart.errorWhileSavingChanges"),
        "error"
      );
    } finally {
      props.setInventorysmartProductSupersessionSummaryLoader(false);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getTopRightOptions = () => {
    return (
      <>
        {isMultipleMappingDeleteEnabled && permissionCheckToDisable && selectedRows.length > 0 && (
            <Button
              id="delete-mappings"
              onClick={deleteSelectedMappings}
              variant="tertiary"
              icon={<DeleteIcon/>}
            />
        )}
        {
          isSaveMappingButtonEnabled && (
            <Button
              id="save-changes"
              onClick={handleSaveModifiedMappings}
              variant="primary"
              size="large"
              disabled={!modifiedMappings.length}
            >
              Save Changes
            </Button>
          )}
        {props?.topRightOptions}
      </>
    );
  };

  return (
    <div>
        <Loader
          loader={
            props.inventorysmartProductSupersessionTableLoader ||
            props.inventorysmartProductSupersessionSummaryLoader
          }
          minHeight={"188px"}
        >
          {isSaveMappingEnabled && (
            <div
              className={classNames(
                globalClasses.layoutAlignEnd,
                globalClasses.marginBottom
              )}
            >
              <Button
                variant="contained"
                color="primary"
                disabled={updatedDateRecords.length === 0}
              >
                Save Mapping
              </Button>
            </div>
          )}

          {render && (
            <AgGridComponent
              tableHeader={"Details"}
              columns={productsSupersessionSummaryColumnConfig}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              uniqueRowId={"index"}
              selectAllHeaderComponent={isMultipleMappingDeleteEnabled}
              rowSelection={isMultipleMappingDeleteEnabled ? "multiple" : ""}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              cacheBlockSize={pageSize}
              onSelectionChanged={isMultipleMappingDeleteEnabled ? onSelectionChanged : ""}
              onCellValueChanged={onCellValueChanged}
              loadTableInstance={loadAlertsTableInstance}
              pagination={true}
              paginationPageSize={pageSize}
              topRightOptions={getTopRightOptions()}
              {...(!isMultipleMappingDeleteEnabled && {
                callDeleteApi: deleteRowAction,
                isDeleteDisabled: () => !permissionCheckToDisable,
              })}
            />
          )}
        </Loader>
      <ReviewSKULevelMappingViewPopup
        active={openProductMappingViewOnlyDialog}
        openModal={openProductMappingViewOnlyPopUp}
        closeModal={closeProductMappingViewOnlyPopUp}
        sizeMappingData={sizeMappingData}
        editSKULevelMapping={editSKULevelMapping}
        isEditAllowed={isSizeLevelReMappingEnabled}
      />
      <EditSizeMappingPopup
        active={openProductMappingEditDialog}
        closeModal={cancelProductMappingEditPopUp}
        sizeMappingData={editSizeMappingData}
        onSave={onSaveSizeMappingFromPopup}
      />
      {!props?.inventorysmart_product_supersession_v3 && (
        <ProductPriorityPopup
          active={
            clickedPriorityData.length > 0
              ? isPriorityMappingDialogActive
              : false
          }
          openModal={openPriorityMappingViewOnlyPopUp}
          closeModal={closePriorityMappingViewOnlyPopUp}
          editSKULevelMapping={editPriorityMapping}
          clickedPriorityData={clickedPriorityData}
          isEditAllowed={false}
        />
      )}
      {props?.inventorysmart_product_supersession_v3 && (
        <ProductPriorityPopup
          active={
            clickedPriorityData.length > 0
              ? isPriorityMappingDialogActive
              : false
          }
          openModal={openPriorityMappingViewOnlyPopUp}
          closeModal={closePriorityMappingViewOnlyPopUp}
          editSKULevelMapping={editPriorityMapping}
          clickedPriorityData={clickedPriorityData}
          isEditAllowed={true}
          parentAgGridInstance={agGridInstance}
          isVersion3={true}
        />
      )}
      <EditDatesAndPriorityPopup
        dialogTitle={t("inventorysmart.editDatesAndPriority")}
        active={isEditDatesAndPriorityDialogActive}
        openModal={openEditDatesAndPriorityModal}
        closeModal={closeEditDatesAndPriorityModal}
        clickedPriorityData={clickedPriorityData}
        editSKULevelMapping={editPriorityMapping}
      />
      <Prompt
        isOpen={showDeleteConfirmationDialog}
        title={t("inventorysmart.deleteMapping")}
        onPrimaryButtonClick={handleDeleteMapping}
        onSecondaryButtonClick={() => setShowDeleteConfirmationDialog(false)}
        primaryButtonLabel={t("inventorysmart.delete")}
        secondaryButtonLabel={t("inventorysmart.cancel")}
        variant="warning"
        handleClose={closeDeleteConfirmation}
      >
        {isMultipleMappingDeleteEnabled && selectedRows.length > 1
          ? t("inventorysmart.areYouSureToDeleteMappings", {
              count: selectedRows.length,
            })
          : t("inventorysmart.areYouSureToDeleteMapping")}
      </Prompt>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    productSupersessionModuleConfig:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .productSupersessionModuleConfig,
    inventorysmartProductSupersessionTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionSummaryService
        .inventorysmartProductSupersessionTableLoader,
    inventorysmartProductSupersessionSummaryLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionSummaryService
        .inventorysmartProductSupersessionSummaryLoader,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    inventorysmart_product_supersession_v3:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        ?.productSupersessionModuleConfig?.inventorysmart_product_supersession_v3,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartProductSupersessionSummaryLoader: (payload) =>
    dispatch(setInventorysmartProductSupersessionSummaryLoader(payload)),
  setInventorysmartProductSupersessionTableLoader: (payload) =>
    dispatch(setInventorysmartProductSupersessionTableLoader(payload)),
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
  getProductSupersessionSummaryData: (payload) =>
    dispatch(getProductSupersessionSummaryData(payload)),
  deleteProductSupersessionMappings: (payload) =>
    dispatch(deleteProductSupersessionMappings(payload)),
  saveProductMappingReviewData: (payload) =>
    dispatch(saveProductMappingReviewData(payload)),
  updateProductMapping: (payload) => dispatch(updateProductMapping(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductSupersessionDashboard);
