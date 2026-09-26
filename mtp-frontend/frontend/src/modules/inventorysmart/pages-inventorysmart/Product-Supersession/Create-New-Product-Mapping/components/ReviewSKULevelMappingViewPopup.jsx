import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import classnames from "classnames";
import { Button } from "@mui/material";
import { Dialog, DialogContent, Typography } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import { setInventorysmartReviewSizeMappingTableLoader } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-review-mapping-service";
import { getProductSupersessionSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import { cloneDeep, isEmpty } from "lodash";
import { fillArrayWithSameValue } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";

const ReviewSKULevelMappingView = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const agGridInstance = useRef(null);
  const productCodeOptionsRef = useRef({});
  const { isViewOnly } = props;

  const [
    productsMappingReviewPopupColumnConfig,
    setProductsMappingReviewPopupColumnConfig,
  ] = useState([]);
  const [
    productsMappingReviewPopupData,
    setProductsMappingReviewPopupData,
  ] = useState([]);

  const fetchProductMappingPopupData = async () => {
    try {
      let count = 0;
      const data = [];
      const productMapping = {};

      const unMappedNewProductCodes =
        props?.sizeMappingData?.new_product_code_all?.filter(
          (newProductCode) => {
            return (
              props?.sizeMappingData?.new_product_code?.indexOf(
                newProductCode
              ) === -1
            );
          }
        ) || [];

      const unMappedOldProductCode =
        props?.sizeMappingData?.old_product_code_all?.filter(
          (oldProductCode) => {
            return (
              props?.sizeMappingData?.old_product_code?.indexOf(
                oldProductCode
              ) === -1
            );
          }
        ) || [];

      props?.sizeMappingData?.new_product_code?.forEach(
        (productCode, index) => {
          if (!productMapping?.[productCode]) {
            productMapping[productCode] = {
              old_product_codes: null,
              old_size_codes: null,
              old_size_names: null,
            };
            productMapping[productCode].old_product_codes = [
              props?.sizeMappingData?.old_product_code?.[index],
            ];
            productMapping[productCode].old_size_codes = [
              props?.sizeMappingData?.old_size?.[index],
            ];
            productMapping[productCode].old_size_names = [
              props?.sizeMappingData?.old_size_name
                ? props?.sizeMappingData?.old_size_name?.[index]
                : props?.sizeMappingData?.old_size_names?.[index],
            ];
          } else {
            productMapping[productCode]?.old_product_codes.push(
              props?.sizeMappingData?.old_product_code?.[index]
            );
            productMapping[productCode]?.old_size_codes.push(
              props?.sizeMappingData?.old_size?.[index]
            );
            productMapping[productCode].old_size_names.push(
              props?.sizeMappingData?.old_size_name
                ? props?.sizeMappingData?.old_size_name?.[index]
                : props?.sizeMappingData?.old_size_names?.[index]
            );
          }
        }
      );

      Object.keys(productMapping)?.forEach((productCode, index) => {
        const newProductCodeIndex = props?.sizeMappingData?.new_product_code_all
          ? props?.sizeMappingData?.new_product_code_all?.indexOf(productCode)
          : props?.sizeMappingData?.new_product_code?.indexOf(productCode); 
        const newSize = props?.sizeMappingData?.new_size_all
          ? props?.sizeMappingData?.new_size_all?.[newProductCodeIndex]
          : props?.sizeMappingData?.new_size?.[newProductCodeIndex];
        const newSizeName = props?.sizeMappingData?.new_size_names
          ? props?.sizeMappingData?.new_size_names?.[newProductCodeIndex]
          : props?.sizeMappingData?.new_size_name_all?.[newProductCodeIndex];

        const mapping = {
          index: count,
          new_product_code: productCode,
          new_article: props?.sizeMappingData?.new_article,
          new_style_size: newSize,
          new_size_name: newSizeName,
          old_product_code: productMapping?.[productCode]?.old_product_codes,
          old_style_size: productMapping?.[productCode]?.old_size_codes,
          old_size_name: productMapping?.[productCode]?.old_size_names,
          old_article: props?.sizeMappingData?.old_article,
        };

        count++;
        data.push(mapping);
      });

      unMappedNewProductCodes?.forEach((newProductCode) => {
        const newProductCodeIndex = props?.sizeMappingData?.new_product_code_all
          ? props?.sizeMappingData?.new_product_code_all?.indexOf(
              newProductCode
            )
          : props?.sizeMappingData?.new_product_code?.indexOf(newProductCode);
        const newSize = props?.sizeMappingData?.new_size_all
          ? props?.sizeMappingData?.new_size_all?.[newProductCodeIndex]
          : props?.sizeMappingData?.new_size?.[newProductCodeIndex];

        const newSizeName =
          props?.sizeMappingData?.new_size_name_all?.[newProductCodeIndex];
        const mapping = {
          index: count,
          new_product_code: newProductCode,
          new_style_size: newSize,
          new_size_name: newSizeName,
          new_article: props?.sizeMappingData?.new_article,
          old_product_code: "-",
          old_style_size: "-",
          old_size_name: "-",
          old_article: props?.sizeMappingData?.old_article,
        };

        count++;
        data.push(mapping);
      });

      unMappedOldProductCode?.forEach((oldProductCode) => {
        const oldProductCodeIndex = props?.sizeMappingData?.old_product_code_all?.indexOf(
          oldProductCode
        );
        const oldSize =
          props?.sizeMappingData?.old_size_all?.[oldProductCodeIndex];
        const oldSizeName =
        props?.sizeMappingData?.old_size_name_all
        ? props?.sizeMappingData?.old_size_name_all?.[oldProductCodeIndex]
        : props?.sizeMappingData?.old_size_name?.[oldProductCodeIndex];
        const mapping = {
          index: count,
          old_product_code: oldProductCode,
          old_style_size: oldSize,
          old_size_name: oldSizeName,
          old_article: props?.sizeMappingData?.old_article,
          new_product_code: "-",
          new_style_size: "-",
          new_size_name: "-",
          new_article: props?.sizeMappingData?.new_article,
        };

        count++;
        data.push(mapping);
      });

      setProductsMappingReviewPopupData(data);
    } finally {
    }
  };

  const fetchProductMappingPopupTableConfig = async () => {
    try {
      props.setInventorysmartReviewSizeMappingTableLoader(true);
      const payload = {
        tableConfigName: "product_supersession_size_mapping_view",
      };
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );

      let formattedColumns = agGridColumnFormatter(response?.data?.data);
      setProductsMappingReviewPopupColumnConfig(formattedColumns);
    } finally {
      props.setInventorysmartReviewSizeMappingTableLoader(false);
    }
  };

  const resetProductMappingPopupData = () => {
    setProductsMappingReviewPopupColumnConfig([]);
    setProductsMappingReviewPopupData([]);
    productCodeOptionsRef.current = {};
  };

  useEffect(() => {
    if (props.active && !isEmpty(props.sizeMappingData)) {
      fetchProductMappingPopupTableConfig();
      fetchProductMappingPopupData();
    } else {
      resetProductMappingPopupData();
    }
  }, [props.active, props.sizeMappingData]);

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  return props.active ? (
    <Dialog
      id="storeInventoryDialog"
      aria-labelledby="store-invenotry-dialog"
      open={props.active}
      maxWidth="lg"
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
          {isViewOnly ? "View Mapping" : "Edit Mapping"}
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
          loader={props.inventorysmartReviewSizeMappingTableLoader}
          minHeight={"350px"}
        >
          <AgGridComponent
            columns={productsMappingReviewPopupColumnConfig}
            rowdata={productsMappingReviewPopupData}
            uniqueRowId={"index"}
            pagination={false}
            loadTableInstance={loadAlertsTableInstance}
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
            {!isViewOnly &&
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              onClick={() => props.editSKULevelMapping()}
            >
              Edit Mapping
            </Button>
            }
          </div>
        </Loader>
      </DialogContent>
    </Dialog>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    inventorysmartReviewSizeMappingTableLoader:
      store.inventorysmartReducer
        ?.inventorySmartProductSupersessionReviewMappingService
          ?.inventorysmartReviewSizeMappingTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartReviewSizeMappingTableLoader: (payload) =>
    dispatch(setInventorysmartReviewSizeMappingTableLoader(payload)),
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewSKULevelMappingView);
