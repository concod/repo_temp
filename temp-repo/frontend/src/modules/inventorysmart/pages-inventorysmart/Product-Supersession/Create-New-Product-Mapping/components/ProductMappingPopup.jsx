import React, { useState, useEffect, useMemo } from "react";
import { connect } from "react-redux";
import classnames from "classnames";

import { Dialog, DialogContent, Typography } from "@mui/material";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
  tableArticleFilter,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Button } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";

import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getProductMappingData,
  setInventorysmartCreateMappingPopupDataLoader,
  setInventorysmartCreateMappingPopupTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import { getProductSupersessionSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import { formatStringDate } from "core/Utils/functions/utils";
import moment from "moment";

const ProductMappingPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const currentDate = moment();
  const defaultDate = formatStringDate(currentDate, false, true)
    .add(1, "day")
    .format("MM-DD-YYYY");

  const [render, setRender] = useState(false);
  const [formData, setFormData] = useState({});
  const [
    productMappingPopupTableColumns,
    setProductMappingPopupTableColumns,
  ] = useState([]);
  const [selectedProductMappings, setSelectedProductMappings] = useState([]);

  const manualCallBack = async (manualbody, pageIndex) => {
    try {
      props.setInventorysmartCreateMappingPopupDataLoader(true);
      let excludedArticleFilter = tableArticleFilter;
      excludedArticleFilter.operator = "not in";

      const articlesToBeExcluded = [];

      props?.editedMapping?.forEach((mapping) => {
        const oldArticle = mapping.article;

        if (articlesToBeExcluded.indexOf(oldArticle) === -1) {
          articlesToBeExcluded.push(oldArticle);
        }
      });

      excludedArticleFilter.values = [...articlesToBeExcluded];

      let selectedFilters = props.selectedFilters;

      if (excludedArticleFilter?.values?.length) {
        selectedFilters = [...selectedFilters, excludedArticleFilter];
      }

      let body = {
        filters: selectedFilters?.filter(
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
  };

  const handleChange = (data) => {
    // this has to be handled in form/index.js in future
    setFormData(data);
  };

  const getRowStyle = (params) => {
    if (params?.data?.article && !params?.data?.new_eligible) {
      return { background: "rgb(217, 219, 222, 0.5)", pointerEvents: "none" };
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

  return props.active ? (
    <Dialog
      id="storeInventoryDialog"
      aria-labelledby="store-invenotry-dialog"
      open={props.active}
      maxWidth="md"
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.closeModal();
      }}
      classes={{
        paperFullWidth: classes.paperFullWidth,
      }}
    >
      <DialogContent
        dividers
        classes={{
          root: classnames(
            classes.dialogContentRoot,
            globalClasses.flexRow,
            globalClasses.layoutAlignBetweenCenter
          ),
        }}
      >
        <Typography classes={{ root: globalClasses.moduleTitle }}>
          Edit Mapping
        </Typography>
        <IconButton color="primary" onClick={props.closeModal} size="large">
          <CloseIcon fontSize="medium" />
        </IconButton>
      </DialogContent>
      <DialogContent
        dividers
        classes={{
          root: globalClasses.dialogContentBody,
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

              <AgGridComponent
                columns={productMappingPopupTableColumns}
                manualCallBack={(body, pageIndex) =>
                  manualCallBack(body, pageIndex)
                }
                uniqueRowId={"index"}
                selectAllHeaderComponent
                hideHeaderCheckboxComponent
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={CACHE_BLOCKSIZE_STRATEGY}
                rowSelection="single"
                getRowStyle={getRowStyle}
                onSelectionChanged={onSelectionChanged}
              />
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
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  disabled={!selectedProductMappings?.length}
                  onClick={() => {
                    props.updateProductMapping(
                      selectedProductMappings[0],
                      formData?.effective_date || defaultDate
                    );
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </Loader>
      </DialogContent>
    </Dialog>
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
