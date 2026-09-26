import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { isEmpty } from "lodash";

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
import DownloadReport from "../report-download";

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
  const [requestBody, setRequestBody] = useState([]);
  const [
    enableIntentionalMinReportDownload,
    setEnableIntentionalMinReportDownload,
  ] = useState(true);
  const [
    enableUnIntentionalMinReportDownload,
    setEnableUnIntentionalMinReportDownload,
  ] = useState(true);
  const filtersRef = useRef({});
  const intentionalMinTableRef = useRef(null);
  const unIntentionalMinTableRef = useRef(null);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      filtersRef.current = props.selectedFilters;
      fetchTableData();
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (typeOfMinConstraints.typeOfMinConstraints === "intentional") {
      (async () => {
        try {
          props.setIntentionalMinScreenLoader(true);
          let col = await getColumnsAg("table_name=intentional_mins")();
          setIntentionalMinConstraintColumns(col);
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
          props.setIntentionalMinScreenLoader(false);
        } catch (e) {
          props.setIntentionalMinScreenLoader(false);
          props.displaySnackMessages(ERROR_MESSAGE, "error");
        }
      })();
    }
  }, [typeOfMinConstraints]);

  const fetchTableData = () => {
    if (typeOfMinConstraints.typeOfMinConstraints === "intentional") {
      intentionalMinTableRef.current?.api?.refreshServerSideStore({
        purge: true,
      });
    } else {
      unIntentionalMinTableRef.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  };

  const handleChangeMinReportType = (updatedFormData) => {
    setTypeOfMinConstraints(updatedFormData);
  };

  const manualCallBackIntentionalMinReport = async (manualbody, pageIndex) => {
    props.setIntentionalMinScreenLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      filters: filtersRef.current,
    };
    try {
      setRequestBody(body);
      let response = await props.getIntentionalMinReportsTableData(body);
      if (pageIndex == 0) {
        if (response.data.data?.length)
          setEnableIntentionalMinReportDownload(false);
        else setEnableIntentionalMinReportDownload(true);
      }
      props.setIntentionalMinScreenLoader(false);
      return {
        data: response.data.data,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableIntentionalMinReportDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setIntentionalMinScreenLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackUnintentionalMinReport = async (
    manualbody,
    pageIndex
  ) => {
    props.setIntentionalMinScreenLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      filters: filtersRef.current,
    };
    try {
      setRequestBody(body);
      let response = await props.getUnintentionalMinReportsTableData(body);
      if (pageIndex == 0) {
        if (response.data.data?.length)
          setEnableUnIntentionalMinReportDownload(false);
        else setEnableUnIntentionalMinReportDownload(true);
      }
      props.setIntentionalMinScreenLoader(false);
      return {
        data: response.data.data,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableUnIntentionalMinReportDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setIntentionalMinScreenLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadUnIntentionalMinTableInstance = (params) => {
    unIntentionalMinTableRef.current = params;
  };

  const loadIntentionalMinTableInstance = (params) => {
    intentionalMinTableRef.current = params;
  };

  return (
    <>
      <Form
        layout={"vertical"}
        maxFieldsInRow={2}
        handleChange={handleChangeMinReportType}
        fields={INTENTIONAL_UNINTENTIONAL_MIN_VIEW_TYPE}
        updateDefaultValue={false}
        defaultValues={typeOfMinConstraints}
        labelWidthSpan={5}
        fieldTypeWidthSpan={2}
      ></Form>
      {typeOfMinConstraints.typeOfMinConstraints === "intentional" && (
        <>
          <DownloadReport
            screenName={"intentional_min"}
            requestBody={requestBody}
            disable={enableIntentionalMinReportDownload}
          ></DownloadReport>
          <AgGridComponent
            loadTableInstance={loadIntentionalMinTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallBackIntentionalMinReport(body, pageIndex)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            columns={intentionalMinConstraintColumns}
            uniqueRowId={"key"}
          />
        </>
      )}
      {typeOfMinConstraints.typeOfMinConstraints === "unintentional" && (
        <>
          <DownloadReport
            screenName={"unintentional_min"}
            requestBody={requestBody}
            disable={enableUnIntentionalMinReportDownload}
          ></DownloadReport>
          <AgGridComponent
            loadTableInstance={loadUnIntentionalMinTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallBackUnintentionalMinReport(body, pageIndex)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            columns={unintentionalMinConstraintColumns}
            uniqueRowId={"key"}
          />
        </>
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
