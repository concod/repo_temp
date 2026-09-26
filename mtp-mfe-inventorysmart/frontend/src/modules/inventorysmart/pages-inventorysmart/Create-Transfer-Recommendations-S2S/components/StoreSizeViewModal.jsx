import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { BottomSheet, Button } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import {
  setStoreViewLoader,
  getSizeView,
} from "../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { displaySnackMessages } from "../../inventorysmart-utility";

const StoreSizeViewModal = (props) => {
  const [sizeViewData, setSizeViewData] = useState([]);
  const [sizeViewColumns, setSizeViewColumns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(
        "An error occurred. Please try again.",
        "error",
        props
      );
    }
  };

  const fetchSizeViewColumns = async () => {
    try {
      const sizeTableName = "store_transfer_size";
      const columns = await getColumnsAg(`table_name=${sizeTableName}`)();

      if (columns && columns.length > 0) {
        const formattedColumns = agGridColumnFormatter(columns, null, null);
        setSizeViewColumns(formattedColumns);
      }
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const fetchSizeViewData = async () => {
    try {
      props.setStoreViewLoader(true);
      setIsModalOpen(false); // Close modal while loading

      if (sizeViewColumns.length === 0) {
        await fetchSizeViewColumns();
      }

      const payload = {
        allocation_code: props.allocationCode,
        article: props.selectedProduct?.article,
        source_store_code: props.selectedProduct?.source_store_code,
        destination_store_code: props.selectedProduct?.destination_store_code,
      };

      const response = await props.getSizeView(payload);

      if (response?.data?.status) {
        setSizeViewData(response.data.data || []);
        setIsModalOpen(true); // Open modal only after data is loaded
      } else {
        displaySnackMessages(
          response?.data?.message || "Failed to load size view",
          "error",
          props
        );
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      props.setStoreViewLoader(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    props.setShowSizeView(false);
    props.setSelectedProduct(null);
    setSizeViewData([]);
  };

  useEffect(() => {
    if (props.selectedProduct && props.open) {
      fetchSizeViewData();
    } else if (!props.open) {
      setIsModalOpen(false);
    }
  }, [props.selectedProduct, props.open]);

  return (
    <BottomSheet
      title={props.selectedProduct?.article || ""}
      open={isModalOpen}
      footerOptions={
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
      }
      onClose={handleClose}
    >
      <div style={{ padding: "16px" }}>
        <AgGridComponent
          tableHeader={`Selected | Style Color ID: ${
            props.selectedProduct?.article || ""
          } | Destination ID: ${
            props.selectedProduct?.destination_store_code || ""
          }`}
          columns={sizeViewColumns}
          rowdata={sizeViewData}
          pagination={true}
          paginationPageSize={10}
          uniqueRowId="size"
          height="460px"
          adjustTableHeight={true}
          showCustomNoRowOverlay={false}
        />
      </div>
    </BottomSheet>
  );
};

const mapStateToProps = (store) => {
  return {
    storeViewLoader:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.storeViewLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setStoreViewLoader: (payload) => dispatch(setStoreViewLoader(payload)),
  getSizeView: (payload) => dispatch(getSizeView(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreSizeViewModal);
