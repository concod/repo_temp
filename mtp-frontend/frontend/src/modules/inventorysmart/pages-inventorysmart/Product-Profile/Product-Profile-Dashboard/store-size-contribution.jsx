import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";

import { Paper, Typography, Tabs, Tab, Button } from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";

import {
  setProductProfileTableLoader,
  getStyleColorDescriptionData,
  getStoreSizeContributionForUserData,
  updateUserStoreContribution,
  setStyleColorDescriptionData,
  setInitialUserStoreSizeContributionData,
  setStoreSizeContributionData
} from "../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import {ERROR_MESSAGE,USER_RESERVE_PERCENTAGE_VALIDATION_MSG,NEGATIVE_VALUE_VALIDATION_MSG,UPDATED_MESSAGE, COLUMNS_TO_DISABLE} from "../../../constants-inventorysmart/stringConstants";
import { scrollIntoView } from "../../inventorysmart-utility";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const StoreSizeContributionComponent = (props) => {
  const [storeSizeTabValue, setStoreSizeTabValue] = useState(0);
  const [storeSizeContributionColumns, setStoreSizeContributionColumns] =
    useState([]);
  const [storeSizeContributionData, setStoreSizeContributionData] = useState(
    []
  );
  const userStoreContributionUpdateRef = useRef([]);
  const userStoreContributionRef = useRef({});
  const [userStoreContributionUpdate,setUserStoreContributionUpdate] = useState([]);
  const [penetrationColumns, setPenetrationColumns] = useState([]);
  const [penetrationData, setPenetrationData] = useState([]);
  const [styleColorDescColumns, setStyleColorDescColumns] = useState([]);
  const [styleColorDescData, setStyleColorDescData] = useState([]);
  const [pinnedRow, setPinnedRow] = useState([]);
  const [pinnedRowUserCreated, setPinnedRowUserCreated] = useState([]);
  const [downloadFormatChipsDependency, setDownloadFormatChipsDependency] =
    useState({});

  const storeSizeTableRef = useRef();

  const tabProps = (index) => {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  };
  const globalClasses = globalStyles();
  const setUserStoreContributionTableInstance = (params) => {
    userStoreContributionRef.current = params;
  };
  useEffect(() => {
    // on intial load set store and size contribution api
    if (!isEmpty(props.storeSizeContributionTableData)) {
      if (props.tabState === 0) {
        let copyOfStoreSizeContributionData = cloneDeep(
          props.storeSizeContributionTableData?.columns
        );
        let storeSizeColDef = agGridColumnFormatter(
          copyOfStoreSizeContributionData
        );
        setStoreSizeContributionColumns(storeSizeColDef);
        let sortedRows = cloneDeep(
          props.storeSizeContributionTableData?.data
        )?.sort((a, b) => b.overall_proportion - a.overall_proportion);
        const index = sortedRows.findIndex((obj) => obj.store_name === "Total");
        if (index !== -1) {
          let toPin = sortedRows.splice(index, 1);
          setPinnedRow(toPin);
        }
        setStoreSizeContributionData(sortedRows);
      }
      scrollIntoView(storeSizeTableRef);
      props.setProductProfileTableLoader(false);
    }
  }, [props.tabState, props.storeSizeContributionTableData]);
  useEffect(() => {
    if (!isEmpty(userStoreContributionUpdate))
      userStoreContributionUpdateRef.current = cloneDeep(
        userStoreContributionUpdate
      );
  }, [userStoreContributionUpdate]);
  useEffect(() => {
    // to fix the issue related to updating table data when user is on tab one and selects a diff prod profile
    setStoreSizeTabValue(0);
  }, [props.selectedPPCode]);
  const setCellsToBeDisabled = (row, _item) => {
    // disable editing on the header row
    return row.store_name === "Total" ? true : false;
  };
  useEffect(() => {
    if (storeSizeTabValue === 0) {
      if (!isEmpty(props.storeSizeContributionTableData)) {
        let copyOfStoreSizeContributionData = cloneDeep(
          props.storeSizeContributionTableData?.columns
        );
        let penetrationColDef = agGridColumnFormatter(
          copyOfStoreSizeContributionData
        );
        penetrationColDef.forEach((item) => {
          if (item.column_name === "overall_proportion") {
            item.disabled = setCellsToBeDisabled;
          }
          //disable the row present in COLUMNS_TO_DISABLE as a common requirement but based on config "disablePinnedRows"
          if (
            props?.productProfileConfig?.disablePinnedRows &&
            COLUMNS_TO_DISABLE.includes(item.column_name)
          ) {
            item.children?.forEach((subCol) => {
              subCol.disabled = setCellsToBeDisabled;
            });
          }
        })

        setPenetrationColumns(penetrationColDef);
        let sortedRows = cloneDeep(
          props.storeSizeContributionTableData?.data
        )?.sort((a, b) => b.overall_proportion - a.overall_proportion);
        const index = sortedRows.findIndex((obj) => obj.store_name === "Total");
        if (index !== -1) {
          let toPin = sortedRows.splice(index, 1);
          setPinnedRowUserCreated(toPin);
        }
        setPenetrationData(sortedRows);
        props.setInitialUserStoreSizeContributionData(cloneDeep(sortedRows));
        setStyleColorDescColumns([]);
        setStyleColorDescData([]);
      }
    } else {
      (async () => {
        props.setProductProfileTableLoader(true);
        try {
          let styleColorColumnDef = await getColumnsAg(
            "table_name=product_profile_style_color_table"
          )();
          setStyleColorDescColumns(styleColorColumnDef);
          let response = await props.getStyleColorDescriptionData(
            props.selectedPPCode
          );
          props.setStyleColorDescriptionData(response.data.data);
          props.setProductProfileTableLoader(false);
          setPenetrationColumns([]);
          setPenetrationData([]);
        } catch (e) {
          props.setProductProfileTableLoader(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setInitialUserStoreSizeContributionData(cloneDeep([]));
        }
      })();
    }
  }, [storeSizeTabValue, props.storeSizeContributionTableData]);

  useEffect(() => {
    // store style color desc data in state n pass to table
    if (!isEmpty(props.styleColorDescriptionData))
      setStyleColorDescData(props.styleColorDescriptionData);
  }, [props.styleColorDescriptionData]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleChange = (_event, newValue) => {
    setStoreSizeTabValue(newValue);
  };

  const getRowStyle = (params) => {
    if (params.node.rowPinned) {
      return { fontWeight: "bold" };
    }
  };
  const preparePaylodOnEdit = () => {
    return userStoreContributionUpdate.map((item) => {
      let originalStoreContributionRow = props.initialUserStoreSizeContributionTableData.find(
        (obj) => obj.store_code === item.store_code
      );
      return {
        store_code: item.store_code,
        original_overall_proportion:
          originalStoreContributionRow.overall_proportion / 100,
        new_overall_proportion:
          originalStoreContributionRow.overall_proportion ===
          parseFloat(item.overall_proportion)
            ? null
            : parseFloat(item.overall_proportion) / 100, // if overall_proportion value has not changed send null
      };
    });
  };
  const saveUserCreatedStoreContributionPercentage = async () => {
    props.setProductProfileTableLoader(true);
    try {
       let body = {
        pp_code: props.selectedPPCode,
        data: preparePaylodOnEdit(),
      };
      let response = await props.updateUserStoreContribution({
        body: body
      });
      if (response.data.status) {
        setUserStoreContributionUpdate([])
        let response=await props.getStoreSizeContributionForUserData(props.queryParam)
        props.setStoreSizeContributionData(response.data.data)
        displaySnackMessages(UPDATED_MESSAGE, "success");
        props.setProductProfileTableLoader(false);
      }
      
    } catch(error) {
      props.setProductProfileTableLoader(false);
      setUserStoreContributionUpdate([])
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };
  const updateEditedRowState = (data) => {
    let cloneRefInstance = cloneDeep(userStoreContributionUpdateRef.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => Number(obj.store_code) === Number(data.store_code)
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setUserStoreContributionUpdate(cloneRefInstance);
    } else {
      // Push the new object to the state
      setUserStoreContributionUpdate((prevState) => [...prevState, data]);
    }
  };
  const onBlur = async (_e, data, column, isChanged, value, initialValue) => {
    if (isChanged && parseFloat(value) !== parseFloat(initialValue)) {
      if (parseFloat(value) > 100) {
        data[column.colId] = initialValue;
        displaySnackMessages(USER_RESERVE_PERCENTAGE_VALIDATION_MSG, "warning");
      } else if (parseFloat(value) < 0) {
        data[column.colId] = initialValue;
        displaySnackMessages(NEGATIVE_VALUE_VALIDATION_MSG, "warning");
      } else {
        data[column.colId] = value;
        updateEditedRowState(data);
      }
      userStoreContributionRef.current?.api?.refreshCells({
        columns: [column.colId],
      });
    }
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let l_downloadFormatChipsDependency = cloneDeep(downloadFormatChipsDependency);
      l_downloadFormatChipsDependency.product.value = downloadFormatChipsDependency.product.value.map((str)=> replaceSpecialCharacter(str ));
      let prependContentReq = prependExtraData(l_downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);

  return (
    <Paper ref={storeSizeTableRef}>
      <Typography variant="h5" className={globalClasses.paperHeader}>
        {props.dynamicLabels?.article === "Product"
          ? "Store and size contributions"
          : "Store contributions"}
      </Typography>
      {props.tabState === 0 && (
        <AgGridComponent
          rowdata={storeSizeContributionData}
          columns={storeSizeContributionColumns}
          uniqueRowId={"store_code"}
          sizeColumnsToFitFlag
          downloadAsExcel={true}
          disableExcelDownload={
            storeSizeContributionData?.length ? false : true
          }
          pagination={false}
          getRowStyle={getRowStyle}
          pinnedTopRowData={pinnedRow}
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
        />
      )}
      {props.tabState === 1 && (
        <>
          <Tabs
            value={storeSizeTabValue}
            onChange={handleChange}
            aria-label="store-size-contribution-tabs"
          >
            <Tab label="Penetration" {...tabProps(0)} />
            <Tab
              label={`${dynamicLabelsBasedOnTenant("article")} Description`}
              {...tabProps(1)}
            />
          </Tabs>
          {storeSizeTabValue === 0 && (
            <>
              {(props.inventorysmartScreenConfig?.client === "signet" || props.productProfileConfig?.enableSaveEdit) && (
                <div
                  className={`${globalClasses.layoutAlignEnd} ${globalClasses.marginVertical1rem}`}
                >
                  <Button
                    color="primary"
                    variant="contained"
                    disabled={!userStoreContributionUpdate.length}
                    onClick={saveUserCreatedStoreContributionPercentage}
                  >
                    Save Edits
                  </Button>
                </div>
              )}
              <AgGridComponent
                rowdata={penetrationData}
                columns={penetrationColumns}
                uniqueRowId={"store_code"}
                sizeColumnsToFitFlag
                downloadAsExcel={true}
                disableExcelDownload={penetrationData?.length ? false : true}
                pagination={false}
                onBlur={onBlur}
                toPrependContent={props.excelDownloadMetaData}
                prependedContentDetails={prependData()}
                loadTableInstance={setUserStoreContributionTableInstance}
                getRowStyle={getRowStyle}
                pinnedTopRowData={pinnedRowUserCreated}
              />
            </>
          )}{" "}
          {storeSizeTabValue === 1 && (
            <AgGridComponent
              rowdata={styleColorDescData}
              columns={styleColorDescColumns}
              uniqueRowId={"article"}
              sizeColumnsToFitFlag
              downloadAsExcel={true}
              disableExcelDownload={styleColorDescData?.length ? false : true}
              toPrependContent={props.excelDownloadMetaData}
              prependedContentDetails={prependData()}
              pagination={
                !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                  "MPUserCreatedStoreContributionsMaterialDescription"
                )
              }
            />
          )}
        </>
      )}
    </Paper>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    initialUserStoreSizeContributionTableData:
      inventorysmartReducer.productProfileDashboardReducer
        .initialUserStoreSizeContributionTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    storeSizeContributionTableData:
      inventorysmartReducer.productProfileDashboardReducer
        .storeSizeContributionTableData,
    styleColorDescriptionData:
      inventorysmartReducer.productProfileDashboardReducer
        .styleColorDescriptionData,
    dynamicLabels:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "productProfileFilterConfiguration"
      ]?.appliedFilterData,
    excelDownloadMetaData:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    productProfileConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_create_product_profile,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setProductProfileTableLoader: (body) =>
      dispatch(setProductProfileTableLoader(body)),
    getStyleColorDescriptionData: (pp_code) =>
      dispatch(getStyleColorDescriptionData(pp_code)),
    setStyleColorDescriptionData: (pp_code) =>
      dispatch(setStyleColorDescriptionData(pp_code)),
    updateUserStoreContribution: (body) =>
      dispatch(updateUserStoreContribution(body)),
    setInitialUserStoreSizeContributionData: (body) =>
      dispatch(setInitialUserStoreSizeContributionData(body)),
    getStoreSizeContributionForUserData: (body) =>
      dispatch(getStoreSizeContributionForUserData(body)),
    setStoreSizeContributionData: (body) =>
      dispatch(setStoreSizeContributionData(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreSizeContributionComponent);
