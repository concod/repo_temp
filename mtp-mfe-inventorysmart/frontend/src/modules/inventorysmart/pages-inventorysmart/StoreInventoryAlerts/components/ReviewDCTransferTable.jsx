import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { Button } from "impact-ui-v3";
import { cloneDeep } from "lodash";

import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import {
  fetchDCTransferRecommendation,
  setDCTransferRecommendationLoader,
  setDCTransferRecommendationData,
  fetchDCTransferSizeLevel,
  setDCTransferSizeLevelData,
  updateDCTransferStatus,
  editDCTransferSizeLevel,
} from "../../../services-inventorysmart/StoreInventoryAlerts/alerts-actions-service";

import { NO_TABLE_DATA_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

const ReviewDCTransferTable = (props) => {
  const [productsColumns, setProductsColumns] = useState([]);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [sizeLevelColumns, setSizeLevelColumns] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [sizeLevelData, setSizeLevelData] = useState([]);
  const [showEditAction, setShowEditAction] = useState(false);
  const globalClasses = globalStyles();
  const dcTransferSizeTableRef = useRef(null);
  const detailsTableRef = useRef(null);

  useEffect(() => {
    const getInitialData = async () => {
      try {
        // First, update the transfer status - This is the first API call
        const statusResponse = await props.updateDCTransferStatus({
          article: props.initialChoiceValue,
          order_status: 0,
        });

        if (statusResponse.data?.show_message) {
          props.displaySnackMessages(statusResponse.data?.message, "success");
        }
      } catch (e) {
        props.handleErrorMessage(e);
      }
    };
    getInitialData();
    getArticleLevelData();
  }, []);

  const updateSizeLevelData = (data) => {
    setSizeLevelData(data);
  };

  useEffect(() => {
    let rowData = cloneDeep(props.dcTransferSizeLevelData);
    updateSizeLevelData(rowData);
  }, [props.dcTransferSizeLevelData]);

  useEffect(() => {
    if (
      props.dcTransferRecommendationData &&
      Array.isArray(props.dcTransferRecommendationData) &&
      detailsTableRef.current &&
      detailsTableRef.current.api
    ) {
      detailsTableRef.current.api.forEachNode((node) => {
        if (
          node.data &&
          Number(node.data.user_adjusted_transfer_quantity) >
            Number(node.data.source_oh_inv)
        ) {
          node.setSelected(false);
        }
      });
    }
  }, [props.dcTransferRecommendationData, detailsTableRef.current]);

  const LegendItem = ({ color, text }) => (
    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          background: color,
          borderRadius: "2px",
          border: "1px solid #e0e0e0",
        }}
      />
      <span
        style={{
          fontFamily: "Manrope",
          fontWeight: "500",
          fontSize: "12px",
          lineHeight: "125%",
          letterSpacing: "0%",
        }}
      >
        {text}
      </span>
    </span>
  );

  // Helper function to determine cell style based on column and row data
  const getCellStyle = (columnName, rowData) => {
    switch (columnName) {
      case "destination_promised_quantity":
        if (rowData.user_adjusted_transfer_quantity < rowData.need) {
          return { backgroundColor: "#DBEFF0" };
        }
        break;
      case "source_oh_inv":
        if (rowData.user_adjusted_transfer_quantity > rowData.source_oh_inv) {
          return { backgroundColor: "#F0DFFB" };
        }
        break;
      case "source_promised_quantity":
        if (
          rowData.source_remaining_oh_inv < rowData.source_promised_quantity
        ) {
          return { backgroundColor: "#F6EBBF" };
        }
        break;
      default:
        break;
    }
    return { backgroundColor: "inherit" };
  };

  const viewSizeSplitDetails = async (data) => {
    closeModal();
    try {
      props.setDCTransferRecommendationLoader(true);
      setSelectedChoice(data.article);
      // Fetch size level data
      const response = await props.fetchDCTransferSizeLevel({
        filters: {
          article: data.article,
        },
      });
      if (response.data?.show_message) {
        props.displaySnackMessages(response.data?.message, "success");
      }
      // Set size level columns and data
      let sizeCols = agGridColumnFormatter(response.data?.data?.table_config);
      sizeCols = sizeCols.map((item) => {
        if (
          item.column_name === "destination_promised_quantity" ||
          item.column_name === "source_oh_inv" ||
          item.column_name === "source_promised_quantity"
        ) {
          item.cellStyle = (params) => {
            const rowData = params?.node?.data;
            return getCellStyle(item.column_name, rowData);
          };
        }
        return item;
      });
      setSizeLevelColumns(sizeCols);
      props.setDCTransferSizeLevelData(response.data?.data?.table_data || []);
      setShowSizeModal(true);
      props.setDCTransferRecommendationLoader(false);
    } catch (e) {
      props.setDCTransferRecommendationLoader(false);
      props.handleErrorMessage(e);
      setShowSizeModal(false);
    }
  };

  const choiceSizeViewAction = {
    article: viewSizeSplitDetails,
  };

  const getArticleLevelData = async () => {
    try {
      props.setDCTransferRecommendationLoader(true);
      // Define the initial article value for the API calls
      // Then fetch the recommendation data
      const response = await props.fetchDCTransferRecommendation({
        filters: {
          article: props.initialChoiceValue,
        },
      });

      if (response.data?.show_message) {
        props.displaySnackMessages(response.data?.message, "success");
      }

      // Process the response
      let productsCols = agGridColumnFormatter(
        response.data?.data?.table_config,
        null,
        choiceSizeViewAction
      );
      productsCols = productsCols.map((item) => {
        if (
          item.column_name === "destination_promised_quantity" ||
          item.column_name === "source_oh_inv" ||
          item.column_name === "source_promised_quantity"
        ) {
          item.cellStyle = (params) => {
            const rowData = params.node.data;
            return getCellStyle(item.column_name, rowData);
          };
        }
        return item;
      });
      // Set the response data in Redux store
      props.setDCTransferRecommendationData(
        response.data?.data?.table_data || []
      );
      setProductsColumns(productsCols);
      props.setDCTransferRecommendationLoader(false);
    } catch (e) {
      props.handleErrorMessage(e);
    }
  };

  const renderSaveButton = () => {
    return (
      <Button
        size="medium"
        type="default"
        variant="secondary"
        id="save-button"
        // onClick={handleSave} // to do after api is ready
        disabled={true}
      >
        Save
      </Button>
    );
  };

  const saveSizeLevelDetails = async () => {
    try {
      props.setDCTransferRecommendationLoader(true);

      // Format the updates with the required structure
      const updates = updatedRowEdits.map((edit) => {
        return {
          level: {
            article: selectedChoice,
            size: edit?.size,
            dc_source: edit?.dc_source,
            dc_destination: edit?.dc_destination,
          },
          edits: {
            user_adjusted_transfer_quantity:
              edit?.user_adjusted_transfer_quantity,
          },
        };
      });

      // Make the API call
      const response = await props.editDCTransferSizeLevel({
        updates: updates,
      });

      // Display success message if returned in response
      if (response.data?.show_message || response.data?.status) {
        props.displaySnackMessages(response.data?.message, "success");
        getArticleLevelData();
      }
      // Close the modal and reset state
      closeModal();
    } catch (e) {
      props.setDCTransferRecommendationLoader(false);
      props.handleErrorMessage(e);
    }
  };

  const closeModal = () => {
    setShowSizeModal(false);
    setSelectedChoice("");
    setUpdatedRowEdits([]);
    setShowEditAction(false);
    props.setDCTransferSizeLevelData([]);
  };

  const setNewTableInstance = (params) => {
    dcTransferSizeTableRef.current = params;
  };

  const setDetailsTableInstance = (params) => {
    detailsTableRef.current = params;
  };

  const updateEditedRowState = (data) => {
    let cloneUpdatedRowEdits = cloneDeep(updatedRowEdits);
    const existingIndex = cloneUpdatedRowEdits.findIndex(
      (obj) => obj["unique_key"] === data["unique_key"]
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneUpdatedRowEdits[existingIndex] = data;
      setUpdatedRowEdits(cloneUpdatedRowEdits);
    } else {
      // Push the new object to the state
      setUpdatedRowEdits((prevState) => [...prevState, data]);
    }
  };

  const onBlur = async (_e, data, column, isChanged, value, initialValue) => {
    if (isChanged && Number(value) !== Number(initialValue)) {
      if (column.colId === "user_adjusted_transfer_quantity") {
        data.user_adjusted_transfer_quantity = value;
      }
      dcTransferSizeTableRef.current?.api?.refreshCells({
        columns: ["user_adjusted_transfer_quantity"],
      });
      updateEditedRowState(data);
      setShowEditAction(true);
    }
  };

  const onDiscardSizeLevelChanges = () => {
    let cloneSizeLevelData = cloneDeep(props.dcTransferSizeLevelData);
    updateSizeLevelData(cloneSizeLevelData); // set the size level data to the initial data
    setShowEditAction(false); // hide the edit action button
    setUpdatedRowEdits([]);
    props.displaySnackMessages("Size level changes discarded", "success");
  };

  const showTopRightOptions = () => {
    if (showEditAction)
      return [
        <Button
          size="medium"
          type="default"
          variant="secondary"
          onClick={() => onDiscardSizeLevelChanges()}
        >
          Discard
        </Button>,
        <Button
          size="medium"
          type="default"
          variant="primary"
          disabled={updatedRowEdits.length === 0}
          onClick={() => saveSizeLevelDetails()}
        >
          Update
        </Button>,
      ];
    else return [];
  };

  const openSizeModal = () => {
    return (
      <AgGridComponent
        columns={sizeLevelColumns}
        rowdata={sizeLevelData}
        sizeColumnsToFitFlag
        skipAutoSizeColumn
        uniqueRowId={"unique_key"}
        loadTableInstance={setNewTableInstance}
        noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
        onBlur={onBlur}
        tableHeader={`Size Details - ${selectedChoice}`}
        topRightOptions={showTopRightOptions()}
        bottomLeftOptions={renderConditionalFormattingLegend()}
        closeButton={true}
        handleCloseButtonClick={() => closeModal()}
      />
    );
  };

  const renderConditionalFormattingLegend = () => {
    return (
      <div style={{ position: "absolute" }}>
        <LegendItem
          color="#DBEFF0"
          text="User Adjusted Transfer Quantity < Need at the Destination"
        />
        <LegendItem
          color="#F0DFFB"
          text="User Adjusted Transfer Quantity > DC OH at the Source"
        />
        <LegendItem
          color="#F6EBBF"
          text="Remaining Inventory at Source < Promised Quantity at Source"
        />
      </div>
    );
  };

  return (
    <div className={globalClasses.marginTop}>
      <AgGridComponent
        columns={productsColumns}
        rowdata={props.dcTransferRecommendationData}
        sizeColumnsToFitFlag
        skipAutoSizeColumn
        uniqueRowId={"unique_key"}
        selectAllHeaderComponent={true}
        onSelectionChanged={props.onSelectionChanged}
        noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
        tableHeader="Product details"
        topRightOptions={renderSaveButton()}
        loadTableInstance={setDetailsTableInstance}
        bottomLeftOptions={renderConditionalFormattingLegend()}
        nestedTable={true}
        nestedTableComponent={showSizeModal && openSizeModal()}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    dcTransferRecommendationLoader:
      inventorysmartReducer.inventorySmartAlertsActionService
        .dcTransferRecommendationLoader,
    dcTransferRecommendationData:
      inventorysmartReducer.inventorySmartAlertsActionService
        .dcTransferRecommendationData,
    dcTransferSizeLevelLoader:
      inventorysmartReducer.inventorySmartAlertsActionService
        .dcTransferSizeLevelLoader,
    dcTransferSizeLevelData:
      inventorysmartReducer.inventorySmartAlertsActionService
        .dcTransferSizeLevelData,
    editDCTransferSizeLevelLoader:
      inventorysmartReducer.inventorySmartAlertsActionService
        .editDCTransferSizeLevelLoader,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    fetchDCTransferRecommendation: (body) =>
      dispatch(fetchDCTransferRecommendation(body)),
    setDCTransferRecommendationLoader: (status) =>
      dispatch(setDCTransferRecommendationLoader(status)),
    setDCTransferRecommendationData: (data) =>
      dispatch(setDCTransferRecommendationData(data)),
    fetchDCTransferSizeLevel: (body) =>
      dispatch(fetchDCTransferSizeLevel(body)),
    setDCTransferSizeLevelData: (data) =>
      dispatch(setDCTransferSizeLevelData(data)),
    updateDCTransferStatus: (body) => dispatch(updateDCTransferStatus(body)),
    editDCTransferSizeLevel: (body) => dispatch(editDCTransferSizeLevel(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewDCTransferTable);
