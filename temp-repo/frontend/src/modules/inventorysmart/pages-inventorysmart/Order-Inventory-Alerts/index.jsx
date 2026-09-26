import { cloneDeep } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import OrderAlertAction from "./components/OrderAlertAction";

const OrderInventoryAlerts = (props) => {
  const agGridInstance = useRef(null);
  const [showActionLoader, setShowActionLoader] = useState(false);
  const [showAlertAction, setShowAlertsAction] = useState(false);
  const [
    orderInventoryAlertsTableColumns,
    setOrderInventoryAlertsTableColumns,
  ] = useState([]);
  const [selectedAlertsTableData, setSelectedAlertsTableData] = useState(null);

  useEffect(() => {
    setShowAlertsAction(false);
    const fetchColumnData = async () => {
      let formattedColumns = agGridColumnFormatter(props.columnConfig);
      setOrderInventoryAlertsTableColumns(formattedColumns);
    };
    fetchColumnData();
  }, [props.columnConfig]);

  const handleAlertsAction = (data) => {
    setSelectedAlertsTableData(data);
    setShowAlertsAction(true);
  };

  const onReviewClick = (data) => {
    if (data) {
      resetPopupsAndTables();
      setTimeout(() => {
        handleAlertsAction(data);
      }, 0);
    }
  };

  const resetPopupsAndTables = () => {
    setShowAlertsAction(false);
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  return (
    <>
      <Loader
        loader={props.orderAlertsTableDataLoader || props.data.length == 0}
        minHeight={"120px"}
      >
        <AgGridComponent
          columns={orderInventoryAlertsTableColumns}
          rowdata={props?.data}
          pinnedTopRowData={props?.pinnedData}
          onReviewClick={(tableInfo) => onReviewClick(tableInfo.data)}
          uniqueRowId={"id"}
          onGridChanged
          sizeColumnsToFitFlag
          loadTableInstance={loadAlertsTableInstance}
          pagination={false}
        />
      </Loader>
      {showAlertAction && (
        <OrderAlertAction
          data={selectedAlertsTableData}
          setShowActionLoader={setShowActionLoader}
          canEdit={props.canEdit}
          canDelete={props.canDelete}
          canCreate={props.canCreate}
          setReloadKpi={props?.setReloadKpi}
        />
      )}
    </>
  );
};

const mapStateToProps = (order) => {
  return {
    orderInventoryAlertsTableConfigLoader:
      order.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .orderInventoryAlertsTableConfigLoader,
    orderInventoryAlertsTableDataLoader:
      order.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .orderInventoryAlertsTableDataLoader,
    orderAlertsTableDataLoader:
      order.inventorysmartReducer.inventorySmartOrderAlertsService
        .orderAlertsTableDataLoader,
    // inventoryDashboardAlertCount:
    //   store.inventorysmartReducer.inventorySmartKPIService
    //     .inventoryDashboardAlertCount,
  };
};

export default connect(mapStateToProps, null)(OrderInventoryAlerts);
