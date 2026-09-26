import React, { useState, useEffect, useMemo, useRef } from "react";
import { connect } from "react-redux";
import classnames from "classnames";
import { Dialog, DialogContent, Typography } from "@mui/material";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
  tableArticleFilter,
  TENANT_DATE_FORMAT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getProductMappingData,
  setInventorysmartCreateMappingPopupDataLoader,
  setInventorysmartCreateMappingPopupTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import { getProductSupersessionSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import { formatStringDate } from "core/Utils/functions/utils";
import moment from "moment";
import { isEmpty } from "lodash";
import { Modal } from "impact-ui-v3";

const ProductMappingPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const currentDate = moment();
  const defaultDate = formatStringDate(currentDate, false, true)
    .add(1, "day")
    .format(TENANT_DATE_FORMAT);

  const [render, setRender] = useState(false);
  const [formData, setFormData] = useState({});
  const [
    productMappingPopupTableColumns,
    setProductMappingPopupTableColumns,
  ] = useState([]);
  const [selectedProductMappings, setSelectedProductMappings] = useState([]);
  const selectedProductsMappingsRef = useRef(null);
  const [hideEffectiveDate, setHideEffectiveDate] = useState(false);

  useEffect(() => {
    if (props?.inventorysmart_product_supersession_v3) {
      setHideEffectiveDate(true);
    }
  }, [props?.inventorysmart_product_supersession_v3]);

  const manualCallBack = async (manualbody, pageIndex) => {
    try {
      props.setInventorysmartCreateMappingPopupDataLoader(true);

      let selectedFilters = props.selectedFilters;

      let excludedArticleFilter = {};
      let mappingKey = "article";

      excludedArticleFilter = JSON.parse(JSON.stringify(tableArticleFilter));
      mappingKey = "article";

      excludedArticleFilter.operator = "not in";
      let articlesToBeExcluded = [];
      props?.editedMapping?.forEach((mapping) => {
        let oldArticle = mapping[mappingKey];

        if (articlesToBeExcluded.indexOf(oldArticle) === -1) {
          articlesToBeExcluded.push(oldArticle);
        }
      });

      excludedArticleFilter.values = [...articlesToBeExcluded];
      if (excludedArticleFilter?.values?.length) {
        selectedFilters = [...selectedFilters, excludedArticleFilter];
      }

      let body = {
        filters: props.selectedFilters?.filter((filterItem) => {
          if (props.inventorysmart_product_supersession_v3) {
            return (
              filterItem?.values?.length > 0 &&
              (filterItem?.dimension === "new_sku" ||
                props.productSupersessionModuleConfig?.includeAllFilters)
            );
          } else {
            return filterItem?.values?.length > 0;
          }
        }),
        meta: {
          ...manualbody,
          limit: { limit: CACHE_BLOCKSIZE_STRATEGY, page: pageIndex + 1 },
        },
      };

      let response = await props.getProductMappingData(body);
      let responseFormattingParams = {
        data: response?.data?.data,
      };
      let mappedProductSupersessionSummary = props.formatProductMappingData(
        responseFormattingParams
      );
      return { data: mappedProductSupersessionSummary };
    } catch {
      return defaultTableData;
    } finally {
      props.setInventorysmartCreateMappingPopupDataLoader(false);
    }
  };

  const fetchProductMappingPopupTableConfig = async () => {
    try {
      props.setInventorysmartCreateMappingPopupTableLoader(true);
      const payload = {
        tableConfigName: "product-supersession-mapping_pop_up",
      };
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );

      let formattedColumns = agGridColumnFormatter(response?.data?.data);
      setProductMappingPopupTableColumns(formattedColumns);
      setRender(true);
    } finally {
      props.setInventorysmartCreateMappingPopupTableLoader(false);
    }
  };

  const resetProductMappingPopupData = () => {
    setProductMappingPopupTableColumns([]);
    setFormData({});
    setRender(false);
    selectedProductsMappingsRef.current = null;
  };

  useEffect(() => {
    if (props.active) {
      fetchProductMappingPopupTableConfig();
    } else {
      resetProductMappingPopupData();
    }
  }, [props.active]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedProductMappings([...selections]);
    // Since this is a single-selection grid, we only need to store the selected row
    selectedProductsMappingsRef.current = selections.length > 0 ? selections[0] : null;
  };

  const handleChange = (data) => {
    // this has to be handled in form/index.js in future
    setFormData(data);
  };

  const getRowStyle = (params) => {
    if (params?.data?.article && !params?.data?.new_eligible) {
      return { background: "rgb(217, 219, 222, 0.5)", pointerEvents: "none" };
    }
    if(params?.data?.article){
      if(props?.selectedProductMappings?.some((mapping) => mapping?.article === params?.data?.article)){
        return { background: "rgb(217, 219, 222, 0.5)", pointerEvents: "none" };
      }
    }
  };

  const PRODUCT_SUPERSESSION_SET_ALL_FIELDS = useMemo(
    () => [
      {
        label: "Effective Date",
        is_disabled: false,
        accessor: "effective_date",
        field_type: "DateTimeField",
        isMulti: false,
        minDate: defaultDate,
      },
    ],
    []
  );

  const getPreviousSelectedNode = (params) => {
    const lastSelectedArticleForMapping = !isEmpty(props?.editedMapping)
      ? props?.editedMapping[0]?.new_article
      : null;
    params?.api?.forEachNode((node) => {
      // Select if node matches lastSelectedArticleForMapping OR matches the current selection
      if (node?.data?.article === lastSelectedArticleForMapping || 
          selectedProductsMappingsRef?.current?.article === node?.data?.article) {
        node.setSelected(true);
      } else {
        node.setSelected(false);
      }
    });
  };
  return props.active ? (
    <Modal
      id="storeInventoryDialog"
      open={props.active}
      fullWidth={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.closeModal();
      }}
      onSecondaryButtonClick={() => props.closeModal()}
      secondaryButtonLabel="Cancel"
      size="medium"
      title="Edit Mapping"
      primaryButtonLabel="Save"
      primaryButtonProps={{
        disabled: !selectedProductMappings?.length,
      }}
      onPrimaryButtonClick={() => {
        props.updateProductMapping(
          selectedProductMappings[0],
          formData?.effective_date || defaultDate
        );
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
            {!hideEffectiveDate && (
              <div className={globalClasses.marginBottom}>
                <Form
                  maxFieldsInRow={3}
                  layout={"vertical"}
                  handleChange={handleChange}
                  fields={PRODUCT_SUPERSESSION_SET_ALL_FIELDS}
                  updateDefaultValue={true}
                  defaultValues={{
                    effective_date: defaultDate,
                  }}
                ></Form>
              </div>
            )}

            <AgGridComponent
              columns={productMappingPopupTableColumns}
              manualCallBack={(body, pageIndex) =>
                manualCallBack(body, pageIndex)
              }
              uniqueRowId={"article"}
              selectAllHeaderComponent
              hideHeaderCheckboxComponent
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={CACHE_BLOCKSIZE_STRATEGY}
              rowSelection="single"
              getRowStyle={getRowStyle}
              onSelectionChanged={onSelectionChanged}
              callOnModelUpdated={(params) => getPreviousSelectedNode(params)}
            />
          </div>
        )}
      </Loader>
    </Modal>
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
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    productSupersessionModuleConfig:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .productSupersessionModuleConfig,
    inventorysmart_product_supersession_v3:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        ?.productSupersessionModuleConfig?.inventorysmart_product_supersession_v3,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
  getProductMappingData: (payload) => dispatch(getProductMappingData(payload)),
  setInventorysmartCreateMappingPopupTableLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingPopupTableLoader(payload)),
  setInventorysmartCreateMappingPopupDataLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingPopupDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductMappingPopup);
