import { cloneDeep } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import AlertsAction from "./components/AlertsAction";

const StoreInventoryAlerts = (props) => {
  const agGridInstance = useRef(null);
  const inventoryAlertsCount = useRef([]);

  const [showActionLoader, setShowActionLoader] = useState(false);
  const [showAlertAction, setShowAlertsAction] = useState(false);
  const [
    storeInventoryAlertsTableColumns,
    setStoreInventoryAlertsTableColumns,
  ] = useState([]);
  const [selectedAlertsTableData, setSelectedAlertsTableData] = useState(null);

  useEffect(() => {
    const fetchColumnData = async () => {
      let formattedColumns = agGridColumnFormatter(props.columnConfig);
      setStoreInventoryAlertsTableColumns(formattedColumns);
    };
    fetchColumnData();
  }, [props.columnConfig]);

  useEffect(() => {
    if (props.inventoryDashboardAlertCount?.[props.screen]?.length > 0) {
      inventoryAlertsCount.current = cloneDeep(
        props.inventoryDashboardAlertCount?.[props.screen]
      );
    }
  }, [props.inventoryDashboardAlertCount?.[props.screen]]);

  const handleAlertsAction = (data) => {
    setSelectedAlertsTableData(data);
    setShowAlertsAction(true);
  };

  const onReviewClick = (data) => {
    if (data?.level) {
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
        loader={
          props.storeInventoryAlertsTableConfigLoader ||
          props.storeInventoryAlertsTableDataLoader ||
          showActionLoader
        }
        minHeight={"120px"}
      >
        <AgGridComponent
          columns={storeInventoryAlertsTableColumns}
          rowdata={props.data}
          pinnedTopRowData={props.pinnedData}
          onReviewClick={(tableInfo) => onReviewClick(tableInfo.data)}
          uniqueRowId={"index"}
          loadTableInstance={loadAlertsTableInstance}
          pagination={false}
          btnVariant={'text'}
        />
      </Loader>
      {showAlertAction && (
        <AlertsAction
          ref={inventoryAlertsCount}
          screen={props.screen}
          data={selectedAlertsTableData}
          setShowActionLoader={setShowActionLoader}
          canEdit={props.canEdit}
          canDelete={props.canDelete}
          canCreate={props.canCreate}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    storeInventoryAlertsTableConfigLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableConfigLoader,
    storeInventoryAlertsTableDataLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableDataLoader,
    inventoryDashboardAlertCount:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardAlertCount,
  };
};

export default connect(mapStateToProps, null)(StoreInventoryAlerts);
