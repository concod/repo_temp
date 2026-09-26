import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import DeleteIcon from "@mui/icons-material/Delete";
import { Container } from "@mui/material";
import { Button } from "impact-ui-v3";
import AgGridTable from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { useHistory } from "react-router-dom";
import {
  setAllExceptions,
  editExceptionList,
  fetchExceptionListings,
  finalizeExceptions,
} from "../services-product-mapping/productMappingService";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep, isEmpty } from "lodash";
import SetAllExceptions from "./setAllExceptions";
import {
  formattedData,
  hasRangeOverlap,
  hasSameDates,
  prepareGroupedData,
  setDynamicRenderer,
} from "./common-functions";
import moment from "moment";

const CreateExceptions = (props) => {
  const [columns, setColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [showSetAll, setShowSetAll] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [editedRows, setEditedRows] = useState({});
  const [metaPayload, setMetaPayload] = useState({});
  const reviewTableRef = useRef();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const dateFormat = "YYYY-MM-DD";
  const history = useHistory();

  useEffect(() => {
    getInitialData();
  }, []);

  /**
   * @function
   * @description Fetch column configuration for Review Screen
   */
  const getInitialData = async () => {
    setShowLoader(true);
    try {
      let cols = await getColumnsAg(
        "table_name=ps_mapping_add_exception_review"
      )();
      cols.forEach((column, index) => {
        if (index === 0) {
          column.cellRenderer = "agGroupCellRenderer";
          column.cellRendererParams = {
            suppressCount: true,
          };
        }
        if (column.sub_headers?.length) {
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
      setShowLoader(false);
    } catch (error) {
      console.error(error);
      setShowLoader(false);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setShowLoader(true);
    try {
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      setMetaPayload(body);
      const resp = await fetchExceptionListings(body);
      const dateTimeData = prepareGroupedData(
        resp.data.data,
        "rule_code",
        "store_code"
      );
      let total;
      if (dateTimeData.length < 10) {
        total = 10 * pageIndex + dateTimeData.length;
      }
      setShowLoader(false);
      return {
        data: dateTimeData,
        totalCount: total || resp.data.total,
      };
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Error fetching listings",
        "error"
      );
      setShowLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const displaySnackMessages = (message, variance, onClose) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
          ...(onClose && { onClose: onClose }),
        },
      })
    );
  };

  /**
   * @function
   * @description Handle selection changes and update local state
   * @param {Object} event
   */
  const onSelectionChanged = (event) => {
    const selectedList = event.api.getSelectedRows();
    setSelectAll(Boolean(event.api?.isSelectAllRecords));
    setSelectedRows(selectedList);
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
        newEditedRows[rowIdUpdated] = updatedData;
        setEditedRows(newEditedRows);
      }
      if (!validChange) {
        displaySnackMessages("Dates range updated with conflicts", "warning");
      }
      reviewTableRef.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [params.node.parent],
      });
      reviewTableRef.current.api.flashCells({ rowNodes: [params.node.parent] });
    }
  };

  const onApplySetAll = async (validity) => {
    try {
      let payloadBody = {
        validity: formattedData([validity], dateFormat, dateFormat),
        new_exception_list: selectedRows.map((row) => {
          return {
            store_code: row.store_code,
            rule_code: row.rule_code,
            psa_code: row.psa_code,
            psa_name: row.psa_name,
            rcl_code: row.rcl_code,
          };
        }),
      };
      if (selectAll) {
        payloadBody.new_exception_list = [];
        payloadBody = { ...payloadBody, ...metaPayload };
      }
      const resp = await setAllExceptions(payloadBody);
      setEditedRows({});
      setSelectedRows([]);
      setShowSetAll(false);
      setSelectAll(false);
      reviewTableRef?.current?.api?.deselectAll();
      reviewTableRef?.current.api?.refreshServerSideStore({ purge: true });
      displaySnackMessages(
        resp.data?.message || "SetAll changes saved successfully",
        "success"
      );
      setShowLoader(false);
    } catch (error) {
      setShowLoader(false);
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
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
    setShowLoader(true);
    try {
      const updatedRows = [];
      reviewTableRef.current.api.getModel().forEachNode((node) => {
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
      const resp = await editExceptionList(payloadBody);
      setEditedRows({});
      setSelectedRows([]);
      setShowSetAll(false);
      setSelectAll(false);
      reviewTableRef?.current?.api?.deselectAll();
      reviewTableRef?.current.api?.refreshServerSideStore({ purge: true });
      displaySnackMessages(
        resp.data?.message || "Changes saved successfully",
        "success"
      );
      setShowLoader(false);
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
      setShowLoader(false);
    }
  };

  const onFinalise = async () => {
    try {
      const resp = await finalizeExceptions({ body: {} });
      displaySnackMessages(
        resp.data?.message || "Exceptions added successfully",
        "success",
        () => {
          history.goBack();
        }
      );
      setShowLoader(false);
    } catch (error) {
      console.error(error);
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
      setShowLoader(false);
    }
  };

  /**
   * @function
   * @description Deleted selected ruless from table
   */
  const deleteRules = async () => {
    setShowLoader(true);
    try {
      let payload;
      let resp;
      if (selectAll) {
        payload = {
          validity: null,
          new_exception_list: [],
          ...metaPayload,
        };
        resp = await setAllExceptions(payload);
      } else {
        payload = {
          exceptions_deleted_list: selectedRows.map((rowData) => {
            return {
              store_code: rowData.store_code,
              rule_code: rowData.rule_code,
              rcl_code: rowData.rcl_code,
            };
          }),
          exceptions_updated_list: [],
        };
        resp = await editExceptionList(payload);
      }
      setEditedRows({});
      setSelectedRows([]);
      setShowSetAll(false);
      setSelectAll(false);
      reviewTableRef?.current?.api?.deselectAll();
      reviewTableRef?.current.api?.refreshServerSideStore({ purge: true });
      displaySnackMessages(
        resp.data?.message || "Exceptions deleted successfully",
        "success"
      );
      setShowLoader(false);
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
      setShowLoader(false);
    }
  };

  const handleNavigation = async () => {
    setShowLoader(true);
    try {
      const resp = await finalizeExceptions({ action: "discard" });
      displaySnackMessages(
        resp?.data?.message || "Exceptions discarded successfully",
        "success",
        () => {
          history.goBack();
        }
      );
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error",
        () => {
          if (error?.response?.status === 404) {
            history.goBack();
          }
        }
      );
      setShowLoader(Boolean(error?.response?.status === 404));
    }
  };

  const getTopRightOptions = () => {
    const options = [];

    if (selectedRows.length > 0) {
      options.push(
        <Button
          key="delete-rules"
          icon={<DeleteIcon />}
          variant="primary"
          id="deleteRules"
          onClick={() => deleteRules()}
        />
      );
    }

    options.push(
      <Button
        key="set-all"
        variant="primary"
        id="reviewSetAll"
        onClick={() => setShowSetAll(true)}
        disabled={!selectedRows.length}
      >
        Set All
      </Button>
    );

    return options;
  };

  return (
    <Container maxWidth={false} className={globalClasses.marginTop}>
      <Loader loader={showLoader}>
        {columns.length > 0 && (
          <AgGridTable
            columns={columns}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            onSelectionChanged={onSelectionChanged}
            hideChildSelection={true}
            loadTableInstance={(instance) => {
              reviewTableRef.current = instance;
            }}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            onCellValueChanged={onCellValueChanged}
            disableSelectionOnSelectAll={true}
            groupDisplayType="custom"
            cacheBlockSize={10}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            animateRows={true}
            treeData={true}
            uniqueRowId={"id"}
            childKey={"validities"}
            topRightOptions={getTopRightOptions()}
          />
        )}
        <div className={` ${globalClasses.stickyFooter}`}>         
            <Button
              variant="tertiary"
              onClick={handleNavigation}
              id="reviewExceptionsPrevBtn"
              disabled={showLoader}
            >
              Discard
            </Button>
            <div className={`${globalClasses.flexRow} ${globalClasses.gapHalf}`}>
              <Button
                variant="primary"
                onClick={onSave}
                id="reviewExceptionsNextBtn"
                disabled={!Object.keys(editedRows).length}
              >
                Save
              </Button>
              <Button
                variant="primary"
                onClick={onFinalise}
                id="reviewExceptionsFinalize"
                disabled={showLoader}
              >
                Finalize
              </Button>
              </div>          
        </div>
        {showSetAll && (
          <SetAllExceptions
            onCancel={() => setShowSetAll(false)}
            onApplySetAll={onApplySetAll}
          />
        )}
      </Loader>
    </Container>
  );
};

export default CreateExceptions;
