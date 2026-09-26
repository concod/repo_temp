import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import classnames from "classnames";

import { Button, Grid } from "@mui/material";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { getProductSupersessionSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import {
  getProductMappingData,
  setInventorysmartCreateMappingDataLoader,
  setInventorysmartCreateMappingTableLoader,
  setInventorysmartCreateProducMappingEditedConfiguration,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import ProductMappingPopup from "./ProductMappingPopup";
import { setModifiedProductMapping } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-review-mapping-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { formatStringDate } from "core/Utils/functions/utils";
import moment from "moment";

const ProductMappingTable = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const agGridInstance = useRef(null);
  const selectedProductsMappings = useRef([]);
  const modifiedProductsMappings = useRef([]);
  const selectedNewProductMapping = useRef(null);
  const currentDate = moment();
  const defaultDate = formatStringDate(currentDate, false, true).add(1, "day");

  const [render, setRender] = useState(false);
  const [disableReviewButton, setDisableReviewButton] = useState(true);
  const [productMappingColumnConfig, setProductMappingColumnConfig] = useState(
    []
  );
  const [selectedProductMappings, setSelectedProductMappings] = useState([]);
  const [openProductMappingDialog, setOpenProductMappingDialog] = useState(
    false
  );

  const canReviewProductMapping = () => {
    let filtered = [];

    modifiedProductsMappings?.current?.forEach((item) => {
      const rowData = item;

      if (rowData?.is_edited) {
        filtered.push(rowData);
      }
    });

    agGridInstance?.current?.api?.forEachNode((item) => {
      const rowData = item.data;

      if (rowData?.is_edited) {
        filtered.push(rowData);
      }
    });

    setDisableReviewButton(filtered.length === 0);
  };

  const isSelectedArticle = (selections, mapping) => {
    let selectionIndex = -1;
    const selectedArticle = selections.find((product, index) => {
      if (product?.article === mapping?.article) {
        selectionIndex = index;
      }
      return product?.article === mapping?.article;
    });
    return { data: selectedArticle, dataIndex: selectionIndex };
  };

  const isEligibleForFurtherMapping = (articleData) => {
    if (articleData.article && articleData.new_article) {
      return true;
    }

    const mappedNewProducts = modifiedProductsMappings?.current?.filter(
      (mappings) => {
        return mappings?.new_article === articleData.article;
      }
    );

    return mappedNewProducts?.length === 0;
  };

  const saveEditedMapping = async (mappingsToBeSaved) => {
    const filteredMappings = [];
    mappingsToBeSaved.forEach((mapping) => {
      const selection = isSelectedArticle(
        modifiedProductsMappings.current,
        mapping
      );
      if (!selection.data) {
        filteredMappings.push(mapping);
      } else if (selection.data) {
        modifiedProductsMappings.current[selection.dataIndex] = mapping;
      }
    });

    modifiedProductsMappings.current = [
      ...modifiedProductsMappings.current,
      ...filteredMappings,
    ];

    await agGridInstance.current?.api?.redrawRows();
  };

  const formatProductMappingData = ({
    data,
    isNewDataKeysRequired,
    newMappedProduct,
    oldEditedProducts,
  }) => {
    const selections = agGridInstance?.current?.api?.getSelectedRows();
    const dataKeys = Object.keys(data?.[0]);
    const mappedProducts = [];
    const formattedData = data?.map((mapping, index) => {
      mapping.index = index;

      if (isNewDataKeysRequired) {
        const selection = isSelectedArticle(selections, mapping);
        dataKeys?.forEach((key) => {
          if (newMappedProduct && selection?.data) {
            mapping[`new_${key}`] = newMappedProduct[key];
            mapping.is_edited = true;
            setDisableReviewButton(false);
            mappedProducts.push(mapping);
          } else {
            mapping[`new_${key}`] = null;
          }
        });
      }

      if (
        oldEditedProducts?.length &&
        isSelectedArticle(oldEditedProducts, mapping)?.data
      ) {
        const selected = isSelectedArticle(oldEditedProducts, mapping);
        mapping = { ...selected.data };
        setDisableReviewButton(false);
      }

      if (!mapping.effective_date) {
        mapping.effective_date = defaultDate.format("MM-DD-YYYY");
      }
      return mapping;
    });

    saveEditedMapping(mappedProducts);
    setSelectedProductMappings([...selections]);
    return formattedData;
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedProductMappings([...selections]);
    selectedProductsMappings.current = [...selections];
  };

  const onDeleteMapping = async (data) => {
    data.is_edited = false;
    data.effective_date = defaultDate.format("MM-DD-YYYY");

    let modifiedProductsMappingsIndex = -1;
    const keys = Object.keys(data);
    keys.forEach((key) => {
      if (key.includes("new")) {
        data[key] = null;
      }
    });

    modifiedProductsMappings?.current?.forEach((mapping, index) => {
      if (mapping.article === data.article) {
        modifiedProductsMappingsIndex = index;
      }
    });

    modifiedProductsMappings?.current?.splice(modifiedProductsMappingsIndex, 1);
    await agGridInstance.current?.api?.refreshCells({
      force: true,
      update: data,
    });
    await agGridInstance.current?.api?.redrawRows();
  };

  const openProductMappingPopUp = () => {
    setOpenProductMappingDialog(true);
  };

  const closeProductMappingPopUp = () => {
    setOpenProductMappingDialog(false);
  };

  const toggleProductMappingPopup = () => {
    openProductMappingPopUp();
  };

  const updateProductMapping = async (mappedProduct, effectiveDate) => {
    if (mappedProduct) {
      const mappingKeys = Object.keys(mappedProduct);

      const selectedMappings = selectedProductMappings?.length
        ? selectedProductMappings
        : selectedProductsMappings?.current;

      selectedMappings?.forEach((mapping) => {
        mappingKeys.forEach((key) => {
          if (mappedProduct[key]) {
            mapping[`new_${key}`] = mappedProduct[key];
          }

          if (effectiveDate) {
            const date = moment(effectiveDate);
            mapping.effective_date = formatStringDate(
              date,
              false,
              false,
              "MM-DD-YYYY"
            );
          }
        });

        mapping.is_edited = true;
      });

      await agGridInstance.current?.api?.refreshCells({
        force: true,
        update: selectedMappings,
      });
      setSelectedProductMappings(selectedMappings);
      selectedProductsMappings.current = selectedMappings;
      selectedNewProductMapping.current = mappedProduct;
      saveEditedMapping(selectedMappings);
      canReviewProductMapping();
      closeProductMappingPopUp();
    }
  };

  const saveProductMapping = () => {
    const filtered = [];
    modifiedProductsMappings?.current?.forEach((item) => {
      const rowData = item;

      if (rowData?.is_edited) {
        filtered.push(rowData);
      }
    });

    props.setInventorysmartCreateProducMappingEditedConfiguration(filtered);
    props.setModifiedProductMapping(filtered);
    props.reviewSKULevelMapping();
  };

  const fetchProductMappingTableConfig = async () => {
    try {
      props.setInventorysmartCreateMappingTableLoader(true);
      const payload = {
        tableConfigName: "product-supersession-mapping",
      };
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );
      const columns = response?.data?.data?.map((column) => {
        if (column.type === "datetime") {
          column.minDate = defaultDate;
          column.defaultValue = new Date(defaultDate);
        }

        return column;
      });
      let formattedColumns = agGridColumnFormatter(columns);
      setProductMappingColumnConfig(formattedColumns);
      setRender(true);
    } finally {
      props.setInventorysmartCreateMappingTableLoader(false);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setInventorysmartCreateMappingDataLoader(true);
      let body = {
        filters: props.selectedFilters?.filter(
          (filterItem) => filterItem?.values?.length > 0
        ),
        meta: {
          ...manualbody,
          limit: { limit: CACHE_BLOCKSIZE_STRATEGY, page: pageIndex + 1 },
        },
      };

      let response = await props.getProductMappingData(body);
      let responseFormattingParams = {
        data: response?.data?.data,
        isNewDataKeysRequired: true,
        newMappedProduct: selectedNewProductMapping?.current,
        oldEditedProducts:
          (props.isRedirectedFromDifferentPage ||
            modifiedProductsMappings?.current?.length) &&
          pageIndex === 0 &&
          modifiedProductsMappings?.current,
      };
      let mappedProductMappingSummary = formatProductMappingData(
        responseFormattingParams
      );
      let formattedData = agGridRowFormatter(
        mappedProductMappingSummary,
        params?.api?.checkConfiguration,
        "index"
      );
      return { data: formattedData };
    } catch {
      return defaultTableData;
    } finally {
      props.setInventorysmartCreateMappingDataLoader(false);
    }
  };

  const getRowStyle = (params) => {
    if (
      params?.data?.article &&
      (!isEligibleForFurtherMapping(params?.data) ||
        !params?.data?.old_eligible)
    ) {
      if (params.node.selected) {
        params.node.selected = false;

        let selections = [...selectedProductsMappings.current];
        let selectedIndex = -1;
        selections.forEach((selectedMappings, index) => {
          if (selectedMappings.article === params?.data?.article) {
            selectedIndex = index;
          }
        });

        selections.splice(selectedIndex, 1);
        setSelectedProductMappings([...selections]);
        selectedProductsMappings.current = [...selections];
      }
      return { background: "rgb(217, 219, 222, 0.5)", pointerEvents: "none" };
    }
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setRender(false);
      if (props.isRedirectedFromDifferentPage) {
        saveEditedMapping(
          props.inventorysmartCreateProducMappingEditedConfiguration
        );
      }
      fetchProductMappingTableConfig();
    }
  }, [props.selectedFilters]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <Grid
        container
        columnSpacing={2}
        direction="row"
        justifyContent="flex-end"
      >
        <Grid item>
          <Button
            id="create-product-profile"
            onClick={() => toggleProductMappingPopup()}
            color="primary"
            variant="contained"
            size="medium"
            className={globalClasses.marginVertical1rem}
            disabled={
              !props.canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_SUPERSESSION_DASHBOARD,
                "edit"
              ) || selectedProductMappings?.length === 0
            }
          >
            Map New Materials
          </Button>
        </Grid>
      </Grid>
      <CustomAccordion label="Details">
        <Loader
          loader={
            props.inventorysmartCreateMappingTableLoader ||
            props.inventorysmartCreateMappingDataLoader
          }
          minHeight={"188px"}
        >
          {render && (
            <AgGridComponent
              columns={productMappingColumnConfig}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              uniqueRowId={"index"}
              selectAllHeaderComponent
              hideHeaderCheckboxComponent
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              cacheBlockSize={CACHE_BLOCKSIZE_STRATEGY}
              onSelectionChanged={onSelectionChanged}
              loadTableInstance={loadAlertsTableInstance}
              callDeleteApi={(tableInfo) => onDeleteMapping(tableInfo.data)}
              getRowStyle={getRowStyle}
              pagination={true}
            />
          )}
        </Loader>
        <div
          className={classnames(
            classes.buttonGroupWrapper,
            globalClasses.marginAround
          )}
        >
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            disabled={disableReviewButton}
            onClick={() => saveProductMapping()}
          >
            Save Mapping
          </Button>
        </div>
      </CustomAccordion>

      <ProductMappingPopup
        active={openProductMappingDialog}
        openModal={openProductMappingPopUp}
        closeModal={closeProductMappingPopUp}
        editedMapping={modifiedProductsMappings?.current}
        formatProductMappingData={formatProductMappingData}
        updateProductMapping={updateProductMapping}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService.selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartCreateMappingTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateMappingTableLoader,
    inventorysmartCreateMappingDataLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateMappingDataLoader,
    inventorysmartCreateProducMappingEditedConfiguration:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateProducMappingEditedConfiguration,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartCreateMappingDataLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingDataLoader(payload)),
  setInventorysmartCreateMappingTableLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingTableLoader(payload)),
  setInventorysmartCreateProducMappingEditedConfiguration: (payload) =>
    dispatch(setInventorysmartCreateProducMappingEditedConfiguration(payload)),
  setModifiedProductMapping: (payload) =>
    dispatch(setModifiedProductMapping(payload)),
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
  getProductMappingData: (payload) => dispatch(getProductMappingData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductMappingTable);
