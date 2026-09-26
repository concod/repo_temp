import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import {
  getProductSupersessionSummaryData,
  getProductSupersessionSummaryTableConfig,
  setInventorysmartProductSupersessionSummaryLoader,
  setInventorysmartProductSupersessionTableLoader,
  supersessionCheckDownload,
  uploadSupeSessionFile,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import ReviewSKULevelMappingViewPopup from "../Create-New-Product-Mapping/components/ReviewSKULevelMappingViewPopup";
import DownloadButton from "../../StoreInventoryAlerts/components/Download";
import { SUPERSESSION_DOWNLOAD_LINK } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import ProductPriorityPopup from "../Create-New-Product-Mapping/components/ProductPriorityPopup";
import { Button } from "@mui/material";
import EditDatesAndPriorityPopup from "../Create-New-Product-Mapping/components/EditDatesAndPriorityPopup";
import { Button as IAButton } from "impact-ui";
import UploadHandler from "core/commonComponents/uploadHandler";
import { addSnack } from "core/actions/snackbarActions";
import { PRODUCT_SUPERSESSION_FILE_UPLOAD_INSTRUCTIONS } from "core/pages/store-grouping/grouping-contants/stringConstants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import FileUploadIcon from "@mui/icons-material/FileUpload";


const ProductSupersessionDashboard = forwardRef((props, ref) => {
  const globalClasses = globalStyles();
  const agGridInstance = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const validationHandler = useRef();
  const classes = useStyles();


  const [render, setRender] = useState(false);
  const [
    productsSupersessionSummaryColumnConfig,
    setProductsSupersessionSummaryColumnConfig,
  ] = useState([]);
  const [sizeMappingData, setSizeMappingData] = useState(null);
  const [
    openProductMappingViewOnlyDialog,
    setOpenProductMappingViewOnlyDialog,
  ] = useState(false);
  const [enableReportDownload, setEnableReportDownload] =
    useState(true);
  const [reqBodyForDownload, setRequestBody] = useState({});
  const [tableMetaData, setTableMetaData] = useState({});
  const [
    isPriorityMappingDialogActive,
    setIsPriorityMappingDialogActive,
  ] = useState(false);
  const [clickedPriorityData, setClickedPriorityData] = useState(null);

  const { inventorysmart_configuration } =
  props.inventorysmartScreenConfig || {};
  const { supersession } = inventorysmart_configuration || {};
  const { disableDetailsEdit } = supersession || {};

  useImperativeHandle(ref, () => ({
    refreshDashboardData: () => {
      refreshDashboardTableData();
    },
  }));

  const openProductMappingViewOnlyPopUp = () => {
    setOpenProductMappingViewOnlyDialog(true);
  };

  const closeProductMappingViewOnlyPopUp = () => {
    setSizeMappingData(null);
    setOpenProductMappingViewOnlyDialog(false);
  };

  const editSKULevelMapping = () => {
    closeProductMappingViewOnlyPopUp();
    props.editSKULevelMapping(true);
  };

  const onProductivityPriorityPopupOpen = () => {
    setIsPriorityMappingDialogActive(true);
  };

  const onProductivityPriorityPopupClose = () => {
    setIsPriorityMappingDialogActive(false);
  };

  const editPriorityMapping = () => {
    onProductivityPriorityPopupClose();
  };

  const updatePriorityMapping = (updatedPriority) => {};

  const toggleReviewSKULevelMappingPopup = (data) => {
    setSizeMappingData(data);
    openProductMappingViewOnlyPopUp();
  };

  const toggleAddPriorityPopup = (data, col_name, colDef) => {
    setClickedPriorityData(data);
    setIsPriorityMappingDialogActive(true);
  };

  const reviewSKULevelMappingActionMap = {
    mapped_sizes: toggleReviewSKULevelMappingPopup,
    priority: toggleAddPriorityPopup,
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    props.setSelectedProductMappings([...selections]);
  };

  const formatProductSupersessionSummary = (data) => {
    const formattedData = data?.map((mapping, index) => {
      const sizesLength = mapping?.new_sizes?.length;

      mapping.mapped_sizes = sizesLength;
      mapping.index = index;
      mapping.new_product_code = [...mapping.new_product_codes];
      mapping.old_product_code = [...mapping.old_product_codes];
      mapping.new_size = [...mapping.new_sizes];
      mapping.old_size = [...mapping.old_sizes];

      if (
        props.inventorysmartScreenConfig?.inventorysmart_configuration
          ?.supersession?.priorityPopup
      ) {
        mapping.priority = "View Priority";
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

      let formattedColumns = agGridColumnFormatter(
        response?.data?.data,
        null,
        reviewSKULevelMappingActionMap
      );
      setProductsSupersessionSummaryColumnConfig(formattedColumns);
      setRender(true);
    } finally {
      props.setInventorysmartProductSupersessionTableLoader(false);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setTableMetaData(manualbody);

    try {
      props.setInventorysmartProductSupersessionSummaryLoader(true);

      let body = {
        filters: props.selectedFilters?.filter(
          (filterItem) => filterItem?.values?.length > 0
        ),
        meta: {
          ...manualbody,
          limit: { limit: CACHE_BLOCKSIZE_STRATEGY, page: pageIndex + 1 },
        },
      };
      setRequestBody(body);
      let response = await props.getProductSupersessionSummaryData(body);
      let mappedProductSupersessionSummary = formatProductSupersessionSummary(
        response?.data?.data
      );
      let formattedData = agGridRowFormatter(
        mappedProductSupersessionSummary,
        params?.api?.checkConfiguration,
        "index"
      );
      setEnableReportDownload(pageIndex == 0 && !formattedData?.length)
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
      meta: { ...tableMetaData },
    };

    return payload;
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const refreshDashboardTableData = () => {
    setRender(false);

    props.setSelectedProductMappings([]);

    fetchProductSupersessionSummaryTableConfig();
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      refreshDashboardTableData();
    }
  }, [props.selectedFilters]);


  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await props.uploadSupeSessionFile(formData);
      props.addSnack({
        message:
          res.message || "Please wait for notification to be received shortly",
        options: {
          variant: "success",
        },
      });
      setIsModalOpen(false);
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        props.addSnack({
          message: error?.data?.message || "Something went wrong.",
          options: {
            variant: "error",
          },
        });
        validationHandler.current.validate([]);
      }
    }
  }

  return (
    <div className={globalClasses.marginVertical1rem}>
      <CustomAccordion label="Details">
        <Loader
          loader={
            props.inventorysmartProductSupersessionTableLoader ||
            props.inventorysmartProductSupersessionSummaryLoader
          }
          minHeight={"188px"}
        >
          <div
            className={classNames(
              globalClasses.layoutAlignEnd,
              globalClasses.marginBottom
            )}
          >
            {props.inventorysmartScreenConfig?.super_session_upload && (
              <div className={classes.supersessionUploadButton}>
                <IAButton
                  variant="primary"
                  id="uploadConstraints"
                  onClick={() => setIsModalOpen(true)}
                  icon={FileUploadIcon}
                />
                <UploadHandler
                  handleUpload={handleUpload}
                  isModalOpen={isModalOpen}
                  setIsModalOpen={setIsModalOpen}
                  attachCallBacks={attachCallBacks}
                  jsonUpload={false}
                  macroIdPath={"product_supersession_vba_template"}
                  uploadInstructions={[
                    ...PRODUCT_SUPERSESSION_FILE_UPLOAD_INSTRUCTIONS,
                  ]}
                />
              </div>
            )}
          <DownloadButton
            url={SUPERSESSION_DOWNLOAD_LINK}
            requestBody={getDownloadRequestBody()}
            disable={
              props.inventorysmartProductSupersessionSummaryLoader ||
              enableReportDownload
            }
            includeExclusionFilter={props.includeExclusionFilter}
            excludeURLObject={props.excludeURLObject}
            columns={productsSupersessionSummaryColumnConfig}
            isCustomDownloadCheckRequired={true}
            customDownloadCheckAPI={props.supersessionCheckDownload}
          />
          </div>

          {render && (
            <AgGridComponent
              columns={productsSupersessionSummaryColumnConfig}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              uniqueRowId={"old_article"}
              selectAllHeaderComponent
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              cacheBlockSize={CACHE_BLOCKSIZE_STRATEGY}
              onSelectionChanged={onSelectionChanged}
              loadTableInstance={loadAlertsTableInstance}
              pagination={true}
            />
          )}
        </Loader>
      </CustomAccordion>

      <ReviewSKULevelMappingViewPopup
        active={openProductMappingViewOnlyDialog}
        openModal={openProductMappingViewOnlyPopUp}
        closeModal={closeProductMappingViewOnlyPopUp}
        sizeMappingData={sizeMappingData}
        editSKULevelMapping={editSKULevelMapping}
        isViewOnly={disableDetailsEdit}
      />

      <ProductPriorityPopup
        active={clickedPriorityData && isPriorityMappingDialogActive}
        openModal={onProductivityPriorityPopupOpen}
        closeModal={onProductivityPriorityPopupClose}
        editSKULevelMapping={editPriorityMapping}
        clickedPriorityData={clickedPriorityData}
        updatePriorityMapping={updatePriorityMapping}
        isEditAllowed={false}
        parentAgGridInstance={agGridInstance}
      />
    </div>
  );
});

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
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
  supersessionCheckDownload: (screenName, body) =>
    dispatch(supersessionCheckDownload(screenName, body)),
    addSnack: (payload) => dispatch(addSnack(payload)),
  uploadSupeSessionFile: (payload) =>
    dispatch(uploadSupeSessionFile(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(ProductSupersessionDashboard);
