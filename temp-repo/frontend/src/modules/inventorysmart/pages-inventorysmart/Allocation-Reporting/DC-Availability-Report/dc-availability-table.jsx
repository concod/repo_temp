import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { isEmpty } from "lodash";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";

import { getDCAvailabilityReportData } from "../../../services-inventorysmart/Allocation-Reports/dc-availability-report-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import DownloadReport from "../report-download";

const DCAvailabilityTableComponent = (props) => {
  const [dcAvailabilityReportColumn, setDcAvailabilityReportColumn] = useState(
    []
  );
  const [requestBody, setRequestBody] = useState([]);
  const [enableDCAvailabilityDownload, setEnableDCAvailabilityDownload] =
    useState(true);
  const filterDependencyRef = useRef(null);
  const dcAvailabilityTableInstance = useRef(null);
  const offsetValues = useRef({});

  const globalClasses = globalStyles();

  useEffect(() => {
    (async () => {
      try {
        props.setDcAvailabilityReportTableLoader(true);
        let col = await getColumnsAg(
          "table_name=inventorysmart_dc_availability"
        )();
        setDcAvailabilityReportColumn(col);
        props.setDcAvailabilityReportTableLoader(false);
      } catch (e) {
        props.setDcAvailabilityReportTableLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencyRef.current = props.filterDependency;
      dcAvailabilityTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.filterDependency]);

  const setManualCallBackRequestBody = (manualbody, pageIndex) => {
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    let limit =
      Object.keys(offsetValues.current)?.length > 0 && pageIndex !== 0
        ? { limit: 10, page: pageIndex + 1, ...offsetValues.current }
        : { limit: 10, page: pageIndex + 1 };
    return {
      filters: filterDependencyRef.current,
      meta: {
        ...manualFilterbody,
        limit,
      },
    };
  };

  const manualCallBackDCAvailability = async (manualbody, pageIndex) => {
    props.setDcAvailabilityReportTableLoader(true);
    let body = setManualCallBackRequestBody(manualbody, pageIndex);
    try {
      setRequestBody(body);
      let response = await props.getDCAvailabilityReportData(body);
      let dcReportData = response.data?.data;
      offsetValues.current = {
        offset: response.data?.offset,
        sub_offset: response.data?.sub_offset,
      };
      if (pageIndex == 0) {
        if (dcReportData?.length) setEnableDCAvailabilityDownload(false);
        else setEnableDCAvailabilityDownload(true);
      }
      props.setDcAvailabilityReportTableLoader(false);
      return {
        data: dcReportData,
        totalCount: response.data?.total,
      };
    } catch (e) {
      setEnableDCAvailabilityDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setDcAvailabilityReportTableLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadDCAvailabilityTableInstance = (params) => {
    dcAvailabilityTableInstance.current = params;
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <DownloadReport
        screenName={"dc_availability"}
        requestBody={requestBody}
        disable={enableDCAvailabilityDownload}
      ></DownloadReport>
      <AgGridComponent
        columns={dcAvailabilityReportColumn}
        loadTableInstance={loadDCAvailabilityTableInstance}
        manualCallBack={(body, pageIndex) =>
          manualCallBackDCAvailability(body, pageIndex)
        }
        rowModelType="serverSide"
        serverSideStoreType="partial"
        cacheBlockSize={10}
        uniqueRowId={"key"}
      />
    </div>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    getDCAvailabilityReportData: (body) =>
      dispatch(getDCAvailabilityReportData(body)),
  };
};

export default connect("", mapDispatchToProps)(DCAvailabilityTableComponent);
