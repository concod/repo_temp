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

const ReviewSKULevelSizeMapping = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const agGridInstance = useRef(null);
  const productCodeOptionsRef = useRef({});

  const [
    productsMappingReviewPopupColumnConfig,
    setProductsMappingReviewPopupColumnConfig,
  ] = useState([]);
  const [
    productsMappingReviewPopupData,
    setProductsMappingReviewPopupData,
  ] = useState([]);

  const { inventorysmart_configuration } =
    props.inventorysmartScreenConfig || {};
  const { supersession } = inventorysmart_configuration || {};
  const { reviewSizeMapping } = supersession || {};
  const { showSizeInEditMappingPopup, keepDropdownEnabled } = reviewSizeMapping || {};

  const saveSizeMapping = () => {
    let mappedSizes = [];
    let newMappedSizes = [];
    let oldMappedSizes = [];
    let newMappedProductCodes = [];
    let oldMappedProductCodes = [];

    const productCodeMappings =
      productCodeOptionsRef?.current?.product_mappings;
    const sizeMappings = productCodeOptionsRef?.current?.size_mappings;

    Object.keys(productCodeMappings).forEach((productCode) => {
      const mappingSize = productCodeMappings?.[productCode]?.length;
      const newProductCodes = fillArrayWithSameValue(productCode, mappingSize);

      newMappedProductCodes = [...newMappedProductCodes, ...newProductCodes];
      oldMappedProductCodes = [
        ...oldMappedProductCodes,
        ...productCodeMappings?.[productCode],
      ];
    });

    Object.keys(sizeMappings).forEach((size) => {
      const mappingSize = sizeMappings?.[size]?.length;
      const newSizes = fillArrayWithSameValue(size, mappingSize);

      newMappedSizes = [...newMappedSizes, ...newSizes];
      oldMappedSizes = [...oldMappedSizes, ...sizeMappings?.[size]];
    });

    newMappedSizes.forEach((mappedSize, index) => {
      const mapping = `${oldMappedSizes[index]}-${mappedSize}`;
      mappedSizes.push(mapping);
    });

    let l_newSize = [],
      l_oldsize = [],
      l_newSizeName = [],
      l_oldsizeName = [];

    oldMappedProductCodes?.forEach((value, index) => {
      let l_oldMappedProductCodes = oldMappedProductCodes[index];
      if (l_oldMappedProductCodes) {
        let l_oldSizeFromProductCode = productsMappingReviewPopupData?.filter(
          (val) =>
            val.old_product_code
              ?.map((val) => val.value)
              ?.includes(l_oldMappedProductCodes)
        );
        let l_index = l_oldSizeFromProductCode[0]?.old_product_code
          ?.map((val) => val.value)
          ?.indexOf(l_oldMappedProductCodes);
        l_oldsize?.push(l_oldSizeFromProductCode[0]?.old_style_size[l_index]);
        l_oldsizeName?.push(
          l_oldSizeFromProductCode[0]?.old_style_size_name[l_index]
        );
      }
      let l_newMappedProductCodes = newMappedProductCodes[index];
      if (l_newMappedProductCodes) {
        let l_newSizeFromProductCode = productsMappingReviewPopupData?.filter(
          (val) => val.new_product_code == l_newMappedProductCodes
        );
        l_newSize?.push(l_newSizeFromProductCode[0]?.new_style_size);
        l_newSizeName?.push(l_newSizeFromProductCode[0]?.new_style_size_name);
      }
    });

    props.sizeMappingData.new_product_code = [...newMappedProductCodes];
    props.sizeMappingData.old_product_code = [...oldMappedProductCodes];
    props.sizeMappingData.new_size = [...l_newSize];
    props.sizeMappingData.old_size = [...l_oldsize];
    props.sizeMappingData.old_size_name = [...l_oldsizeName];
    props.sizeMappingData.new_size_name = [...l_newSizeName];
    props.sizeMappingData.mapped_sizes = newMappedProductCodes.length;
    props.agGridInstance?.current?.api?.refreshCells({
      update: props.sizeMappingData,
    });
    props.closeModal();
  };

  const formatSizeOptions = () => {
    const sizeOptions = {
      product_mappings: {},
      size_mappings: {},
      size_name_mappings: {},
      mappings: cloneDeep(props?.sizeMappingData?.old_product_code),
      new_all_sizes: cloneDeep(props?.sizeMappingData?.new_size_all),
      new_all_sizes_name: cloneDeep(props?.sizeMappingData?.new_size_name_all),
      old_all_sizes: cloneDeep(props?.sizeMappingData?.old_size_all),
      old_all_sizes_names: cloneDeep(props?.sizeMappingData?.old_size_name_all),
      new_all_product_codes: cloneDeep(
        props?.sizeMappingData?.new_product_code_all
      ),
      old_all_product_codes: cloneDeep(
        props?.sizeMappingData?.old_product_code_all
      ),
    };

    props?.sizeMappingData?.new_product_code?.forEach((product_code, index) => {
      const newSize = props?.sizeMappingData?.new_size?.[index];
      const oldSize = props?.sizeMappingData?.old_size?.[index];
      const newSizeName = props?.sizeMappingData?.new_size_name?.[index];
      const oldSizeName = props?.sizeMappingData?.old_size_name?.[index];
      const oldProductCode = props?.sizeMappingData?.old_product_code?.[index];

      if (!sizeOptions?.product_mappings?.[product_code]) {
        sizeOptions.product_mappings[product_code] = [oldProductCode];
      } else {
        sizeOptions.product_mappings[product_code].push(oldProductCode);
      }

      if (!sizeOptions?.size_mappings?.[newSize]) {
        sizeOptions.size_mappings[newSize] = [oldSize];
      } else {
        sizeOptions.size_mappings[newSize].push(oldSize);
      }

      if (!sizeOptions?.size_name_mappings?.[newSizeName]) {
        sizeOptions.size_name_mappings[newSizeName] = [oldSizeName];
      } else {
        sizeOptions.size_name_mappings[newSizeName].push(oldSizeName);
      }
    });

    productCodeOptionsRef.current = sizeOptions;
    fetchProductMappingPopupTableConfig();
    fetchProductMappingPopupData();
  };

  const filterProductCodeOptionsBySelectedValues = (
    allProductCodeOptions,
    selectedProductCodeOptions,
    currentValue,
    allSizes = [],
    useSizeForLabel
  ) => {
    const allProductCodeOptionsWithSize = allProductCodeOptions.map(
      (code, index) => ({
        code,
        size: allSizes[index],
      })
    );

    const filteredProductCodeOptions = allProductCodeOptionsWithSize
      ?.filter(({ code }) => {
        return (
          selectedProductCodeOptions?.indexOf(code) === -1 ||
          currentValue?.indexOf(code) > -1
        );
      })
      ?.map(({code, size}) => {
        return {
          value: code,
          label: useSizeForLabel ? size : code,
        };
      });

    return filteredProductCodeOptions;
  };

  const onChangeHandler = async (cellNode, _colId, _p_colType, e) => {
    const newProductCode = cellNode?.data?.new_product_code;
    const newStyleSize = cellNode?.data?.new_style_size;
    const newStyleSizeName = cellNode?.data?.new_style_size_name;
    const updatedOldProductCodes = e?.map((productCode) => {
      return productCode.value;
    });
    const updatedOldStyleSizes = [],
      updatedOldStyleSizesNames = [];

    const excludedOldProductCodeMappings =
      productCodeOptionsRef?.current?.product_mappings?.[
        newProductCode
      ]?.filter((oldProductCode) => {
        return updatedOldProductCodes.indexOf(oldProductCode) === -1;
      }) || [];

    const updatedMappings = productCodeOptionsRef?.current?.mappings?.filter(
      (mapping) => {
        return excludedOldProductCodeMappings?.indexOf(mapping) === -1;
      }
    );

    updatedOldProductCodes?.forEach((productCode) => {
      const productCodeIndexFromAll = productCodeOptionsRef?.current?.old_all_product_codes?.indexOf(
        productCode
      );
      updatedOldStyleSizes.push(
        productCodeOptionsRef?.current?.old_all_sizes[productCodeIndexFromAll]
      );
      updatedOldStyleSizesNames.push(
        productCodeOptionsRef?.current?.old_all_sizes_names[
          productCodeIndexFromAll
        ]
      );

      if (updatedMappings.indexOf(productCode) === -1) {
        updatedMappings.push(productCode);
      }
    });

    productCodeOptionsRef.current.mappings = updatedMappings;
    productCodeOptionsRef.current.product_mappings[
      newProductCode
    ] = updatedOldProductCodes;
    productCodeOptionsRef.current.size_mappings[
      newStyleSize
    ] = updatedOldStyleSizes;
    productCodeOptionsRef.current.size_name_mappings[
      newStyleSizeName
    ] = updatedOldStyleSizesNames;

    const rowsToUpdate = [];
    agGridInstance.current.api.forEachNode((item) => {
      const rowData = item.data;
      const currentNewProductCode = rowData?.new_product_code;

      if (currentNewProductCode === newProductCode) {
        rowData.old_style_size = updatedOldStyleSizes;
        rowData.old_style_size_name = updatedOldStyleSizesNames;
        rowData.old_product_code_num_arr = updatedOldProductCodes;
      }

      rowData.old_product_code_options = filterProductCodeOptionsBySelectedValues(
        productCodeOptionsRef?.current?.old_all_product_codes,
        productCodeOptionsRef?.current?.mappings,
        productCodeOptionsRef?.current?.product_mappings?.[
          currentNewProductCode
        ] || [],
        productCodeOptionsRef?.current?.old_all_sizes,
        showSizeInEditMappingPopup
      );

      rowsToUpdate.push(rowData);
    });

    await agGridInstance?.current?.api?.refreshCells({ update: rowsToUpdate });
  };

  const fetchProductMappingPopupData = async () => {
    try {
      const data = productCodeOptionsRef?.current?.new_all_product_codes.map(
        (productCode, index) => {
          const sizeOption = {
            index,
          };

          sizeOption.new_product_code = productCode;
          sizeOption.new_style_size =
            productCodeOptionsRef?.current?.new_all_sizes[index];
          sizeOption.new_style_size_name =
            productCodeOptionsRef?.current?.new_all_sizes_name[index];

          sizeOption.old_product_code_options = filterProductCodeOptionsBySelectedValues(
            productCodeOptionsRef?.current?.old_all_product_codes,
            productCodeOptionsRef?.current?.mappings,
            productCodeOptionsRef?.current?.product_mappings?.[productCode] ||
              [],
            productCodeOptionsRef?.current?.old_all_sizes,
            showSizeInEditMappingPopup
          );

          if (productCodeOptionsRef?.current?.product_mappings?.[productCode]) {
            sizeOption.old_style_size =
              productCodeOptionsRef?.current?.size_mappings?.[
                sizeOption?.new_style_size
              ];
            sizeOption.old_style_size_name =
              productCodeOptionsRef?.current?.size_name_mappings?.[
                sizeOption?.new_style_size_name
              ];
            sizeOption.old_product_code = productCodeOptionsRef?.current?.product_mappings?.[
              productCode
            ].map((oldProductCode) => {
              const label = showSizeInEditMappingPopup
                ? sizeOption.old_product_code_options?.find(
                    (option) => option.value === oldProductCode
                  )?.label ?? oldProductCode
                : oldProductCode;

              return {
                label,
                value: oldProductCode,
              };
            });
            sizeOption.old_product_code_num_arr = sizeOption.old_product_code.map(obj => obj.value);
          }

          return sizeOption;
        }
      );
      setProductsMappingReviewPopupData(data);
    } finally {
    }
  };

  const fetchProductMappingPopupTableConfig = async () => {
    try {
      props.setInventorysmartReviewSizeMappingTableLoader(true);
      const payload = {
        tableConfigName: "product_supersession_size_mapping",
      };
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );

      const columns = response?.data?.data?.map((column) => {
        column.extra.onChangeCustomFunction = true;

        if (!keepDropdownEnabled) {
          column.disabled = isItemDisabled;
        }

        return column;
      });

      let formattedColumns = agGridColumnFormatter(columns);
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
      formatSizeOptions();
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
          loader={props.inventorysmartReviewSizeMappingTableLoader}
          minHeight={"350px"}
        >
          <AgGridComponent
            columns={productsMappingReviewPopupColumnConfig}
            rowdata={productsMappingReviewPopupData}
            uniqueRowId={"index"}
            pagination={false}
            callBackOnChangeCustomFunction={onChangeHandler}
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
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              onClick={() => saveSizeMapping()}
            >
              Save
            </Button>
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
        .inventorySmartProductSupersessionReviewMappingService
        .inventorysmartReviewSizeMappingTableLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
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
)(ReviewSKULevelSizeMapping);
