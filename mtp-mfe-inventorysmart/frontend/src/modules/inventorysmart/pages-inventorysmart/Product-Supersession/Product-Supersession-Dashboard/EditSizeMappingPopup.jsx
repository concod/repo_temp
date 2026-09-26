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

const EditSizeMappingPopup = (props) => {
  const agGridInstance = useRef(null);
  const productCodeOptionsRef = useRef({});

  const [columnConfig, setColumnConfig] = useState([]);
  const [rowData, setRowData] = useState([]);
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

    const finalNewCodes = [];
    const finalOldCodes = [];
    const finalPsCodes = [];

    (ref?.old_all_product_codes || []).forEach((oldProductCode) => {
      if (isNullCode(oldProductCode)) return;

      finalOldCodes.push(oldProductCode);
      finalNewCodes.push(ref.product_mappings[oldProductCode]);
      finalPsCodes.push(ref.ps_code_map?.[oldProductCode] ?? null);
    });

    if (props.onSave) {
      props.onSave({
        new_article: props.sizeMappingData?.new_article,
        old_article: props.sizeMappingData?.old_article,
        new_product_codes: finalNewCodes,
        old_product_codes: finalOldCodes,
        ps_codes: finalPsCodes,
      });
    }
    props.closeModal();
  };

  const formatSizeOptions = () => {
    const data = props.sizeMappingData;
    const allNewProductCodes = cloneDeep(data?.new_product_codes) || [];
    const allOldProductCodes = cloneDeep(data?.old_product_codes) || [];
    const allNewSizes = cloneDeep(data?.new_sizes) || [];
    const allOldSizes = cloneDeep(data?.old_sizes) || [];
    const psCodes = data?.ps_codes || [];

    const sizeOptions = {
      product_mappings: {},
      size_mappings: {},
      new_all_sizes: allNewSizes,
      old_all_sizes: allOldSizes,
      new_all_product_codes: allNewProductCodes,
      old_all_product_codes: allOldProductCodes,
      ps_code_map: {},
    };

    allOldProductCodes.forEach((oldCode, idx) => {
      if (!isNullCode(oldCode)) {
        sizeOptions.ps_code_map[oldCode] = psCodes[idx] ?? null;
      }
    });

    allOldProductCodes.forEach((oldProductCode, index) => {
      if (isNullCode(oldProductCode)) return;

      const selectedNewSize = findNewSizeForOldSku({
        oldProductCode,
        oldSize: allOldSizes[index],
        newAllSizes: allNewSizes,
        mappedOldCodes: allOldProductCodes,
        mappedNewSizes: allNewSizes,
      });
      const newMeta = getNewMetaForSize(selectedNewSize, sizeOptions);

      sizeOptions.product_mappings[oldProductCode] = newMeta.productCode;
      sizeOptions.size_mappings[oldProductCode] = selectedNewSize;
    });

    productCodeOptionsRef.current = sizeOptions;
    setIsSaveDisabled(!areAllOldSizesMapped(sizeOptions));
    fetchTableConfig();
    buildRowData();
  };

  const onChangeHandler = async (cellNode, _colId, _p_colType, e) => {
    const oldProductCode = cellNode?.data?.old_product_code_value;
    const selectedOption = getSelectedOption(e);
    const newSize = selectedOption?.value || null;
    const ref = productCodeOptionsRef.current;
    const { productCode: newProductCode } = getNewMetaForSize(newSize, ref);

    ref.product_mappings[oldProductCode] = newProductCode;
    ref.size_mappings[oldProductCode] = newSize;

    const rowsToUpdate = [];
    agGridInstance.current.api.forEachNode((item) => {
      const currentRowData = item.data;

      if (currentRowData?.old_product_code_value === oldProductCode) {
        currentRowData.new_style_size = selectedOption || null;
        currentRowData.new_product_code = newProductCode || "";
        currentRowData.new_sku = newProductCode || "";
      }

      currentRowData.new_style_size_options = buildNewStyleSizeOptions(
        ref?.new_all_sizes
      );
      rowsToUpdate.push(currentRowData);
    });

    await agGridInstance?.current?.api?.refreshCells({ update: rowsToUpdate });
    setIsSaveDisabled(!areAllOldSizesMapped(ref));
  };

  const buildRowData = () => {
    try {
      const ref = productCodeOptionsRef.current;
      const newStyleSizeOptions = buildNewStyleSizeOptions(ref.new_all_sizes);
      let rowIndex = 0;

      const data = (ref.old_all_product_codes || [])
        .map((oldProductCode, index) => {
          if (isNullCode(oldProductCode)) return null;

          const oldSize = ref.old_all_sizes?.[index] ?? "";
          const selectedNewSize = ref.size_mappings?.[oldProductCode] || null;
          const selectedOption = selectedNewSize
            ? newStyleSizeOptions.find((option) =>
                sizesMatch(option.value, selectedNewSize)
              ) || toSizeOption(selectedNewSize)
            : null;
          const newProductCode = ref.product_mappings?.[oldProductCode] || "";

          const sizeOption = {
            index: rowIndex,
            old_product_code_value: oldProductCode,
            old_product_code: oldSize || oldProductCode,
            old_product_code_num_arr: oldProductCode,
            old_style_size: oldSize,
            old_sku: oldProductCode,
            new_product_code: newProductCode,
            new_sku: newProductCode,
            new_style_size_options: newStyleSizeOptions,
            new_style_size: selectedOption,
          };
          rowIndex += 1;
          return sizeOption;
        })
        .filter(Boolean);

      setRowData(data);
    } catch (error) {
      console.error("Error building row data:", error);
    }
  };

  const fetchTableConfig = async () => {
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
          props.sizeMappingData?.new_sku &&
          nextColumn.column_name === "new_product_code"
        ) {
          nextColumn.column_name = "new_sku";
        }
        if (
          props.sizeMappingData?.old_sku &&
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
      setColumnConfig(formattedColumns);
    } finally {
      props.setInventorysmartReviewSizeMappingTableLoader(false);
    }
  };

  const resetData = () => {
    setColumnConfig([]);
    setRowData([]);
    setIsSaveDisabled(true);
    productCodeOptionsRef.current = {};
  };

  useEffect(() => {
    if (props.active && !isEmpty(props.sizeMappingData)) {
      formatSizeOptions();
    } else {
      resetData();
    }
  }, [props.active, props.sizeMappingData]);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  return props.active ? (
    <Modal
      id="editSizeMappingDialog"
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
          columns={columnConfig}
          rowdata={rowData}
          uniqueRowId={"index"}
          pagination={false}
          callBackOnChangeCustomFunction={onChangeHandler}
          loadTableInstance={loadTableInstance}
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
)(EditSizeMappingPopup);
