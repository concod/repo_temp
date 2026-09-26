import React, { useEffect, useState } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import AgGridComponent from "core/Utils/agGrid";

import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

import {
  getFutureReceiptsSubRowsData,
  setFutureReceiptsLoader,
  saveFutureReceiptsTargetWos,
} from "../../../services-inventorysmart/Allocation-Reports/future-receipts-service";
import {
  REPORTS_TARGET_WOS_PAYLOAD,
  ERROR_MESSAGE,
  FUTURE_RECEIPTS_SUB_ROWS_PAYLOAD,
} from "../../../constants-inventorysmart/stringConstants";

const SubRowsComponent = (props) => {
  const [futureReceiptsSubRowsCols, setFutureReceiptsSubRowsCols] = useState(
    []
  );
  const [futureReceiptsSubRowsData, setFutureReceiptsSubRowsData] = useState(
    []
  );
  const [futureReceiptsSubRowsLoader, setFutureReceiptsSubRowsLoader] =
    useState(false);

  const globalClasses = globalStyles();

  const setCellsToBeDisabled = (row) => {
    // disable the header target_wos row
    return row.target_wos === "-" ? true : false;
  };

  useEffect(async () => {
    if (!isEmpty(props.node?.data))
      try {
        setFutureReceiptsSubRowsLoader(true);
        let filterSubRowReq = FUTURE_RECEIPTS_SUB_ROWS_PAYLOAD.map((item) => {
          let arr = item.attribute_name;
          return {
            ...item,
            values: [props.node.data[arr]],
          };
        });
        let reqBody = {
          filters: filterSubRowReq,
        };
        let { data } = await props.getFutureReceiptsSubRowsData(reqBody);
        let clonedColumnConfig = cloneDeep(data.data?.columns);
        let formattedColumns = agGridColumnFormatter(clonedColumnConfig);
        formattedColumns = formattedColumns.map((obj) => {
          if (obj.column_name === "target_wos") {
            obj.disabled = setCellsToBeDisabled;
          }
          return obj;
        });
        setFutureReceiptsSubRowsCols(formattedColumns);
        setFutureReceiptsSubRowsData(data.data?.table_data);
        setFutureReceiptsSubRowsLoader(false);
      } catch (err) {
        setFutureReceiptsSubRowsLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
  }, [props.node]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onBlur = async (_e, data, _column, _isChanged, value, initialValue) => {
    // call the update API only when the value of that particular row has changed
    if (value === 0 || value === "") {
      displaySnackMessages("Value entered must be greater than 0", "error");
    } else {
      if (value !== initialValue) {
        setFutureReceiptsSubRowsLoader(true);
        try {
          let filterReqBody = REPORTS_TARGET_WOS_PAYLOAD.map((obj) => {
            let attribute = obj.attribute_name;
            return {
              ...obj,
              values: [data[attribute]],
            };
          });
          let body = {
            filters: filterReqBody,
            target_wos: data.target_wos,
          };
          await props.saveFutureReceiptsTargetWos(body);
          displaySnackMessages("WOS updated successfully", "success");
          setFutureReceiptsSubRowsLoader(false);
        } catch (err) {
          setFutureReceiptsSubRowsLoader(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      }
    }
  };

  const getRowStyle = (params) => {
    // Only the row with aggregation sum has to be highlighted
    if (params.rowIndex === 0 && params.data.target_wos === "-") {
      return { background: "rgb(217, 219, 222, 0.5)" };
    }
  };

  return (
    <Loader loader={futureReceiptsSubRowsLoader}>
      <div className={globalClasses.paddingAround}>
        <AgGridComponent
          rowdata={futureReceiptsSubRowsData}
          columns={futureReceiptsSubRowsCols}
          uniqueRowId={"key"}
          onBlur={onBlur}
          getRowStyle={getRowStyle}
          sideBar={false}
        />
      </div>
    </Loader>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    getFutureReceiptsSubRowsData: (body) =>
      dispatch(getFutureReceiptsSubRowsData(body)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    setFutureReceiptsLoader: (body) => dispatch(setFutureReceiptsLoader(body)),
    saveFutureReceiptsTargetWos: (body) =>
      dispatch(saveFutureReceiptsTargetWos(body)),
  };
};

export default connect("", mapDispatchToProps)(SubRowsComponent);
