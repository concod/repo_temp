import { addSnack } from "core/actions/snackbarActions";
import React from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";

const ViewConstraintsTable = (props) => {
  const getServerSideStoreParams = (params) => {
    let filterApplied = params.api.getFilterModel();
    return {
      storeType:
        params.level === 0
          ? "partial"
          : Object.keys(filterApplied).length > 0
          ? "partial"
          : "full",
    };
  };
  return (
    <>
      <Loader loader={props.constraintsLoader}>
        {props.dimension === "store" && (
          <AgGridComponent
            columns={props.columns}
            rowdata={props.rowData}
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
            setAllMaxFieldsInRow={3}
            hideSetAllSuccessMessage={true}
            setAllInterdependentFields={true}
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
      </Loader>
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(ViewConstraintsTable);
