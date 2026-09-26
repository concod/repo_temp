import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import Container from "@mui/material/Container";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import SetAllMultiRow from "core/Utils/agGrid/setall-multirow-form";
import { SET_ALL_VALIDITY_FORM } from "./formConstants";
import {
  formattedData,
  hasRangeOverlap,
  hasSameDates,
  setDynamicRenderer,
  prepareGroupedData,
} from "./common-functions";
import { useHistory } from "react-router-dom";
import { cloneDeep, isEmpty, isEqual, uniqueId } from "lodash";
import {
  fetchReviewData,
  finalizeReviewData,
  saveReviewData,
  setAllReviewData,
} from "../services-product-mapping/productMappingService";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import moment from "moment";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { formatMomentDate } from "core/Utils/functions/utils";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { useNavigate } from "react-router-dom-v5-compat";
import { CONFIGURATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const ReviewRule = (props) => {
  const [columns, setColumns] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [editedRows, setEditedRows] = useState({});
  const [showSetAll, setShowSetAll] = useState(false);
  const [deletedRows, setDeletedRows] = useState([]);
  const [setAllPopUpFields, setSetAllPopUpFields] = useState([]);
  const [rclCode, setRclCode] = useState();
  const globalClasses = globalStyles();
  const customClasses = useStyles();
  const reviewTableRef = useRef();
  const history = useHistory();
  const dateFormat = "YYYY-MM-DD";

  const dispatch = useDispatch();
  const navigate = useNavigate();


  useEffect(() => {
    getInitialData();
  }, []);

  useEffect(() => {
    if (deletedRows.length) {
      saveRules(true);
    }
  }, [deletedRows]);

  useEffect(() => {
    if (props?.history?.location?.state?.rcl_code) {
      setRclCode(props.history.location.state.rcl_code);
      reviewTableRef.current?.api?.refreshServerSideStore({ purge: true });
    }
  }, [props?.history?.location?.state?.rcl_code]);

  /**
   * @function
   * @description Fetch column configuration for Review Screen
   */
  const getInitialData = async () => {
    setShowLoader(true);
    try {
      let cols = await getColumnsAg("table_name=view_new_rule_table")();
      cols.forEach((column, index) => {
        if (index === 0) {
          column.cellRenderer = "agGroupCellRenderer";
          column.cellRendererParams = {
            suppressCount: true,
          };
        }
        if (column.sub_headers.length) {
          column.sub_headers.forEach((item) => {
            if (item.column_name.includes("date")) {
              item.cellRenderer = (cellProps, extraProps) => {
                return setDynamicRenderer(cellProps, extraProps, item);
              };
              item.minWidth = 150;
              item.width = 260;
              item.extra = {
                ...item.extra,
                width: 260
              };
            }
          });
        }
      });
      setRclCode(props?.history?.location?.state?.rcl_code);
      setColumns(cols);
      setShowLoader(false);
    } catch (error) {
      setShowLoader(false);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setShowLoader(true);
    try {
      const payload = {
        rcl_code: rclCode || props?.history?.location?.state?.rcl_code,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      const resp = await fetchReviewData(payload);
      const dateTimeData = prepareGroupedData(
        resp.data.data,
        "rule_code",
        "psa_name"
      );
      setShowLoader(false);
      return {
        data: dateTimeData,
        totalCount: resp.data.total,
      };
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Somethig went wrong.",
        "error"
      );
      setShowLoader(false);
    }
  };

  const finalizeRules = async () => {
    setShowLoader(true);
    try {
      const payload = {
        rcl_code: rclCode,
      };
      const resp = await finalizeReviewData(payload);
      displaySnackMessages(
        resp.data?.message ||
        "Rule creation will take time, you'll be notified shortly.",
        "success",
        () => {
          history.goBack();
        }
      );
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Somethig went wrong.",
        "error"
      );
      setShowLoader(false);
    }
  };

  const saveRules = async (deleteAction = false) => {
    if (!deleteAction) {
      const inValidChanges = Object.keys(editedRows).some((keys) => {
        return hasRangeOverlap(editedRows[keys]);
      });
      if (inValidChanges) {
        displaySnackMessages("Please resolve date conflicts.", "error");
        return;
      }
    }
    setShowLoader(true);
    try {
      const updatedRows = [];
      if (!deleteAction) {
        reviewTableRef.current.api.getModel().forEachNode((node) => {
          if (
            !node.uiLevel &&
            Object.keys(editedRows).includes(
              `${node.data?.rule_code + "~" + node.data?.psa_name}`
            )
          ) {
            updatedRows.push(node.data);
          }
        });
      }
      const payload = {
        rules_updated_list: updatedRows.map((data) => {
          let key = data?.rule_code + "~" + data?.psa_name;
          return {
            rule_code: data.rule_code,
            psa_name: data.psa_name,
            validity: cloneDeep(editedRows[key]),
          };
        }),
        rules_deleted_list: deletedRows.map((data) => {
          return {
            rule_code: data.rule_code,
            psa_name: data.psa_name,
          };
        }),
        rcl_code: rclCode,
      };
      const resp = await saveReviewData(payload);
      resetEdits();
      reviewTableRef.current?.api?.refreshServerSideStore({
        purge: true,
      });
      displaySnackMessages(
        resp.data?.message || "Changes saved successfully.",
        "success"
      );
      setShowLoader(false);
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Somethig went wrong.",
        "error"
      );
      setShowLoader(false);
    }
  };

  const applySetAll = async (formattedAttributes) => {
    let formattedDates = [];
    let validDates = true;
    const attrKeys = Object.keys(formattedAttributes).filter(
      (key) => key.split("_").length === 3 && key.includes("start_date")
    );
    attrKeys.forEach((key) => {
      let ruleIndex = key.split("_")[2];
      const parsedStartDate = moment(
        formattedAttributes[`start_date_${ruleIndex}`],
        "YYYY-MM-DD",
        true
      );
      const parsedEndDate = moment(
        formattedAttributes[`end_date_${ruleIndex}`],
        "YYYY-MM-DD",
        true
      );
      validDates = parsedStartDate.isValid() && parsedEndDate.isValid();
      if (validDates) {
        formattedDates.push([
          formatMomentDate(
            moment(formattedAttributes[`start_date_${ruleIndex}`])
          ),
          formatMomentDate(
            moment(formattedAttributes[`end_date_${ruleIndex}`])
          ),
        ]);
      }
    });

    if (!validDates) {
      displaySnackMessages("Please enter valid dates.", "error");
      throw new Error("Please enter valid dates.");
    }
    const hasConflicts = hasRangeOverlap(formattedDates);
    if (hasConflicts) {
      displaySnackMessages("Please resolve date conflicts.", "error");
      throw new Error("Please resolve date conflicts.");
    }
    try {
      const payload = {
        validity: formattedDates,
        new_rule_edit_list: selectedRows.map((data) => {
          return {
            rule_code: data.rule_code,
            psa_name: data.psa_name,
          };
        }),
        rcl_code: rclCode,
        meta: {},
      };
      const resp = await setAllReviewData(payload);
      displaySnackMessages(
        resp.data?.message || "Applied changes successfully",
        "success"
      );
      resetEdits();
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
      throw new Error("Something went wrong");
    }
  };

  const resetEdits = () => {
    setDeletedRows([]);
    setSelectedRows([]);
    setSetAllPopUpFields([]);
    setEditedRows({});
    setShowSetAll(false);
    reviewTableRef.current?.api?.refreshServerSideStore({ purge: true });
  };

  /**
   * @function
   * @description Deleted selected ruless from table
   */
  const deleteRules = async () => {
    setShowLoader(true);
    try {
      const allselectedRows = cloneDeep(selectedRows);
      setDeletedRows(allselectedRows);
      setSelectedRows([]);
      displaySnackMessages("Exceptions deleted successfully", "success");
      setShowLoader(false);
    } catch (error) {
      displaySnackMessages("Something went wrong", "error");
      setShowLoader(false);
    }
  };

  /**
   * @function
   * @description Handle selection changes and update local state
   * @param {Object} event
   */
  const onSelectionChanged = (event) => {
    const selectedList = event.api.getSelectedRows();
    setSelectedRows(selectedList);
  };

  const getSetAllFormFields = (setAllFields) => {
    return [
      {
        fields: setAllFields.map((field) => {
          if (field.type === "DateTimeField") {
            field.disablePast = true;
          }
          return field;
        }),
        hideRowLabel: false,
        addRowLabel: "Add Date",
        id: uniqueId(),
        rowCount: 0,
      },
    ];
  };

  const onSetAllBtnClick = (isUnmap = false) => {
    setSetAllPopUpFields(getSetAllFormFields(cloneDeep(SET_ALL_VALIDITY_FORM)));
    setShowSetAll(true);
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
      const rowIdUpdated = params.node.parent.id;
      const updatedLevel = params.node.level - 1;
      const originalData = formattedData(
        params.node.parent.data.validity,
        dateFormat,
        dateFormat
      );
      let dateData = cloneDeep(editedRows[rowIdUpdated]) || [];
      if (!editedRows[rowIdUpdated]) {
        dateData = [...originalData];
      }
      dateData[updatedLevel] = [params.data.from_date, params.data.to_date];
      const updatedData = formattedData(dateData, dateFormat, dateFormat);
      const sameAsOnLoad = hasSameDates(updatedData, originalData);
      let newEditedRows = { ...editedRows };
      if (sameAsOnLoad) {
        validChange = true;
        delete newEditedRows[rowIdUpdated]?.[updatedLevel];
        setEditedRows(newEditedRows);
      } else {
        validChange = !hasRangeOverlap(updatedData);
        if (!editedRows[rowIdUpdated]) {
          newEditedRows = {
            ...newEditedRows,
            [rowIdUpdated]: newEditedRows[rowIdUpdated] || [],
          };
        }
        newEditedRows[rowIdUpdated] = updatedData;
        setEditedRows(newEditedRows);
      }
      if (!validChange) {
        displaySnackMessages("Dates range updated with conflicts", "warning");
      }
      reviewTableRef?.current?.api?.flashCells({
        rowNodes: [params.node.parent],
      });
    }
  };

  const displaySnackMessages = (message, variance, onClose) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
          ...(onClose && { onClose: onClose, autoHideDuration: 3000 }),
        },
      })
    );
  };

  const getTopRightOptions = () => {
    const options = [
      ...(Boolean(selectedRows.length) ? [(
        <Button
          key="deleteRules"
          icon={<DeleteIcon />}
          variant="tertiary"
          id="deleteRules"
          onClick={() => deleteRules()}
        />
      )] : []),
      <Button
        key="modifySetAll"
        variant="tertiary"
        id="modifySetAll"
        onClick={() => onSetAllBtnClick()}
        disabled={!Boolean(selectedRows.length)}
        className={`${globalClasses.marginLeft1rem}`}
      >
        Set All
      </Button>
    ]
    return options;
  }

  return (
    <>
      <div className={globalClasses.paddingAround}>
        <HeaderBreadCrumbs
          options={[
            {
              label: "Home",
              to: "/home",
            },
            {
              label: "Configuration",
              id: 1,
            },
          ]}
        ></HeaderBreadCrumbs>
      </div>
      <Container maxWidth={false}>
        <Loader loader={showLoader}>

          <AgGridTable
            columns={columns}
            selectAllHeaderComponent={true}
            hideSelectAllRecords={true}
            hideChildSelection={true}
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            loadTableInstance={(instance) => {
              reviewTableRef.current = instance;
            }}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            sizeColumnsToFitFlag
            skipAutoSizeColumn={false}
            autoSizeOnlyCustom={true}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            groupDisplayType="custom"
            treeData={true}
            cacheBlockSize={10}
            uniqueRowId={"id"}
            childKey={"validities"}
            animateRows={true}
            topRightOptions={getTopRightOptions()}
          />
          {showSetAll && (
            <SetAllMultiRow
              updateDefaultValue={false}
              setDefaultDateFieldValues={true}
              onApply={applySetAll}
              fieldList={setAllPopUpFields}
              maxFieldsInRow={2}
              handleModalClose={() => {
                setShowSetAll(false);
              }}
              alignFields="end"
            />
          )}
          <div
            className={`${globalClasses.stickyFooter}`}
          >
            <Button
              variant="primary"
              id="navigateBack"
              onClick={() => navigate(CONFIGURATION)}
            >
              Back
            </Button>
            <div>
              <Button
                variant="primary"
                id="saveReviewRule"
                disabled={isEmpty(editedRows)}
                onClick={() => saveRules()}
                style={{ marginRight: "10px" }}
              >
                Save
              </Button>
              <Button
                variant="primary"
                id="saveReviewRule"
                onClick={() => finalizeRules()}
              >
                Finalize Rules
              </Button>
            </div>
          </div>
        </Loader>
      </Container>
    </>
  );
};

export default ReviewRule;
