import React, { useState, useEffect, useRef } from "react";

import { isEmpty } from "lodash";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";

import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import SubRowsComponent from "./subrows";

const FutureReceiptsViewTableComponent = (props) => {
  const [futureReceiptsColumn, setFutureReceiptsColumn] = useState([]);

  const futureReceiptsTableInstance = useRef(null);
  const filterConfig = useRef({});

  const globalClasses = globalStyles();

  useEffect(() => {
    if (!isEmpty(props.renderTable)) {
      filterConfig.current = props.renderTable.filters;
      futureReceiptsTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.renderTable]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    props.setFutureReceiptsTableLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      filters: filterConfig.current,
    };

    try {
      let response = await props.getFutureReceiptsTableData(body);
      let fiscalWeekColConfig = await getColumnsAg(
        "table_name=inventorysmart_future_receipt_list"
      )();
      fiscalWeekColConfig = fiscalWeekColConfig.map((item) => {
        if (item.column_name === "store_code")
          item.cellRenderer = "agGroupCellRenderer";
        return item;
      });

      setFutureReceiptsColumn(fiscalWeekColConfig);
      props.setFutureReceiptsTableLoader(false);
      return {
        data: response.data?.data,
        totalCount: response.data?.total,
      };
    } catch (err) {
      props.setFutureReceiptsTableLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const loadTableInstance = (params) => {
    futureReceiptsTableInstance.current = params;
  };

  const detailCellRenderer = (params) => {
    return <SubRowsComponent node={params.node} />;
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <AgGridComponent
        columns={futureReceiptsColumn}
        manualCallBack={(body, pageIndex, params) =>
          manualCallBack(body, pageIndex, params)
        }
        sizeColumnsToFitFlag
        cacheBlockSize={10}
        rowModelType="serverSide"
        serverSideStoreType="partial"
        loadTableInstance={loadTableInstance}
        uniqueRowId={"key"}
        masterDetail={true}
        detailCellRenderer={detailCellRenderer}
        onGridChanged
        // Passing fixed height as the auto height prop reduces the overall height to the loader when data is not present
        detailRowHeight={600}
      />
    </div>
  );
};

export default FutureReceiptsViewTableComponent;
