import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
    setReadinessReportTableData,
    getReadinessReportTableData,
} from "../../../services-inventorysmart/Allocation-Reports/readiness-report-service";
import {
    ERROR_MESSAGE
} from "../../../constants-inventorysmart/stringConstants";
import { ButtonGroup } from "impact-ui-v3"
import { downloadReadiness } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { READINESS_MODULE } from "../CustomHooks/moduleConstants";

const ReadinessTableView = (props) => {
    const [colDefs, setColDefs] = useState([]);
    const [requestBody, setRequestBody] = useState([]);
    const filterDependencyRef = useRef(null);
    const tableInstanceBnm = useRef(null);
    const tableInstanceEcom = useRef(null);
    const globalClasses = globalStyles();
    const pageSize = props.pageSize;
    const enableDownload =
        props.moduleConfig?.[READINESS_MODULE]?.enableDownload ?? false;

    const [ tabValue , setTabValue ] = useState("bnm");

    const READINESS_TABS = [
        { label: "Retail", value: "bnm" },
        { label: "Ecom", value: "ecomm" },
      ];

    const handleErrorMessage = (e) => {
        const errObj = e?.response?.data;
        if (errObj?.show_message) props.displaySnackMessages(errObj?.message, "error");
        else props.displaySnackMessages(ERROR_MESSAGE, "error");
      };

      const handleChangeTabValue = (_event, newValue) => {
        setTabValue(newValue);
        console.log("new value", newValue);
      };

    const fetchReadinessTableColumns = async () => {
            const tableName = `inventorysmart_allocation_readiness_${tabValue}`
            try {
                props.setReadinessTableLoader(true);
                let col = [];
                col = await getColumnsAg(
                    `table_name=${tableName}`
                )();
                setColDefs(col);
            } catch (e) {
                handleErrorMessage(e);
            } finally {
                props.setReadinessTableLoader(false);
            }
    }

    useEffect(() => {
       fetchReadinessTableColumns()
    }, [tabValue]);

    useEffect(() => {
        if (!isEmpty(props.filterDependency)) {
            let tableInstance = tabValue === 'bnm' ? tableInstanceBnm : tableInstanceEcom
            filterDependencyRef.current = props.filterDependency;
            tableInstance.current?.api?.refreshServerSideStore({
                purge: true,
            });
        }
    }, [props.filterDependency, tabValue]);

    const setManualCallBackRequestBody = (manualbody, pageIndex) => {
        let manualFilterbody = manualbody
            ? manualbody
            : { range: [], sort: [], search: [] };

        let body = {
            meta: {
                ...manualFilterbody,
                limit: { limit: pageSize || 10, page: pageIndex + 1 },
            },
            filters: [...filterDependencyRef?.current],
            channel: tabValue
        };
        return body
    };

    const manualCallBack = async (manualbody, pageIndex) => {
        props.setReadinessTableLoader(true);
        let body = setManualCallBackRequestBody(manualbody, pageIndex);
        try {
            setRequestBody(body);
            let response = await props.getReadinessReportTableData(body, tabValue);
            if(response?.data?.show_message) {
                props.displaySnackMessages(response?.data?.message, "success");
                props.setReadinessTableLoader(false);
                return {
                    data: [],
                    totalCount: 0,
                }
            } else {
            let readinessData = response?.data?.data || [];
            props.setReadinessReportTableData(readinessData);
            props.setReadinessTableLoader(false);
            return {
                data: readinessData,
                totalCount: response?.data?.total,
            };
            }   
        } catch (e) {
            handleErrorMessage(e);
            props.setReadinessTableLoader(false);
            return {
                data: [],
                totalCount: 0,
            };
        }
    };

    const loadTableInstance = (params) => {
        if (tabValue === 'bnm') {
            tableInstanceBnm.current = params;
        }
        else {
            tableInstanceEcom.current = params;
        }

    };
    const handleDownload = async () => {
        try {
            let response = await props.downloadReadiness(requestBody);
            props?.displaySnackMessages(response?.data?.data?.message, "success");
        } catch (err) {
            handleErrorMessage(err);
        }
    };

    const getTopLeftOptions = () => {
        let options = []
          options.push(<ButtonGroup 
                  options = {READINESS_TABS}
                  selectedOption = {tabValue}
                  onChange = {handleChangeTabValue}
                  />)
        
        return options
    };

    return (
        <div className={globalClasses.marginVertical1rem}>
             {tabValue === "bnm" &&    (<AgGridComponent
                    showDownloadButton = {enableDownload}
                    onDownloadButtonClick = {() => handleDownload()}
                    columns={colDefs}
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
                    topCenterOptions= {getTopLeftOptions()}
                /> ) }
             {tabValue === "ecomm" &&    (<AgGridComponent
                    showDownloadButton = {enableDownload}
                    onDownloadButtonClick = {() => handleDownload()}
                    columns={colDefs}
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
                    topCenterOptions= {getTopLeftOptions()}
                /> ) }
        </div>
    );
};

const mapStateToProps = (store) => {
    const { inventorysmartReducer } = store;
    return {
        moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
        readinessTableData:
            inventorysmartReducer.inventorySmartReadinessReportService
                .readinessTableData,
        allocationReportsConfiguration: inventorysmartReducer?.allocationReportsCommonService?.allocationReportsConfiguration,
        pageSize:
            inventorysmartReducer.inventorySmartCommonService
                ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        setReadinessReportTableData: (body) =>
            dispatch(setReadinessReportTableData(body)),
        getReadinessReportTableData: (body, channel) =>
            dispatch(getReadinessReportTableData(body, channel)),
        downloadReadiness: (body) => dispatch(downloadReadiness(body)),
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ReadinessTableView);