import { connect } from "react-redux";
import React, { useState, useEffect, useRef } from "react";
import { getColumnsAg } from "../../../../core/actions/tableColumnActions";
import AgGridComponent from "core/Utils/agGrid";
import { Button, Tooltip } from "impact-ui-v3";
import { getProductStoreViewInCreateScenario } from "../../services-inventorysmart/Create-Scenario/store-view-services";
import Loader from "core/Utils/Loader/loader";
import { SetAllStoreGroupModal } from "./SetAllStoreGroupModal";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { cloneDeep } from "lodash";
import makeStyles from "@mui/styles/makeStyles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ListTableComponent from "./ListTableComponent";
import { showEllipsis } from "../../utils-inventorysmart/utilityFunctions";
import { displaySnackMessages } from "../inventorysmart-utility";
import { addSnack } from "../../../../core/actions/snackbarActions";
import { replaceSpecialCharacter } from "../../../../core/Utils/functions/utils";

const useStyles = makeStyles({
  rightOptionsContainer: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  headerStyle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0d152c",
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
  dividerLine: {
    width: "1px",
    height: "12px",
    backgroundColor: "#d9dde7",
  },
});

const StoreDetailsTableComponent = (props) => {
  const classes = useStyles();
  const [storeDetailsTableData, setStoreDetailsTableData] = useState([]);
  const [tableColumnConfig, setTableColumnConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const editedDataList = useRef([]);
  const SelectedStoreDataRef = useRef(null);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [selectedStoreDataList, setSelectedStoreDataList] = useState([]);

  const {
    setSelectedStoreData,
    selectedStoreData,
    scenarioId,
    selectedPrductData,
    setSelectedPrductData,
    flag,
    onApply,
  } = props;

  const agGridInstance = useRef(null);
  useEffect(() => {
    if (props.scenarioId && selectedPrductData?.product_code) {
      (async () => {
        setStoreDetailsTableData([]);
        try {
          setIsLoading(true);
          if (!tableColumnConfig) {
            let tableColumnConfigData = await props.getColumnsAg(
              "table_name=cnx_scenario_store_table"
            );
            let tableColColumnConfig = cloneDeep(tableColumnConfigData).map(
              (item) => {
                if (item.column_name === "store_code") {
                  item.type = "link";
                  item.is_aggregated = false;
                  item.is_editable = true;
                  item.cellRenderer = (cellProps, extraProps) => {
                    return (
                      <CellRenderers
                        cellData={cellProps}
                        column={item}
                        extraProps={extraProps}
                      ></CellRenderers>
                    );
                  };
                }
                if (item.column_name !== "store_code") {
                  item.cellStyle = getCellStyle;
                }
                item.onClick = (tableInfo) => {
                  setSelectedStoreData(tableInfo?.cellData?.data);
                };
                return item;
              }
            );
            setTableColumnConfig(tableColColumnConfig);
          }
          const body = {
            scenario_id: props.scenarioId,
            style: selectedPrductData?.product_code,
            level: "store",
          };

          let productStoreViewResponse = await props.getProductStoreView(body);
          if (productStoreViewResponse?.data?.show_message) {
            displaySnackMessages(
              productStoreViewResponse?.data?.message,
              "success",
              props
            );
          }
          let tableData = [];
          if (
            props.selectedStyleStoreMap.get(selectedPrductData?.product_code)
          ) {
            tableData = productStoreViewResponse?.data?.data?.inputs.map(
              (item) => {
                item.is_selected = props.selectedStyleStoreMap
                  .get(selectedPrductData?.product_code)
                  .includes(item.store_code);
                return item;
              }
            );
          } else {
            tableData = productStoreViewResponse?.data?.data?.inputs.map(
              (item) => {
                item.is_selected = true;
                return item;
              }
            );
          }
          setStoreDetailsTableData(tableData);
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching columns:", error);
          setIsLoading(false);
        }
      })();
    }
  }, [scenarioId, selectedPrductData?.product_code]);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const handleSetAllApply = (modalFormData) => {
    if (
      modalFormData.min &&
      !modalFormData.max &&
      selectedStoreDataList.some(
        (selectedRow) =>
          parseInt(modalFormData.min) > parseInt(selectedRow.max_stock)
      )
    ) {
      displaySnackMessages(
        "Please enter min value less than max value",
        "error",
        props,
        true
      );
      return;
    }
    if (
      !modalFormData.min &&
      modalFormData.max &&
      selectedStoreDataList.some(
        (selectedRow) =>
          parseInt(modalFormData.max) < parseInt(selectedRow.min_stock)
      )
    ) {
      displaySnackMessages(
        "Please enter max value greater than min value",
        "error",
        props,
        true
      );
      return;
    }
    if (
      modalFormData.min &&
      modalFormData.max &&
      modalFormData.min > modalFormData.max
    ) {
      displaySnackMessages(
        "Please enter min value less than max value",
        "error",
        props,
        true
      );
      return;
    }
    if (
      modalFormData.max &&
      modalFormData.min &&
      modalFormData.max < modalFormData.min
    ) {
      displaySnackMessages(
        "Please enter max value greater than min value",
        "error",
        props,
        true
      );
      return;
    }
    const setAllData = selectedStoreDataList.map((item) => {
      const data = {
        style: selectedPrductData?.product_code,
        store: item.store_code,
      };

      if (modalFormData.min) {
        data.min_stock = modalFormData.min;
      }

      if (modalFormData.max) {
        data.max_stock = modalFormData.max;
      }

      if (modalFormData.wos) {
        data.wos = modalFormData.wos;
      }

      return data;
    });
    onApply(setAllData, "store");
    setShowSetAllModal(false);
  };

  const getTopRightOptions = () => {
    return (
      <div className={classes.rightOptionsContainer}>
        <span>
          Eligible selected stores:{" "}
          {
            props.selectedStyleStoreMap.get(selectedPrductData?.product_code)
              ?.length
          }
        </span>
        <Button
          key="set-all-btn"
          variant="secondary"
          size="large"
          onClick={() => {
            setShowSetAllModal(true);
          }}
          disabled={
            Boolean(selectedStoreData) ||
            !props.selectedStyleStoreMap.get(selectedPrductData?.product_code)
              ?.length
          }
        >
          Set All
        </Button>
        <Button
          key="apply-btn"
          variant="primary"
          size="large"
          onClick={() => {
            if (!editedDataList.current.length) {
              displaySnackMessages(
                "Please edit any store details then click on Apply button",
                "error",
                props
              );
              return;
            }
            onApply(editedDataList.current, "store");
          }}
          disabled={Boolean(selectedStoreData)}
        >
          Apply
        </Button>
      </div>
    );
  };

  const getTopLeftOptions = () => {
    const styleDescription =
      replaceSpecialCharacter(selectedPrductData?.style_description) || "N/A";

    return (
      <>
        <Tooltip
          title="Updating constraints here will override all store-size constraints for this style-color. Click any style-color id to view/edit store-specific constraints."
          orientation="bottom-end"
          variant="tertiary"
        >
          <InfoOutlinedIcon
            color="primary"
            className="new-primary-color-svg"
            fontSize="small"
          />
        </Tooltip>
        <div className={classes.dividerLine}></div>
        <span>Selected Product:</span>
        <span className={classes.headerStyle}>
          {selectedPrductData?.style || "N/A"}
        </span>
        <div className={classes.dividerLine}></div>
        <span>Description:</span>
        {showEllipsis(styleDescription, 30) ? (
          <Tooltip
            title={styleDescription}
            orientation="bottom"
            variant="tertiary"
          >
            <span className={classes.headerStyleWithEllipsis}>
              {styleDescription}
            </span>
          </Tooltip>
        ) : (
          <span className={classes.headerStyle}>
            {styleDescription || "N/A"}
          </span>
        )}
      </>
    );
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (node?.level === 0)
        node.selected &&
          selectedRows.push({
            ...node.data,
          });
    });

    const storeCodes = selectedRows.map((row) => row.store_code);

    props.setSelectedStyleStoreMap((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(selectedPrductData?.product_code, storeCodes);
      return newMap;
    });

    setSelectedStoreDataList(selectedRows);
  };

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
    if (isChanged && data && data.store_code && column?.colId) {
      if (column.colId === "min_stock") {
        if (data.min_stock > data.min_stock_validator) {
          data.min_stock = data.min_stock_validator;
          displaySnackMessages(
            "Min/Max values are adjusted to ensure Min is not greater than Max",
            "error",
            props,
            true
          );
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
          displaySnackMessages(
            "Min/Max values are adjusted to ensure Min is not greater than Max",
            "error",
            props,
            true
          );
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
        (item) => item.store === data.store_code
      );

      const changedField = {
        [column.colId]: data[column.colId],
      };

      if (existingItemIndex !== -1) {
        // Update existing entry with new changed field
        const updatedList = [...currentEditedDataList];
        updatedList[existingItemIndex] = {
          ...updatedList[existingItemIndex],
          ...changedField,
        };
        editedDataList.current = updatedList;
      } else {
        // Create new entry with store_code and changed field
        editedDataList.current = [
          ...currentEditedDataList,
          {
            store: data.store_code,
            style: selectedPrductData?.product_code,
            ...changedField,
          },
        ];
      }
    }
  };

  // const getRowStyle = (params) => {
  //   if (SelectedStoreDataRef?.current) {
  //     return {
  //       display: "flex",
  //       pointerEvents: "none",
  //       opacity: 0.5,
  //     };
  //   }
  // };

  const getCellStyle = (params) => {
    if (SelectedStoreDataRef?.current) {
      return {
        pointerEvents: "none",
        opacity: 0.5,
      };
    }
    return {};
  };

  useEffect(() => {
    SelectedStoreDataRef.current = props.selectedStoreData;
    agGridInstance?.current?.api.refreshCells({ force: true });
  }, [props.selectedStoreData]);

  return (
    <div>
      <Loader loader={isLoading} minHeight={160}>
        {storeDetailsTableData.length > 0 && (
          <AgGridComponent
            selectAllHeaderComponent={true}
            pagination={false}
            columns={tableColumnConfig}
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            topRightOptions={getTopRightOptions()}
            topLeftOptions={getTopLeftOptions()}
            rowdata={storeDetailsTableData}
            tableHeader="Eligible Stores"
            onBlur={onBlur}
            customSelectCellStyle={getCellStyle}
            hideSelectCurrentPageRecords={true}
            suppressFieldDotNotation
            nestedTable={selectedStoreData && flag}
            nestedTableComponent={
              <ListTableComponent
                scenarioId={scenarioId}
                selectedStoreData={selectedStoreData}
                setSelectedStoreData={setSelectedStoreData}
                onApply={onApply}
                {...props}
              />
            }
            closeButton={true}
            sizeColumnsToFitFlag={true}
            handleCloseButtonClick={() => {
              setSelectedPrductData(null);
              setSelectedStoreData(null);
              setSelectedStoreDataList([]);
            }}
          />
        )}
      </Loader>

      {showSetAllModal && (
        <SetAllStoreGroupModal
          showSetAllModal={showSetAllModal}
          setShowSetAllModal={setShowSetAllModal}
          handleSetAllApply={handleSetAllApply}
        />
      )}
    </div>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getColumnsAg: (params) => dispatch(getColumnsAg(params)),
    getProductStoreView: (payload) =>
      dispatch(getProductStoreViewInCreateScenario(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreDetailsTableComponent);
