import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import "./filter.scss";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { Button } from "impact-ui-v3";
import { getAllStoreTierList } from "../services/storeMappingService";
import MappedProducts from "./mapped-products";
import { setProductStatusData } from "core/actions/productStoreStatusActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import { configureViewButton } from "./common-mapping-functions";
import AgGridTable from "core/Utils/agGrid";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { useHistory } from "react-router-dom";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

function StoretoProduct(props) {
  const [showloader, setloader] = useState(true);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [storeTableColumns, setstoreTableColumns] = useState([]);
  const [showMappedProduct, setShowMappedProduct] = useState(false);
  const [metaPayload, setMetaPayload] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [selectedStore, setSelectedStore] = useState("");
  const storeTableRef = useRef(null);
  const filterDependencyRef = useRef(null);
  const history = useHistory();

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    getInitialData();
    fetchColumnConfig();
  }, []);

  const onClickFilter = () => {
    if (storeTableRef.current) {
      storeTableRef.current.api.refreshServerSideStore({ purge: true });
    }
  };

  const getInitialData = async () => {
    try {
      let data = await fetchFilterFieldValues(
        "sp mapping store tier list",
        props.savedFilterSelection,
        props.screenName
      );

      if (isEmpty(props.filterDashboardConfiguration)) {
        let filterConfigData = [
          {
            filterDashboardData: data,
            isCrossDimensionFilter: true,
            onReset: onReset,
            screen_name: props.screenName,
          },
        ];
        if (sessionStorage.getItem("currentApp") === "inventorysmart") {
          filterConfigData[0]["saved_filter_screen_name"] =
            "Inventorysmart Store Mapping";
        }
        const filterConfig = formattedFilterConfiguration(
          "storeMappingStoreToProductBandFilterConfiguration",
          filterConfigData,
          "Store Mapping Store To Product"
        );
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      displaySnackMessages(
        error?.response?.data?.message || "Something went wrong.",
        "error"
      );
    }
  };

  const customOnClickFunction = (columns) => {
    return columns.map((item) => {
      if (item.column_name === "mapped_skus") {
        item.cellRenderer = (instance) => {
          let cellData = { ...instance };
          cellData.value = `View`;
          return (
            <CellRenderers cellData={cellData} column={item}></CellRenderers>
          );
        };
        item.onClick = handleViewMappings;
      }
      return item;
    });
  };

  const handleViewMappings = (tableInfo) => {
    setSelectedStore(tableInfo.cellData.data);
    setShowMappedProduct(true);
  };

  const fetchColumnConfig = async () => {
    try {
      let cols = await getColumnsAg("table_name=sp_mapping_store_tier_list")();
      cols = customOnClickFunction(cols);
      setstoreTableColumns(cols);
      setloader(false);
    } catch (error) {
      props.addSnack({
        message:
          error?.response?.data?.message || "Unable to fetch Table Configs",
        options: {
          variant: "error",
        },
      });
    }
  };

  const manualCallBack = async (manualbody, pageIndex, pageSize) => {
    if (!filterDependencyRef.current || !filterDependencyRef.current.length) {
      return {
        data: [],
        total: 0,
      };
    }
    setloader(true);
    try {
      const meta = {
        meta: {
          ...manualbody,
          limit: {
            limit: 10,
            page: pageIndex + 1,
          },
        },
      };
      let body = {
        filters: filterDependencyRef.current,
        ...meta,
      };
      setMetaPayload(meta);
      const response = await getAllStoreTierList(body);
      let formatedData = configureViewButton(response.data.data, "mapped_skus");
      setloader(false);
      return {
        data: formatedData,
        total: response.data.total,
      };
    } catch (err) {
      displaySnackMessages(
        err?.response?.data?.message || "Something went wrong.",
        "error"
      );
      setloader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    filterDependencyRef.current = dependencyData;
    onClickFilter();
  };

  const onReset = () => {
    filterDependencyRef.current = [];
  };

  const onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    setSelectAll(Boolean(event.api?.isSelectAllRecords));
    setSelectedRowsIDs(selectedRows);
  };

  const onModify = () => {
    selectAll
      ? props.toggleSelectAllModify({
          store_filters: {
            filters: [...filterDependencyRef.current],
            ...metaPayload,
          },
        })
      : selectedRowsIDs.length > 0
      ? props.toggleModifyMapping(
          {
            selectedStores: selectedRowsIDs,
          },
          {
            store_filters: {
              filters: [...filterDependencyRef.current],
              ...metaPayload,
            },
          }
        )
      : displaySnackMessages("Please select atleast one store", "error");
  };

  const getTopRightOptions = () => {
    const buttonList = [];

    buttonList.push(
      <Button
        key="storeBandManageException"
        variant="tertiary"
        id="storeBandManageException"
        onClick={() =>
          history.push(
            "/inventory-smart/configuration/manage-exceptions",
            {
              screenName: props.screenName,
              dimension: "store",
            }
          )
        }
      >
        Manage Exceptions
      </Button>
    );

    buttonList.push(
      <Button
        key="storetoproductModifyBtn"
        variant="primary"
        id="storetoproductModifyBtn"
        onClick={onModify}
        // disabled={!selectedRowsIDs.length}
      >
        Modify
      </Button>
    );

    return buttonList;
  };

  const renderContent = () => {
   return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
        <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showPageRoute={false}
        showPageHeader={false}
        showFilterDashboard={true}
        filterConfigKey={"storeMappingStoreToProductBandFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
      >
        <Loader loader={showloader}>
          <div data-testid="filterContainer">
            {showMappedProduct && (
              <MappedProducts
                data={selectedStore}
                onModify={(dataBody) => {
                  selectAll
                    ? props.toggleSelectAllModify(
                      {
                        store_filters: {
                          filters: [...filterDependencyRef.current],
                          ...metaPayload,
                        },
                      },
                      true
                    )
                    : props.toggleModifyMapping(
                      {
                        selectedStores: dataBody.selectedStores,
                      },
                      {
                        store_filters: {
                          filters: [...filterDependencyRef.current],
                          ...metaPayload,
                        },
                      },
                      true
                    );
                  setShowMappedProduct(false);
                }}
                onCancel={() => {
                  setShowMappedProduct(false);
                }}
              ></MappedProducts>
            )}

            <div data-testid="resultContainer">
              <AgGridTable
                columns={storeTableColumns}
                selectAllHeaderComponent={true}
                sizeColumnsToFitFlag
                onGridChanged
                onRowSelected
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                loadTableInstance={(gridInstance) => {
                  storeTableRef.current = gridInstance;
                }}
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                uniqueRowId={"psa_name"}
                onSelectionChanged={onSelectionChanged}
                disableSelectionOnSelectAll={true}
                topRightOptions={getTopRightOptions()}
              />
            </div>
          </div>
        </Loader>
      </CoreComponentScreen>
   </div>
   )
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}
const mapStateToProps = (state) => {
  return {
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
      "storeMappingStoreToProductBandFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    addSnack: (snackObject) => dispatch(addSnack(snackObject)),
    setFilterConfiguration: (filterConfig) =>
      dispatch(setFilterConfiguration(filterConfig)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoretoProduct);
