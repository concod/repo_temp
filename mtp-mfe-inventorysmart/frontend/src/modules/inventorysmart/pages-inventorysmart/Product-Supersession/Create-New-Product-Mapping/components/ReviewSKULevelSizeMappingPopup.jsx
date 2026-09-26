import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { setInventorysmartReviewSizeMappingTableLoader } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-review-mapping-service";
import { getProductSupersessionSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import { cloneDeep, isEmpty } from "lodash";
import { Modal } from "impact-ui-v3";
import {
  sizesMatch,
  toSizeOption,
  isNullCode,
  buildNewStyleSizeOptions,
  getSelectedOption,
  findNewSizeForOldSku,
  getNewMetaForSize,
  areAllOldSizesMapped,
} from "modules/inventorysmart/pages-inventorysmart/Product-Supersession/utils/sizeMappingPopupUtils";

const ReviewSKULevelSizeMapping = (props) => {
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
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);

  const saveSizeMapping = () => {
    const ref = productCodeOptionsRef.current;
    if (!areAllOldSizesMapped(ref)) {
      props.addSnack({
        message: "Map all old sizes to a new size to proceed",
        options: {
          variant: "error",
        },
      });
      return;
    }

    const oldMappedProductCodes = [];
    const newMappedProductCodes = [];
    const oldMappedSizes = [];
    const newMappedSizes = [];
    const oldMappedSizeNames = [];
    const newMappedSizeNames = [];

    (ref?.old_all_product_codes || []).forEach((oldProductCode, index) => {
      if (isNullCode(oldProductCode)) return;

      oldMappedProductCodes.push(oldProductCode);
      newMappedProductCodes.push(ref.product_mappings[oldProductCode]);
      oldMappedSizes.push(ref.old_all_sizes?.[index]);
      newMappedSizes.push(ref.size_mappings[oldProductCode]);
      oldMappedSizeNames.push(ref.old_all_sizes_names?.[index]);
      newMappedSizeNames.push(ref.size_name_mappings[oldProductCode]);
    });

    props.sizeMappingData.new_size = [...newMappedSizes];
    props.sizeMappingData.old_size = [...oldMappedSizes];
    props.sizeMappingData.new_product_code = [...newMappedProductCodes];
    props.sizeMappingData.old_product_code = [...oldMappedProductCodes];
    props.sizeMappingData.old_size_name = [...oldMappedSizeNames];
    props.sizeMappingData.new_size_name = [...newMappedSizeNames];
    props.sizeMappingData.mapped_sizes = newMappedProductCodes.length;
    props.agGridInstance?.current?.api?.refreshCells({
      update: props.sizeMappingData,
    });
    props.closeModal();
  };

  const formatSizeOptions = () => {
    const sizeMappingData = props.sizeMappingData;
    const sizeOptions = {
      product_mappings: {},
      size_mappings: {},
      size_name_mappings: {},
      new_all_sizes: cloneDeep(sizeMappingData?.new_size_all) || [],
      new_all_sizes_name: cloneDeep(sizeMappingData?.new_size_name_all) || [],
      old_all_sizes: cloneDeep(sizeMappingData?.old_size_all) || [],
      old_all_sizes_names: cloneDeep(sizeMappingData?.old_size_name_all) || [],
      new_all_product_codes:
        cloneDeep(sizeMappingData?.new_product_code_all) || [],
      old_all_product_codes:
        cloneDeep(sizeMappingData?.old_product_code_all) || [],
    };
    const mappedOldCodes = sizeMappingData?.old_product_code || [];
    const mappedNewSizes = sizeMappingData?.new_size || [];

    sizeOptions.old_all_product_codes.forEach((oldProductCode, index) => {
      if (isNullCode(oldProductCode)) return;

      const selectedNewSize = findNewSizeForOldSku({
        oldProductCode,
        oldSize: sizeOptions.old_all_sizes[index],
        newAllSizes: sizeOptions.new_all_sizes,
        mappedOldCodes,
        mappedNewSizes,
      });
      const newMeta = getNewMetaForSize(selectedNewSize, sizeOptions);

      sizeOptions.product_mappings[oldProductCode] = newMeta.productCode;
      sizeOptions.size_mappings[oldProductCode] = selectedNewSize;
      sizeOptions.size_name_mappings[oldProductCode] = newMeta.sizeName;
    });

    productCodeOptionsRef.current = sizeOptions;
    setIsSaveDisabled(!areAllOldSizesMapped(sizeOptions));
    fetchProductMappingPopupTableConfig();
    fetchProductMappingPopupData();
  };

  const onChangeHandler = async (cellNode, _colId, _p_colType, e) => {
    const oldProductCode = cellNode?.data?.old_product_code_value;
    const selectedOption = getSelectedOption(e);
    const newSize = selectedOption?.value || null;
    const ref = productCodeOptionsRef.current;
    const { productCode: newProductCode, sizeName: newSizeName } =
      getNewMetaForSize(newSize, ref);

    ref.product_mappings[oldProductCode] = newProductCode;
    ref.size_mappings[oldProductCode] = newSize;
    ref.size_name_mappings[oldProductCode] = newSizeName;

    const rowsToUpdate = [];
    agGridInstance.current.api.forEachNode((item) => {
      const rowData = item.data;

      if (rowData?.old_product_code_value === oldProductCode) {
        rowData.new_style_size = selectedOption || null;
        rowData.new_style_size_name = newSizeName;
        rowData.new_product_code = newProductCode || "";
        rowData.new_sku = newProductCode || "";
      }

      rowData.new_style_size_options = buildNewStyleSizeOptions(
        ref?.new_all_sizes
      );
      rowsToUpdate.push(rowData);
    });

    await agGridInstance?.current?.api?.refreshCells({ update: rowsToUpdate });
    setIsSaveDisabled(!areAllOldSizesMapped(ref));
  };

  const fetchProductMappingPopupData = async () => {
    try {
      const ref = productCodeOptionsRef?.current;
      const newStyleSizeOptions = buildNewStyleSizeOptions(ref?.new_all_sizes);
      const data = (ref?.old_all_product_codes || []).map(
        (oldProductCode, index) => {
          if (isNullCode(oldProductCode)) return null;

          const oldSize = ref?.old_all_sizes?.[index] ?? "";
          const oldSizeName = ref?.old_all_sizes_names?.[index] ?? "";
          const selectedNewSize = ref?.size_mappings?.[oldProductCode] || null;
          const selectedOption = selectedNewSize
            ? newStyleSizeOptions.find((option) =>
                sizesMatch(option.value, selectedNewSize)
              ) || toSizeOption(selectedNewSize)
            : null;
          const newProductCode =
            ref?.product_mappings?.[oldProductCode] || "";

          return {
            index,
            old_product_code_value: oldProductCode,
            old_product_code: oldSize || oldSizeName || oldProductCode,
            old_product_code_num_arr: oldProductCode,
            old_style_size: oldSize,
            old_style_size_name: oldSizeName,
            old_sku: oldProductCode,
            new_product_code: newProductCode,
            new_sku: newProductCode,
            new_style_size_options: newStyleSizeOptions,
            new_style_size: selectedOption,
            new_style_size_name:
              ref?.size_name_mappings?.[oldProductCode] ?? "",
          };
        }
      ).filter(Boolean);
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
        const nextColumn = { ...column, extra: { ...(column.extra || {}) } };
        if (
          props?.sizeMappingData?.new_sku &&
          nextColumn.column_name === "new_product_code"
        ) {
          nextColumn.column_name = "new_sku";
        }
        if (
          props?.sizeMappingData?.old_sku &&
          nextColumn.column_name === "old_product_code_num_arr"
        ) {
          nextColumn.column_name = "old_sku";
        }
        if (nextColumn.type === "dynamic-list") {
          nextColumn.extra.onChangeCustomFunction = true;
        }

        return nextColumn;
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
    setIsSaveDisabled(true);
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
        disabled: isSaveDisabled,
      }}
      onPrimaryButtonClick={() => saveSizeMapping()}
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
      </Loader>
    </Modal>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    inventorysmartReviewSizeMappingTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionReviewMappingService
        .inventorysmartReviewSizeMappingTableLoader,
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
