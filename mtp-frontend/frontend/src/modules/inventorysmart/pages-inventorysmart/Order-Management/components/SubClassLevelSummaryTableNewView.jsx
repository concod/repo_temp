import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  tableArticleFilter,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getOmsSubClassLevelSummaryTableData,
  setOrderManagementSubClassLevelSummaryTableLoader,
  getOmsSubClassLevelSummaryTableConfig,
  setSelectedFilters,
  setOrderManagementSubClassLevelSummaryConfigLoader,
  setOrderManagementSubClassLevelSummaryNewViewTableConfig,
  setOrderManagementSubClassLevelSummaryNewViewTableData,
  getOmsSubClassLevelSummaryNewViewTableConfig,
  getOmsSubClassLevelSummaryNewTableData,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import { isEmpty } from "lodash";
import {
  setFormFilters,
  setInventorySmartFinalizeFilterDependency,
  setRedirectedFrom,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { getOrderRepoSubClassLevelSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Order-Repository/order-repository-service";

const SubClassLevelSummaryTableNewView = (props) => {
  const [pastAllocationTableColumns, setPastAllocationTableColumns] = useState(
    []
  );
  const [pastAllocationTableData, setPastAllocationTableData] = useState([]);
  const selectedSku = useRef([]);
  const [render, setRender] = useState(false);
  const newTableRef = useRef();
  const [newViewData, setNewViewData] = useState([]);
  const [showNewTable, setShowNewTable] = useState(false);
  const [newTableColumns, setNewTableColumns] = useState([]);
  const [details, setDetails] = useState({
    subclass: "",
    assetmemo: "",
    channel: "",
  });
  const [totalRow, setTotalRow] = useState([]);
  const [isFilterChanged, setIsFilterChanged] = useState(false);
  const subClassSummaryTableGridInstance = useRef({});

  const onClickColumn = async (data) => {
    try {
      setNewViewData([]);
      props.setOrderManagementSubClassLevelSummaryNewViewTableConfig(true);
      let columns = await props.getOmsSubClassLevelSummaryNewViewTableConfig();
      newTableRef.current?.scrollIntoView({ behavior: "smooth" });
      let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
      setNewTableColumns(formattedColumns);
      props.setOrderManagementSubClassLevelSummaryNewViewTableConfig(false);

      selectedSku.current = props.selectedOmsSku;
      if (props.isRedirectedFromDifferentPage) {
        var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
        skuFilter.values = [...selectedSku.current];
      }
      var body = {
        filters: props.isRedirectedFromDifferentPage
          ? [...props.selectedFilters, skuFilter]
          : [...props.selectedFilters],
        date_filter: [props.ropDate, props.recommRecieptDate],
        meta: {
          range: [],
          search: [],
          sort: [],
          limit: { limit: 1, page: 1 },
        },
        subclasses: [data?.l2_name],
        asset_memo_list: [data?.planning_ownership],
        product_channel_list: [data?.product_channel_name],
      };
      setDetails({
        subclass: data?.l2_name,
        assetmemo: data?.planning_ownership,
        channel: data?.product_channel_name,
      });
      props.setOrderManagementSubClassLevelSummaryNewViewTableData(true);
      let response = await props.getOmsSubClassLevelSummaryNewTableData(body);
      if (response.data.status) {
        response?.data?.data.map((val, i) => (val.id = i));
        setNewViewData(response?.data?.data);
        props.setOrderManagementSubClassLevelSummaryNewViewTableData(false);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderManagementSubClassLevelSummaryNewViewTableData(false);
    }
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        setNewViewData([]);
        setPastAllocationTableData([]);
        props.setOrderManagementSubClassLevelSummaryConfigLoader(true);
        setShowNewTable(false);
        let columns = await props.getOmsSubClassLevelSummaryTableConfig();

        columns?.data?.data?.data.map((col) => {
          if (col.label === "Subclass") {
            col.type = "link";
            col.is_editable = true;
          }
        });
        let cols = columns?.data?.data?.data.map((item) => {
          item.onClick = (tableInfo) => {
            setShowNewTable(true);
            onClickColumn(tableInfo?.cellData?.data || {});
          };
          return item;
        });

        let formattedColumns = agGridColumnFormatter(
          columns?.data?.data?.data,
          null
        );
        setPastAllocationTableColumns(formattedColumns);
        props.setOrderManagementSubClassLevelSummaryConfigLoader(false);

        selectedSku.current = props.selectedOmsSku;

        if (props.isRedirectedFromDifferentPage) {
          var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
          skuFilter.values = [...selectedSku.current];
        }

        var body = {
          filters: props.isRedirectedFromDifferentPage
            ? [...props.selectedFilters, skuFilter]
            : [...props.selectedFilters],
          date_filter: [props.ropDate, props.recommRecieptDate],
          meta: {
            range: [],
            search: [],
            sort: [],
            // limit: { limit: 1, page: 1 },
          },
        };
        props?.setOrderManagementSubClassLevelSummaryTableLoader(true);

        let response = await props.getOmsSubClassLevelSummaryTableData(body);
        if (response.data.status) {
          setPastAllocationTableData(response?.data?.data);
          let totalObj = {};
          response?.data?.data?.map((data) => {
            Object.keys(data).map((key) => {
              totalObj[key] = (totalObj[key] || 0) + data[key];
            });
          });
          delete totalObj.product_channel_name;
          delete totalObj.planning_ownership;
          delete totalObj.l2_name;
          totalObj.product_channel_name = "-";
          totalObj.planning_ownership = "Grand Total";
          setTotalRow([totalObj]);
          props?.setOrderManagementSubClassLevelSummaryTableLoader(false);
        }
        setRender(true);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    if (props?.reloadKpi === null || props?.reloadKpi === true) {
      if (props?.selectedFilters?.length > 0) {
        fetchColumnConfig();
      }
    }
  }, [props.selectedFilters, props?.reloadKpi]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && setRender(false);
  }, [props.selectedFilters]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    subClassSummaryTableGridInstance.current = params;
  };

  useEffect(() => {
    if (subClassSummaryTableGridInstance?.current?.api && isFilterChanged) {
      let filteredTableData = [];
      subClassSummaryTableGridInstance.current.api.forEachNodeAfterFilterAndSort(
        (node) => {
          filteredTableData.push(node.data);
        }
      );
      if (filteredTableData?.length) {
        let totalObj = {};
        filteredTableData?.map((data) => {
          Object.keys(data).map((key) => {
            totalObj[key] = (totalObj[key] || 0) + data[key];
          });
        });
        delete totalObj.product_channel_name;
        delete totalObj.planning_ownership;
        delete totalObj.l2_name;
        totalObj.product_channel_name = "-";
        totalObj.planning_ownership = "Grand Total";
        setTotalRow([totalObj]);
        setIsFilterChanged(false);
      }
    }
  }, [subClassSummaryTableGridInstance.current, isFilterChanged]);
  return (
    <>
      <div>
        <Loader
          loader={
            props.orderManagementSubClassLevelSummaryConfigLoader ||
            props.orderManagementSubClassLevelSummaryTableLoader
          }
          minHeight={"260px"}
        >
          {render && pastAllocationTableColumns?.length && (
            <AgGridComponent
              columns={pastAllocationTableColumns}
              rowdata={pastAllocationTableData}
              //sideBar={false}
              pagination={true}
              pinnedBottomRowData={totalRow}
              loadTableInstance={loadTableInstance}
              downloadAsExcel
              downloadStyle={true}
              setIsFilterChanged={setIsFilterChanged}
            />
          )}
        </Loader>
        {showNewTable && (
          <>
            <Loader
              loader={
                props.orderManagementSubClassLevelSummaryNewViewTableDataLoader ||
                props.orderManagementSubClassLevelSummaryNewViewTableConfigLoader
              }
            >
              <div style={{ display: "flex", marginTop: "23px" }}>
                <h4 style={{ fontWeight: "500" }}>
                  Subclass :- {details?.subclass}
                </h4>
                <h4 style={{ marginLeft: "27px", fontWeight: "500" }}>
                  Asset Memo :- {details?.assetmemo}
                </h4>
                <h4 style={{ marginLeft: "27px", fontWeight: "500" }}>
                  Channel :- {details?.channel}
                </h4>
              </div>
              <div ref={newTableRef} style={{ marginTop: "13px" }}>
                <AgGridComponent
                  columns={newTableColumns}
                  rowdata={newViewData}
                  sideBar={false}
                  pagination={true}
                  uniqueRowId={"id"}
                />
              </div>
            </Loader>
          </>
        )}
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    orderManagementSubClassLevelSummaryNewViewTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSubClassLevelSummaryNewViewTableDataLoader,
    orderManagementSubClassLevelSummaryNewViewTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSubClassLevelSummaryNewViewTableConfigLoader,
    orderManagementSubClassLevelSummaryConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSubClassLevelSummaryConfigLoader,
    orderManagementSubClassLevelSummaryTableLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSubClassLevelSummaryTableLoader,
    selectedOmsSku:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedSku,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedFilters,
    inventorysmartPastAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationFilterDependency,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderManagementSubClassLevelSummaryNewViewTableConfig: (payload) =>
    dispatch(setOrderManagementSubClassLevelSummaryNewViewTableConfig(payload)),
  setOrderManagementSubClassLevelSummaryNewViewTableData: (payload) =>
    dispatch(setOrderManagementSubClassLevelSummaryNewViewTableData(payload)),
  getOmsSubClassLevelSummaryNewViewTableConfig: (payload) =>
    dispatch(getOmsSubClassLevelSummaryNewViewTableConfig(payload)),
  setOrderManagementSubClassLevelSummaryConfigLoader: (payload) =>
    dispatch(setOrderManagementSubClassLevelSummaryConfigLoader(payload)),
  getOmsSubClassLevelSummaryTableConfig: (payload) =>
    dispatch(getOmsSubClassLevelSummaryTableConfig(payload)),
  getOmsSubClassLevelSummaryNewTableData: (payload) =>
    dispatch(getOmsSubClassLevelSummaryNewTableData(payload)),
  setOrderManagementSubClassLevelSummaryTableLoader: (payload) =>
    dispatch(setOrderManagementSubClassLevelSummaryTableLoader(payload)),
  getOmsSubClassLevelSummaryTableData: (payload) =>
    dispatch(getOmsSubClassLevelSummaryTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setFormFilters: (payload) => dispatch(setFormFilters(payload)),
  setInventorySmartFinalizeFilterDependency: (payload) =>
    dispatch(setInventorySmartFinalizeFilterDependency(payload)),
  setRedirectedFrom: (payload) => dispatch(setRedirectedFrom(payload)),
  getOrderRepoSubClassLevelSummaryTableConfig: (payload) =>
    dispatch(getOrderRepoSubClassLevelSummaryTableConfig(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SubClassLevelSummaryTableNewView);
