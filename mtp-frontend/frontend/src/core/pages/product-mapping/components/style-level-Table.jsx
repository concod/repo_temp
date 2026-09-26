import React from "react";
import AgGridTable from "core/Utils/agGrid";
import { generateUniqueEditedPayload } from "core/pages/storeMapping/components/common-mapping-functions";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";

const ProductStyleTable = React.forwardRef((props, ref) => {
  const styleLevelOnSelection = (event) => {
    const selectedRows = event.api.getSelectedRows();
    const selectedIds = [];
    selectedRows.forEach((row) => {
      if (props.isAggregated) {
        selectedIds.push({
          product_code: row.article,
        });
      } else {
        row.products.forEach((productUnderStyle) => {
          selectedIds.push({
            product_code: productUnderStyle,
          });
        });
      }
    });

    props.setSelectedRowsIDs(generateUniqueEditedPayload(selectedIds));
  };
  return (
    <div>
      {props.checked && (
        <AgGridTable
          columns={props.styleColumns}
          selectAllHeaderComponent={true}
          hideSelectAllRecords={true}
          sizeColumnsToFitFlag
          onGridChanged
          onRowSelected
          manualCallBack={(body, pageIndex, params) =>
            props.manualCallBack(body, pageIndex, params)
          }
          loadTableInstance={(gridInstance) => {
            ref.current = gridInstance;
          }}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          uniqueRowId={dynamicLabelKeysBasedOnTenant("style", "core")}
          onSelectionChanged={styleLevelOnSelection}
        />
      )}
      {!props.checked && (
        <AgGridTable
          columns={props.productColumns}
          selectAllHeaderComponent={true}
          hideSelectAllRecords={false}
          sizeColumnsToFitFlag
          onGridChanged
          onRowSelected
          manualCallBack={(body, pageIndex, params) =>
            props.manualCallBack(body, pageIndex, params)
          }
          loadTableInstance={(gridInstance) => {
            ref.current = gridInstance;
          }}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          uniqueRowId={"product_code"}
          onSelectionChanged={props.onSelectionChanged}
        />
      )}
    </div>
  );
});

export default ProductStyleTable;
