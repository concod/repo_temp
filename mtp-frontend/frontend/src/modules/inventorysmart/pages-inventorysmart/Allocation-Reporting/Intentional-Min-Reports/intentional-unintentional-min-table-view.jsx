import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import Form from "core/Utils/form";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";

import {
  INTENTIONAL_UNINTENTIONAL_MIN_VIEW_TYPE,
  ERROR_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import {
  getUnintentionalMinReportsTableData,
  getIntentionalMinReportsTableData,
  setIntentionalMinScreenLoader,
} from "../../../services-inventorysmart/Allocation-Reports/intentional-min-reports-service";

const IntentionalMinReportsTableComponent = (props) => {
  const [typeOfMinConstraints, setTypeOfMinConstraints] = useState({
    typeOfMinConstraints: "intentional",
  });
  const [intentionalMinConstraintColumns, setIntentionalMinConstraintColumns] =
    useState([]);
  const [
    unintentionalMinConstraintColumns,
    setUnintentionalMinConstraintColumns,
  ] = useState([]);

  const [intentionalMinConstraintData, setIntentionalMinConstraintData] =
    useState([]);
  const [unintentionalMinConstraintData, setUnintentionalMinConstraintData] =
    useState([]);

  useEffect(() => {
    if (typeOfMinConstraints.typeOfMinConstraints === "intentional") {
      (async () => {
        try {
          props.setIntentionalMinScreenLoader(true);
          let col = await getColumnsAg("table_name=intentional_mins")();
          setIntentionalMinConstraintColumns(col);
          let reqBody = {
            filters: props.selectedFilters,
          };
          let response = await props.getIntentionalMinReportsTableData(reqBody);
          setIntentionalMinConstraintData(response.data?.data);
          props.setIntentionalMinScreenLoader(false);
        } catch (e) {
          props.setIntentionalMinScreenLoader(false);
          props.displaySnackMessages(ERROR_MESSAGE, "error");
        }
      })();
    } else {
      (async () => {
        try {
          props.setIntentionalMinScreenLoader(true);
          let col = await getColumnsAg("table_name=unintentional_mins")();
          setUnintentionalMinConstraintColumns(col);
          let reqBody = {
            filters: props.selectedFilters,
          };
          let response = await props.getUnintentionalMinReportsTableData(
            reqBody
          );
          setUnintentionalMinConstraintData(response.data?.data);
          props.setIntentionalMinScreenLoader(false);
        } catch (e) {
          props.setIntentionalMinScreenLoader(false);
          props.displaySnackMessages(ERROR_MESSAGE, "error");
        }
      })();
    }
  }, [typeOfMinConstraints, props.selectedFilters]);

  const handleChangeDailyAllocationView = (updatedFormData) => {
    setTypeOfMinConstraints(updatedFormData);
  };

  return (
    <>
      <Form
        layout={"vertical"}
        maxFieldsInRow={2}
        handleChange={handleChangeDailyAllocationView}
        fields={INTENTIONAL_UNINTENTIONAL_MIN_VIEW_TYPE}
        updateDefaultValue={false}
        defaultValues={typeOfMinConstraints}
        labelWidthSpan={5}
        fieldTypeWidthSpan={2}
      ></Form>
      {typeOfMinConstraints.typeOfMinConstraints === "intentional" && (
        <AgGridComponent
          rowdata={intentionalMinConstraintData}
          columns={intentionalMinConstraintColumns}
          downloadAsExcel={props.enableDownload}
          uniqueRowId={"key"}
        />
      )}
      {typeOfMinConstraints.typeOfMinConstraints === "unintentional" && (
        <AgGridComponent
          rowdata={unintentionalMinConstraintData}
          columns={unintentionalMinConstraintColumns}
          downloadAsExcel={props.enableDownload}
          uniqueRowId={"key"}
        />
      )}
    </>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    getUnintentionalMinReportsTableData: (body) =>
      dispatch(getUnintentionalMinReportsTableData(body)),
    getIntentionalMinReportsTableData: (body) =>
      dispatch(getIntentionalMinReportsTableData(body)),
    setIntentionalMinScreenLoader: (body) =>
      dispatch(setIntentionalMinScreenLoader(body)),
  };
};

export default connect(
  null,
  mapDispatchToProps
)(IntentionalMinReportsTableComponent);
