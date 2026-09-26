import React, { useState, useEffect, useRef } from "react";
import { connect, useDispatch } from "react-redux";
import moment from "moment";
import { Button } from "impact-ui";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import AgGridTable from "core/Utils/agGrid";
import Container from "@mui/material/Container";
import DeleteIcon from "@mui/icons-material/Delete";
import AddException from "./addExceptions";
import UploadHandler from "core/commonComponents/uploadHandler";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  listExceptions,
  editManageExceptionList,
  setAllManageExceptions,
  fetchUploadtemplate,
  uploadExceptionList,
  setTenantUploadConfig,
} from "../services-product-mapping/productMappingService";
import { setFilterConfiguration } from "core/actions/filterAction";
import { useHistory, useLocation } from "react-router-dom";
import { getColumnsAg } from "core/actions/tableColumnActions";
import globalStyles from "core/Styles/globalStyles";
import { Typography } from "@mui/material";
import { cloneDeep, isEmpty, isEqual } from "lodash";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import SetAllExceptions from "./setAllExceptions";
import {
  formattedData,
  hasRangeOverlap,
  hasSameDates,
  setDynamicRenderer,
  prepareGroupedData,
} from "./common-functions";
import { bindActionCreators } from "redux";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";

const ManageExceptions = (props) => {
  const [columns, setColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showAddExceptionFlow, setShowAddExceptionFlow] = useState(false);
  const [setALL, showSetAll] = useState(false);
  const [editedRows, setEditedRows] = useState({});
  const [confirmBox, showConfirmBox] = useState(false);
  const [loader, showLoader] = useState(false);
  const [showUploadBtn, setShowUploadBtn] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [templateHeaders, setTemplateHeaders] = useState([]);
  const [templateBody, setTemplateBody] = useState([]);
  const validationHandler = useRef();
  const tableInstance = useRef();
  const filterDependency = useRef();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const dateFormat = "YYYY-MM-DD";

  useEffect(() => {
    getInitialData();
    loadFilters();
    props.setActiveScreenName("Product Manage Exeptions mapping");
    sessionStorage.setItem(
      "activeScreenName",
      "Product Manage Exeptions mapping"
    );
  }, []);

  useEffect(() => {
    if (!showAddExceptionFlow) {
      tableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [showAddExceptionFlow]);

  /**
   * @function
   * @description Fetch column configuration for Manage Exceptions Screen
   */
  const getInitialData = async () => {
    showLoader(true);
    try {
      const uploadConfig = fetchDynamicConfigFromTenantReducer(
        "core",
        "productStoreMappingException"
      );
      setShowUploadBtn(Boolean(uploadConfig?.file_upload));
      let cols = await getColumnsAg("table_name=ps_mapping_exceptions_list")();
      cols.forEach((column, index) => {
        if (index === 0) {
          column.cellRenderer = "agGroupCellRenderer"; // Combine children into the same header group
        }
        if (column.sub_headers.length) {
          column.sub_headers.forEach((item) => {
            if (item.column_name.includes("date")) {
              item.cellRenderer = (cellProps, extraProps) => {
                return setDynamicRenderer(cellProps, extraProps, item);
              };
            }
          });
        }
      });
      setColumns(cols);
      let tenantData = await props.getTenantConfigApplicationLevel(1, {
        attribute_name: "manage_exceptions_upload_instructions",
      });
      props.setTenantUploadConfig(tenantData.data?.data[0]?.attribute_value);
      showLoader(false);
    } catch (error) {
      showLoader(false);
    }
  };

  /**
   * @function
   * @description Load excpetion filters using filter name
   */
  const loadFilters = async () => {
    const response = await fetchFilterFieldValues(
      "ps mapping exception list",
      []
    );
    if (isEmpty(props.psMappingExceptionListFilterConfiguration)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: "Inventorysmart Configurations",
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "psMappingExceptionListFilterConfiguration",
        filterConfigData,
        "Inventorysmart Configurations"
      );
      dispatch(setFilterConfiguration(filterConfig));
    }
  };

  /**
   * @function
   * @description Load table data from selected fillters or for sorted/searchable/paginated table columns
   * @param {Objet} manualbody
   * @param {Number} pageIndex
   * @param {Object} params
   * @returns {Object}
   */
  const manualCallBack = async (manualbody, pageIndex, params) => {
    showLoader(true);
    if (
      !Boolean(filterDependency.current) ||
      filterDependency.current?.length === 0
    ) {
      showLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    try {
      const body = {
        rule_code: props.selectedProducts,
        filters: filterDependency.current,
        meta: {
          ...manualbody,
          limit: { limit: 50, page: pageIndex + 1 },
        },
      };
      const resp = await listExceptions(body);
      showLoader(false);
      const dateTimeData = prepareGroupedData(
        resp.data.data,
        "rule_code",
        "store_code"
      );
      return {
        data: dateTimeData,
        totalCount: resp.data.total,
      };
    } catch (error) {
      console.error(error);
      showLoader(false);
    }
  };

  /**
   * @function
   * @description Handle selection changes and update local state
   * @param {Object} event
   */
  const onSelectionChanged = (event) => {
    const rows = event.api.getSelectedRows();
    setSelectedRows(rows);
  };

  /**
   * @function
   * @description Deleted selected ruless from table
   */
  const deleteRules = async () => {
    showLoader(true);
    try {
      const payloadBody = {
        exceptions_updated_list: [],
        exceptions_deleted_list: selectedRows.map((row) => {
          return {
            store_code: row.store_code,
            rule_code: row.rule_code,
            rcl_code: row.rcl_code,
            psa_code: row.psa_code,
            psa_name: row.psa_name,
          };
        }),
      };
      const resp = await editManageExceptionList(payloadBody);
      setSelectedRows([]);
      tableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
      displaySnackMessages(
        resp.data.message || "Exceptions deleted successfully",
        "success"
      );
      showLoader(false);
    } catch (error) {
      displaySnackMessages(
        error.response?.data.message || "Something went wrong",
        "error"
      );
      showLoader(false);
    }
  };

  const onSave = async () => {
    const inValidChanges = Object.keys(editedRows).some((keys) => {
      return hasRangeOverlap(editedRows[keys]);
    });
    if (inValidChanges) {
      displaySnackMessages("Please resolve date conflicts.", "error");
      return;
    }
    showLoader(true);
    try {
      const updatedRows = [];
      tableInstance.current.api.getModel().forEachNode((node) => {
        if (
          !node.uiLevel &&
          Object.keys(editedRows).includes(
            `${node.data?.rule_code + "~" + node.data?.store_code}`
          )
        ) {
          updatedRows.push(node.data);
        }
      });
      const payloadBody = {
        exceptions_deleted_list: [],
        exceptions_updated_list: updatedRows.map((rowData) => {
          let key = rowData?.rule_code + "~" + rowData?.store_code;
          return {
            store_code: rowData.store_code,
            rule_code: rowData.rule_code,
            rcl_code: rowData.rcl_code,
            psa_code: rowData.psa_code,
            psa_name: rowData.psa_name,
            validity: cloneDeep(editedRows[key]),
          };
        }),
      };
      const resp = await editManageExceptionList(payloadBody);
      setSelectedRows([]);
      setEditedRows({});
      tableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
      displaySnackMessages(
        resp?.data.message || "Exceptions updated successfully",
        "success"
      );
      showLoader(false);
    } catch (error) {
      displaySnackMessages(
        error.response?.data.message || "Something went wrong",
        "error"
      );
      showLoader(false);
    }
  };

  /**
   * @function
   * @description Handle Navigation back to previous screen if no changes
   */
  const prevScreenNavigation = () => {
    // verify for other changes
    history.goBack();
  };

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  const onCellValueChanged = (params) => {
    let isValueSame = false;
    let oldValue = moment(params.oldValue, dateFormat).format(dateFormat);
    let newValue = moment(params.newValue, dateFormat).format(dateFormat);
    if (moment.isMoment(params.newValue)) {
      isValueSame = moment(newValue).isSame(moment(oldValue));
    } else {
      isValueSame = isEqual(oldValue, newValue);
    }

    if (!isValueSame) {
      let validChange = false;
      const dateData = cloneDeep(params.node.parent?.group);
      const originalData = formattedData(
        params.node.parent.data.validity,
        dateFormat,
        dateFormat
      );
      const updatedData = formattedData(dateData, dateFormat, dateFormat);
      const sameAsOnLoad = hasSameDates(updatedData, originalData);
      let newEditedRows = { ...editedRows };
      const rowIdUpdated =
        params.node.parent?.data?.rule_code +
        "~" +
        params.node.parent?.data?.store_code;
      if (sameAsOnLoad) {
        validChange = true;
        delete newEditedRows[rowIdUpdated];
        setEditedRows(newEditedRows);
      } else {
        validChange = !hasRangeOverlap(updatedData);
        if (editedRows[rowIdUpdated]) {
          newEditedRows[rowIdUpdated] = updatedData;
          setEditedRows(newEditedRows);
        } else {
          newEditedRows[rowIdUpdated] = updatedData;
          setEditedRows(newEditedRows);
        }
      }
      if (!validChange) {
        displaySnackMessages("Dates range updated with conflicts", "warning");
      }
      tableInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [params.node.parent],
      });
      tableInstance.current.api.flashCells({ rowNodes: [params.node.parent] });
    }
  };

  const onApplySetAll = async (validity) => {
    try {
      const payloadBody = {
        validity: [validity],
        exceptions_updated_list: selectedRows.map((row) => {
          return {
            store_code: row.store_code,
            rule_code: row.rule_code,
            psa_code: row.psa_code,
            psa_name: row.psa_name,
            rcl_code: row.rcl_code,
          };
        }),
      };
      const resp = await setAllManageExceptions(payloadBody);
      tableInstance.current.api?.deselectAll(true);
      tableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
      showSetAll(false);
      displaySnackMessages(
        resp.data?.message || "Exceptions updated successfully",
        "success"
      );
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
    }
  };

  /**
   * attachCallBacks funtions will
   * check if there is any callback
   * if there is any callback
   * then attach that call to
   * validationHandler
   * @param {function} callback
   */
  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  /**
   * @function
   * @description Validate parcedExcelData, create payload using CSV_CONFIG and call file upload api
   */
  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadExceptionList(formData);
      props.addSnack({
        message:
          res.message || "Please wait for notification to be received shortly",
        options: {
          variant: "success",
        },
      });
      if (res.data.status) {
        setIsUploadModalOpen(false);
      } else {
        validationHandler.current.validate([{ message: res?.data?.message }]);
      }
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        props.addSnack({
          message: error?.data?.message || "Something went wrong.",
          options: {
            variant: "error",
          },
        });
        validationHandler.current.validate([]);
      }
    }
  };

  const applyDependency = async (dependency) => {
    if (showUploadBtn) {
      let payload = {};
      dependency.forEach((data) => {
        payload = {
          ...payload,
          [data.attribute_name]: data.values?.[0] || "",
        };
      });
      const tenantDateFormat = localStorage.getItem("tenantDateFormat");
      const templateData = await fetchUploadtemplate(payload);
      if (templateData.data.data.length) {
        let bodyData = [],
          headerData = [];
        templateData.data.data.forEach((obj) => {
          const isDate = obj.column.includes("date");
          headerData = [...headerData, { label: obj.label, key: obj.column }];
          if (!bodyData.length && obj.value.length) {
            bodyData = obj.value.map((val) => {
              let currVal =
                tenantDateFormat && isDate
                  ? moment(val, "YYYY/MM/DD").format(tenantDateFormat)
                  : val;
              return {
                [obj.column]: currVal,
              };
            });
          } else if (bodyData.length) {
            obj.value.forEach((val, index) => {
              let currVal =
                tenantDateFormat && isDate
                  ? moment(val, "YYYY/MM/DD").format(tenantDateFormat)
                  : val;
              if (bodyData[index]) {
                bodyData[index] = {
                  ...bodyData[index],
                  [obj.column]: currVal,
                };
              } else {
                bodyData = [
                  ...bodyData,
                  {
                    [obj.column]: currVal,
                  },
                ];
              }
            });
          }
        });
        setTemplateBody(bodyData);
        setTemplateHeaders(headerData);
      }
    }
    filterDependency.current = dependency;
    tableInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Configuration",
            id: 1,
          },
        ]}
      ></HeaderBreadCrumbs>
      {showAddExceptionFlow ? (
        <AddException hideAddFlow={() => setShowAddExceptionFlow(false)} />
      ) : (
        <Container maxWidth={false}>
          <CoreComponentScreen
            showFilterDashboard={true}
            pageLabel={"Configuration"}
            showPageRoute={false}
            hideNoDataFound
            filterConfigKey={"psMappingExceptionListFilterConfiguration"}
            onApplyFilter={(dependency) => applyDependency(dependency)}
          >
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
            >
              <Typography variant="h6" gutterBottom>
                Exception
              </Typography>
              <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
                {Boolean(selectedRows.length) && (
                  <Button
                    icon={DeleteIcon}
                    variant="primary"
                    id="deleteRules"
                    onClick={() => showConfirmBox(true)}
                  />
                )}
                {showUploadBtn && location.state?.dimension === "product" && (
                  <>
                    <Button
                      variant="primary"
                      title={"Edit&Upload"}
                      id="Edit&Upload"
                      onClick={() => {
                        setIsUploadModalOpen(true);
                      }}
                      icon={FileUploadIcon}
                    />
                    <UploadHandler
                      handleUpload={handleUpload}
                      isModalOpen={isUploadModalOpen}
                      setIsModalOpen={(val) => {
                        setIsUploadModalOpen(val);
                      }}
                      attachCallBacks={attachCallBacks}
                      // jsonUpload={true}
                      templateConfig={templateHeaders}
                      templateBody={templateBody}
                      // key has been added in inventory_smart_screen_configuration api
                      uploadInstructions={[]}
                      tenantUploadConfig={props.tenantUploadConfig}
                      templateName="manageExceptionsTemplate"
                      setFileName={setFileName}
                      moduleName="Product Mapping"
                      // moduleCodeRef={moduleCodeRef}
                    />
                  </>
                )}
                <Button
                  variant="primary"
                  id="setAllRules"
                  onClick={() => showSetAll(true)}
                  disabled={!selectedRows.length}
                >
                  Set All
                </Button>
                <Button
                  variant="primary"
                  id="addException"
                  onClick={() => setShowAddExceptionFlow(true)}
                >
                  Add Exception
                </Button>
              </div>
            </div>
            <Loader loader={loader}>
              {columns.length > 0 && (
                <AgGridTable
                  columns={columns}
                  selectAllHeaderComponent={true}
                  hideSelectAllRecords={true}
                  sizeColumnsToFitFlag
                  onGridChanged
                  onRowSelected
                  loadTableInstance={(gridInstance) => {
                    tableInstance.current = gridInstance;
                  }}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  groupDisplayType="custom"
                  cacheBlockSize={50}
                  uniqueRowId={"id"}
                  hideChildSelection={true}
                  onSelectionChanged={onSelectionChanged}
                  onCellValueChanged={onCellValueChanged}
                  childKey={"validities"}
                  treeData={true}
                />
              )}
            </Loader>
            {confirmBox && (
              <ConfirmBox
                title="Delete Exceptions"
                subHeading="Are you sure, do you want to delete selected exceptions?"
                onClose={() => showConfirmBox(false)}
                onConfirm={() => {
                  showConfirmBox(false);
                  deleteRules();
                }}
              />
            )}
            {setALL && (
              <SetAllExceptions
                onCancel={() => showSetAll(false)}
                onApplySetAll={onApplySetAll}
              />
            )}
          </CoreComponentScreen>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginVertical1rem}`}
          >
            <Button
              variant="primary"
              id="saveException"
              onClick={() => onSave()}
              disabled={!Object.keys(editedRows).length || loader}
            >
              Save
            </Button>
            <Button
              variant="primary"
              id="navigateBack"
              onClick={() => prevScreenNavigation()}
            >
              Back
            </Button>
          </div>
        </Container>
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    tenantUploadConfig: state.productMappingReducerService.tenantUploadConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      setTenantUploadConfig,
      getTenantConfigApplicationLevel,
    },
    dispatch
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(ManageExceptions);
