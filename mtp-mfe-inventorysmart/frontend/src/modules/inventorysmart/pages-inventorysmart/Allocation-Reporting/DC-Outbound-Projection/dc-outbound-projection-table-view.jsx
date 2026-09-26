import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import { ButtonGroup } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { setDcOutboundProjectionTableData } from "../../../services-inventorysmart/Allocation-Reports/dc-outbound-projection-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import {
  getCustomFilterObject,
  getStartDateAndEndDateStringFromFiscalWeekObject,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { getDcOutboundProjectionChoiceChannelTableData } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/dc-outbound-projection-service";
import { getDcOutboundProjectionChoiceTableData } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/dc-outbound-projection-service";
import { downloadDCOutboundChoiceChannel } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { downloadDCOutboundChoice } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { DC_OUTBOUND_REPORTS_MODULE } from "../CustomHooks/moduleConstants";
import { getNearestDay } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const DcOutboundProjectionTableComponent = (props) => {
  const [colDefs, setColDefs] = useState([]);
  const [requestBody, setRequestBody] = useState(null);
  const [selectedTab, setSelectedTab] = useState("choice_channel_view");
  const filterDependencyRef = useRef(null);
  const tableInstance = useRef(null);
  const globalClasses = globalStyles();
  const pageSize = props.pageSize;
  const enableDownload =
        props.moduleConfig?.[DC_OUTBOUND_REPORTS_MODULE]?.enableDownload ?? false;

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      props.displaySnackMessages(errObj?.message, "error");
    else props.displaySnackMessages(ERROR_MESSAGE, "error");
  };
  const fetchDcOutboundProjectionTableColumns = async () => {
    try {
      props.setDcOutboundProjectionTableLoader(true);
      let col = [];
      col = await getColumnsAg(
        "table_name=inventorysmart_dc_outbound_projection"
      )();
      setColDefs(col);
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setDcOutboundProjectionTableLoader(false);
    }
  };

  const setManualCallBackRequestBody = (manualbody, pageIndex) => {
    let filters = [];
    let date_range = {};
    let customFilters = [];

    filterDependencyRef?.current.forEach((filterKeysValue) => {
      if (filterKeysValue.attribute_name !== "fiscal_date_range") {
        filters.push(filterKeysValue);
      } else {
        date_range = {
          start_date: filterKeysValue.values[0],
          end_date: filterKeysValue.values[1],
        };

        const {
          startDate,
          endDate,
        } = getStartDateAndEndDateStringFromFiscalWeekObject(filterKeysValue);
        date_range = {
          start_date: startDate,
          end_date: endDate,
        };
        customFilters = [
          getCustomFilterObject("start_date", "start_date", [getNearestDay(startDate)]),
          getCustomFilterObject("end_date", "end_date", [getNearestDay(endDate)]),
        ];
      }
    });

    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    let body = {
      meta: {
        ...manualFilterbody,
        limit: { limit: pageSize || 10, page: pageIndex + 1 },
      },
      filters: [...filters, ...customFilters],
      date_range: date_range,
    };
    return body;
  };

  const manualCallBack = async (manualbody, pageIndex) => {
    props.setDcOutboundProjectionTableLoader(true);
    let body = setManualCallBackRequestBody(manualbody, pageIndex);
    try {
      setRequestBody(body);
      let response =
        selectedTab === "choice_channel_view"
          ? await props.getDcOutboundProjectionChoiceChannelTableData(body)
          : await props.getDcOutboundProjectionChoiceTableData(body);
      if (response?.data?.show_message) {
        props.displaySnackMessages(response?.data?.message, "success");
        props.setDcOutboundProjectionTableLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        let outBoundData = response.data?.data?.data || [];
        props.setDcOutboundProjectionTableData(outBoundData);
        props.setDcOutboundProjectionTableLoader(false);
        return {
          data: outBoundData,
          totalCount: response.data?.count,
        };
      }
    } catch (e) {
      handleErrorMessage(e);
      props.setDcOutboundProjectionTableLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };
  const handleDownload = async () => {
    try {
      let response = selectedTab === "choice_channel_view"
      ? await props.downloadDCOutboundChoiceChannel(requestBody)
      : await props.downloadDCOutboundChoice(requestBody);;
      props?.displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const handleTabChange = (event, newval) => {
    setSelectedTab(newval);
  };
  const getColDefs = () => {
    if (selectedTab === "choice_view") {
      return colDefs.filter((coldef) => coldef?.label !== "Channel");
    }
    return colDefs;
  };

  useEffect(() => {
    fetchDcOutboundProjectionTableColumns();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencyRef.current = props.filterDependency;
      tableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.filterDependency]);

  return (
    <>

      <div
        className={`${globalClasses.centerAlign} ${globalClasses.marginTop}`}
      >
        <ButtonGroup
          options={[
            { label: "Choice Channel View", value: "choice_channel_view" },
            { label: "Choice View", value: "choice_view" },
          ]}
          selectedOption={selectedTab}
          onChange={handleTabChange}
        />
      </div>

      {selectedTab === "choice_channel_view" && (
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            showDownloadButton={enableDownload}
            onDownloadButtonClick={() => handleDownload()}
            columns={getColDefs()}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallBack(body, pageIndex)
            }
            cacheBlockSize={pageSize || 10}
            uniqueRowId={"key"}
            paginationPageSize={pageSize}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            pagination={true}
            tableHeader="DC Outbound Projection - Table View"
          />
        </div>
      )}
      {selectedTab === "choice_view" && (
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            showDownloadButton={enableDownload}
            onDownloadButtonClick={() => handleDownload()}
            columns={getColDefs()}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallBack(body, pageIndex)
            }
            cacheBlockSize={pageSize || 10}
            uniqueRowId={"key"}
            paginationPageSize={pageSize}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            pagination={true}
            tableHeader="DC Outbound Projection - Table View"
          />
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    dcOutboundProjectionTableData:
      inventorysmartReducer.inventorySmartDcOutboundProjectionService
        .dcOutboundProjectionTableData,
    allocationReportsConfiguration:
      inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDcOutboundProjectionTableData: (body) =>
      dispatch(setDcOutboundProjectionTableData(body)),
    getDcOutboundProjectionChoiceChannelTableData: (body) =>
      dispatch(getDcOutboundProjectionChoiceChannelTableData(body)),
    getDcOutboundProjectionChoiceTableData: (body) =>
      dispatch(getDcOutboundProjectionChoiceTableData(body)),
    downloadDCOutboundChoiceChannel: (body) => dispatch(downloadDCOutboundChoiceChannel(body)),
    downloadDCOutboundChoice: (body) => dispatch(downloadDCOutboundChoice(body))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DcOutboundProjectionTableComponent);
