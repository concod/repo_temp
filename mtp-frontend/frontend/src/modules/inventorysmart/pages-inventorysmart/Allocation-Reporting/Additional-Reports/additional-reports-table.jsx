import React, { useState, useEffect } from "react";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { cloneDeep, isEmpty } from "lodash";

const AdditionalReportsTableComponent = (props) => {
  const [additionalReportsColumn, setAdditionalReportsColumn] = useState([]);
  const [additionalReportsData, setAdditionalReportsData] = useState([]);

  const globalClasses = globalStyles();

  useEffect(() => {
    if (!isEmpty(props.additionalReportsTableData)) {
      props.setAdditionalReportsTableLoader(true);
      try {
        let clonedAdditionalReportColConfig = cloneDeep(
          props.additionalReportsTableData?.columns
        );
        let fiscalWeekColConfig = agGridColumnFormatter(
          clonedAdditionalReportColConfig
        );
        setAdditionalReportsColumn(fiscalWeekColConfig);
        setAdditionalReportsData(props.additionalReportsTableData?.table_data);
        props.setAdditionalReportsTableLoader(false);
      } catch (e) {
        props.setAdditionalReportsTableLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }
  }, [props.additionalReportsTableData]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <AgGridComponent
        rowdata={additionalReportsData}
        columns={additionalReportsColumn}
        uniqueRowId={"l2_name"}
      />
    </div>
  );
};

export default AdditionalReportsTableComponent;
