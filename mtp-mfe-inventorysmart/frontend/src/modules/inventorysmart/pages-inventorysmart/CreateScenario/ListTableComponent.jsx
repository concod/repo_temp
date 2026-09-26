import { connect } from "react-redux";
import React, { useState, useEffect, useRef } from "react";
import { getColumnsAg } from "../../../../core/actions/tableColumnActions";
import AgGridComponent from "core/Utils/agGrid";
import { Button } from "impact-ui-v3";
import { getProductStoreViewInCreateScenario } from "../../services-inventorysmart/Create-Scenario/store-view-services";
import Loader from "core/Utils/Loader/loader";
import makeStyles from "@mui/styles/makeStyles";
import { showEllipsis } from "../../utils-inventorysmart/utilityFunctions";
import Tooltip from "@mui/material/Tooltip";
import { displaySnackMessages } from "../inventorysmart-utility";
import { addSnack } from "../../../../core/actions/snackbarActions";
import { replaceSpecialCharacter } from "../../../../core/Utils/functions/utils";
const useStyles = makeStyles({
  headerStyle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0d152c",
  },
  dividerLine: {
    width: "1px",
    height: "12px",
    backgroundColor: "#d9dde7",
  },
  headerStyleWithEllipsis: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0d152c",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "inline-block",
  },
});

const ListTableComponent = (props) => {
  const classes = useStyles();
  const [storeDetailsTableData, setStoreDetailsTableData] = useState([]);
  const [tableColumnConfig, setTableColumnConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const agGridInstance = useRef(null);
  const editedDataList = useRef([]);
  const {
    selectedStoreData: { store_code },
    scenarioId,
    setSelectedStoreData,
    onApply,
    selectedPrductData,
  } = props;
  useEffect(() => {
    if (scenarioId && selectedPrductData?.product_code && store_code) {
      (async () => {
        setStoreDetailsTableData([]);
        try {
          setIsLoading(true);

          if (!tableColumnConfig) {
            let tableColumnConfig = await props.getColumnsAg(
              "table_name=cnx_scenario_size_table"
            );
            setTableColumnConfig(tableColumnConfig);
          }
          const body = {
            scenario_id: props.scenarioId,
            style: selectedPrductData?.product_code,
            level: "size",
            store: store_code,
          };
          let productStoreViewResponse = await props.getProductStoreSizeView(
            body
          );

          if (productStoreViewResponse?.data?.show_message) {
            displaySnackMessages(
              productStoreViewResponse?.data?.message,
              "success",
              props
            );
          }
          const tableData = productStoreViewResponse?.data?.data?.inputs;
          setStoreDetailsTableData(tableData);
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching columns:", error);
          setIsLoading(false);
        }
      })();
    }
  }, [scenarioId, selectedPrductData?.product_code, store_code]);
  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const getTopRightOptions = () => {
    let options = [
      <Button
        variant="primary"
        size="large"
        onClick={() => {
          if (!editedDataList.current.length) {
            displaySnackMessages(
              "Please edit any size details then click on Apply button",
              "error",
              props
            );
            return;
          }
          const payloadData = editedDataList.current.map((item) => {
            return {
              ...item,
              style: selectedPrductData?.product_code,
              store: store_code,
            };
          });
          onApply(payloadData, "size");
        }}
      >
        Apply
      </Button>,
    ];
    return options;
  };

  const getTopLeftOptions = () => {
    const sizeDescription =
      replaceSpecialCharacter(selectedPrductData?.style_description) || "N/A";

    return (
      <>
        <div className={classes.dividerLine}></div>
        <span>Selected Store:</span>
        <span className={classes.headerStyle}>{store_code || "N/A"}</span>
        <div className={classes.dividerLine}></div>
        <span>Description:</span>
        {showEllipsis(sizeDescription, 30) ? (
          <Tooltip title={sizeDescription}>
            <span className={classes.headerStyleWithEllipsis}>
              {sizeDescription || "N/A"}
            </span>
          </Tooltip>
        ) : (
          <span className={classes.headerStyle}>
            {sizeDescription || "N/A"}
          </span>
        )}
      </>
    );
  };

  // const onBlur = async (_e, data, column, isChanged) => {
  //   if (isChanged && data && data.size) {
  //     const currentEditedDataList = editedDataList.current;

  //     const existingItemIndex = currentEditedDataList.findIndex(
  //       (item) => item.size === data.size
  //     );

  //     if (existingItemIndex !== -1) {
  //       const updatedList = [...currentEditedDataList];
  //       updatedList[existingItemIndex] = {
  //         ...updatedList[existingItemIndex],
  //         ...data,
  //       };
  //       editedDataList.current = updatedList;
  //     } else {
  //       editedDataList.current = [...currentEditedDataList, { ...data }];
  //     }
  //   }
  // };

  const onBlur = async (
    _e,
    data,
    column,
    isChanged,
    val,
    initialVal,
    cellData,
    initVal,
    previousValue
  ) => {
    if (isChanged && data && data.size && column?.colId) {
      if (column.colId === "min_stock") {
        if (data.min_stock > data.min_stock_validator) {
          data.min_stock = data.min_stock_validator;
          displaySnackMessages("Min/Max values are adjusted to ensure Min is not greater than Max", "error", props, true);
        }
        data.max_stock_validator = data.min_stock;
        agGridInstance.current.api.refreshCells({
          rowNodes: [cellData.node],
          force: true,
          columns: ["min_stock"],
        });
      }
      if (column.colId === "max_stock") {
        if (data.max_stock < data.max_stock_validator) {
          data.max_stock = data.max_stock_validator;
          displaySnackMessages("Min/Max values are adjusted to ensure Min is not greater than Max", "error", props, true);
        }
        data.min_stock_validator = data.max_stock;
        agGridInstance.current.api.refreshCells({
          rowNodes: [cellData.node],
          force: true,
          columns: ["max_stock"],
        });
      }
      const currentEditedDataList = editedDataList.current;
      const existingItemIndex = currentEditedDataList.findIndex(
        (item) => item.size === data.size
      );

      const changedField = {
        [column.colId]: data[column.colId],
      };

      if (existingItemIndex !== -1) {
        const updatedList = [...currentEditedDataList];
        updatedList[existingItemIndex] = {
          ...updatedList[existingItemIndex],
          ...changedField,
        };
        editedDataList.current = updatedList;
      } else {
        editedDataList.current = [
          ...currentEditedDataList,
          {
            size: data.size,
            ...changedField,
          },
        ];
      }
    }
  };

  return (
    <Loader loader={isLoading} minHeight={160}>
      <AgGridComponent
        selectAllHeaderComponent={false}
        pagination={false}
        columns={tableColumnConfig}
        loadTableInstance={loadTableInstance}
        topRightOptions={getTopRightOptions()}
        topLeftOptions={getTopLeftOptions()}
        rowdata={storeDetailsTableData}
        tableHeader="Size"
        onBlur={onBlur}
        closeButton={true}
        sizeColumnsToFitFlag={true}
        suppressFieldDotNotation
        handleCloseButtonClick={() => {
          setSelectedStoreData(null);
        }}
      />
    </Loader>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getColumnsAg: (params) => dispatch(getColumnsAg(params)),
    getProductStoreSizeView: (payload) =>
      dispatch(getProductStoreViewInCreateScenario(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ListTableComponent);
