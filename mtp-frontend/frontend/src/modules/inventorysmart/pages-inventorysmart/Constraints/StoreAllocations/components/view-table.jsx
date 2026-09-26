import { addSnack } from "core/actions/snackbarActions";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { STORE_WEEK_ID } from "../constants";

const ViewConstraintsTable = (props) => {
  const [rowGroupProps, setRowGroupProps] = useState({});

  const getServerSideStoreParams = (params) => {
    return {
      storeType: params.level === 0 ? "partial" : "full",
    };
  };

  const { tpc_disable_props } =
    props.inventorysmartScreenConfig?.inventorysmart_constraints || {};

  useEffect(() => {
    if(tpc_disable_props) {
      setRowGroupProps({});

      return;
    }

    setRowGroupProps({
      childKey: "stores",
      treeData: true,
      purgeClosedRowNodes: true,
      hideChildSelection: true,
      groupDisplayType: "custom",
    });
  }, [tpc_disable_props]);

  return (
    <>
      <Loader loader={props.constraintsLoader}>
        {props.dimension === "store" && (
          <AgGridComponent
            columns={props.columns}
            // rowdata={props.rowData}
            manualCallBack={(body, pageIndex, params) =>
              props.manualCallBackStore(body, pageIndex, params)
            }
            rowModelType={"serverSide"}
            serverSideStoreType="partial"
            selectAllHeaderComponent={true}
            // hideSelectAllRecords={true}
            onRowSelected
            cacheBlockSize={10}
            totalCount={100} // to set the total count once received from BE
            loadTableInstance={props.loadTableInstance} // to make use of available grid api's
            onBlur={(
              e,
              data,
              column,
              isChanged,
              value,
              initialValue,
              cellData
            ) =>
              props.onBlur(
                e,
                data,
                column,
                isChanged,
                value,
                initialValue,
                cellData,
                "store"
              )
            }
            uniqueRowId={"uniqueKey"}
            setAlllayout={"vertical"}
            onSetAllApply={props.onSetAllApply}
            setAllButtonLabel={"Save"}
            setAllMaxFieldsInRow={3}
            hideSetAllSuccessMessage={true}
            setAllInterdependentFields={true}
            {...rowGroupProps}
            onCellValueChanged={props.onCellValueChanged}
          />
        )}
        {props.dimension === "store_grade" && (
          <AgGridComponent
            columns={props.columns}
            manualCallBack={(body, pageIndex) =>
              props.manualCallBackStoreGrade(body, pageIndex)
            }
            onRowSelected
            rowModelType={"serverSide"}
            treeData={true}
            groupDisplayType={"custom"}
            serverSideStoreType="partial"
            getServerSideStoreParams={getServerSideStoreParams}
            cacheBlockSize={10}
            totalCount={100} // to set the total count once received from BE
            loadTableInstance={props.loadTableInstance} // to make use of available grid api's
            getSubRowsRequest={props.getStoreGradeSubRowsRequest}
            onBlur={(
              e,
              data,
              column,
              isChanged,
              value,
              initialValue,
              cellData
            ) =>
              props.onBlur(
                e,
                data,
                column,
                isChanged,
                value,
                initialValue,
                cellData,
                "store_grade"
              )
            }
            childKey={"sub_row"}
          />
        )}
        {props.dimension === "store_group" && (
          <AgGridComponent
            columns={props.columns}
            manualCallBack={(body, pageIndex) =>
              props.manualCallBackStoreGroup(body, pageIndex)
            }
            onRowSelected
            rowModelType={"serverSide"}
            treeData={true}
            groupDisplayType={"custom"}
            serverSideStoreType="partial"
            cacheBlockSize={10}
            getServerSideStoreParams={getServerSideStoreParams}
            totalCount={100} // to set the total count once received from BE
            loadTableInstance={props.loadTableInstance} // to make use of available grid api's
            getSubRowsRequest={props.getStoreGroupSubRowsRequest}
            onBlur={(
              e,
              data,
              column,
              isChanged,
              value,
              initialValue,
              cellData
            ) =>
              props.onBlur(
                e,
                data,
                column,
                isChanged,
                value,
                initialValue,
                cellData,
                "store_group"
              )
            }
            store
            childKey={"sub_row"}
          />
        )}
        {props.dimension === STORE_WEEK_ID && (
          <AgGridComponent
            columns={props.columns}
            manualCallBack={(body, pageIndex, params) =>
              props.manualCallBackStoreWeek(body, pageIndex, params)
            }
            rowModelType={"serverSide"}
            serverSideStoreType="partial"
            selectAllHeaderComponent={true}
            onRowSelected
            cacheBlockSize={10}
            totalCount={100} // to set the total count once received from BE
            loadTableInstance={props.loadTableInstance} // to make use of available grid api's
            onBlur={(
              e,
              data,
              column,
              isChanged,
              value,
              initialValue,
              cellData
            ) =>
              props.onBlur(
                e,
                data,
                column,
                isChanged,
                value,
                initialValue,
                cellData,
                STORE_WEEK_ID
              )
            }
            setAlllayout={"vertical"}
            uniqueRowId={"uniqueKey"}
            onSetAllApply={props.onSetAllApply}
            setAllButtonLabel={"Save"}
            setAllMaxFieldsInRow={3}
            hideSetAllSuccessMessage={true}
            setAllInterdependentFields={true}
            onCellValueChanged={props.onStoreWeekCellValueChanged}
          />
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ViewConstraintsTable);
