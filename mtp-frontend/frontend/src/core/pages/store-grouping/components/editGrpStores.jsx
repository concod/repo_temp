import { Button, Container, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { storeGrouping } from "config/routes";
import { Prompt as IaPrompt } from "impact-ui";
import { cloneDeep } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router-dom";
import LoadingOverlay from "../../../Utils/Loader/loader";
import { addSnack } from "../../../actions/snackbarActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  EditGroup,
  ToggleLoader,
  deletedRowsInEdit,
  fetchGroupStores,
  getGroupInfo,
  setSelectedGroupToEdit,
  setStoreGrpFilteredCols,
} from "../services-store-grouping/custom-store-group-service";
import PageRouteTitles from "./PageRouteTitles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { fetchGradeList } from "core/pages/store-grading/grading-services";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { isNonPrimitiveArray } from "modules/inventorysmart/pages-inventorysmart/Create-Allocation/helperFunctions";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom-v5-compat";

const EditGrpProducts = (props) => {
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  // const routerParams = useParams();
  let location = useLocation();
  const [tableData, settableData] = useState([]);
  const [confirmBox, showConfirmBox] = useState(false);
  const tableInstance = useRef({});
  const noneditableStores = useRef({});
  const isCancelled = useRef(false);
  const [columns, setColumns] = useState([]);
  const [storeGradeFlag, setGradeFlag] = useState(false);
  const [editChange, setEditChange] = useState(false);
  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        props.ToggleLoader(true);
        const cols = await props.getColumnsAg("table_name=store_group_filter");
        props.setStoreGrpFilteredCols(cols);
        props.ToggleLoader(false);
        const grpId = props.match.params.group_id;
        const res = await props.getGroupInfo(grpId);
        const grpObj = res.data.data[0];
        props.setSelectedGroupToEdit(grpObj.name);
      } catch (error) {
        props.ToggleLoader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    };
    fetchData();
    return () => {
      props.deletedRowsInEdit([]);
    };
  }, []);

  useEffect(() => {
    const fetchCols = async () => {
      let cols = cloneDeep(props.columns);
      let gradeFlag = false;
      cols.forEach((item) => {
        if (item.column_name === "grade" && item.is_editable) {
          gradeFlag = true;
        }
      });
      if (gradeFlag) {
        const { data } = await fetchGradeList();
        let { data: config } = await props.getTenantConfigApplicationLevel(1, {
          attribute_name: "filter_attributes_display_config",
        });
        let nonEditStores =
          config?.data[0]?.attribute_value?.store?.store_code
            ?.display_order_top;
        noneditableStores.current = nonEditStores;
        cols = cols.map((item) => {
          if (item.column_name === "grade") {
            item.options = data.data
              .filter((item) => item.name !== "ECOM")
              .map((item) => {
                return {
                  label: item.name,
                  id: item.name,
                  value: item.name,
                };
              });
            item.initialData = item.options;
            item.cellRenderer = (cellProps, extraProps) => {
              if (cellProps.value === "ECOM") {
                return <>{cellProps.value}</>; // Render "ECOM" as non-editable text
              } else {
                return (
                  <CellRenderers
                    cellData={cellProps}
                    column={item}
                    extraProps={extraProps}
                  ></CellRenderers>
                );
              }
            };
          }
          return item;
        });
        const formattedResponse = agGridColumnFormatter(cols);
        setColumns(formattedResponse);
        setGradeFlag(true);
      } else {
        setColumns(cols);
      }
    };
    fetchCols();
  }, [props.columns]);

  const selectionHandler = (event) => {
    let selectedRows = event.api.getSelectedRows();
    let tableRows = event.api.getRenderedNodes().map((item) => {
      return item.data;
    });

    let updatedDelete = props.deletedStores.filter((prod) => {
      return !selectedRows.some((selection) => {
        return selection.store_code === prod.store_code;
      });
    });

    const deleteRows = tableRows.filter((row) => {
      return !selectedRows.some((selection) => {
        return selection.store_code === row.store_code;
      });
    });
    updatedDelete.push(...deleteRows);
    props.deletedRowsInEdit(updatedDelete);
  };

  const manualCallBack = async (body, pageIndex, params) => {
    props.ToggleLoader(true);
    let res = {
      data: {
        data: [],
        total: 0,
      },
    };
    let manualbody = {
      meta: {
        ...body,
      },
      selection: {
        data: isCancelled.current
          ? [
              {
                searchColumns: {},
                checkAll: true,
              },
            ]
          : [
              {
                searchColumns: {},
                checkAll: true,
              },
              ...params?.api?.checkConfiguration,
            ],
        unique_columns: ["store_code"],
      },
    };
    try {
      const grpId = props.match.params.group_id;
      res = await props.fetchGroupStores(grpId, manualbody, pageIndex, 10);
      if (noneditableStores?.current?.length > 0) {
        res.data.data = res.data.data.map((item) => {
          if (noneditableStores.current.indexOf(item.store_code) > -1) {
            item.disableStoreGrade = true;
          } else {
            item.disableStoreGrade = false;
          }
          return item;
        });
      }
      settableData(res.data.data);
      isCancelled.current = false;
      props.ToggleLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (error) {
      props.ToggleLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const goBack = () => {
    //when we navigate back to previous screen, we will render the table data
    //on mount to avoid refiltering
    //We are using shouldRenderTableData state variable to render the data
    navigate(prevScr ? prevScr : storeGrouping.home, {
      state: {
        shouldRenderTableData: true,
        from: location.pathname,
      },
    });
  };

  const onModify = () => {
    let modifyRoute = prevScr ? `${prevScr}/modify` : storeGrouping.modifyGroup;
    navigate(`${modifyRoute}/${props.match.params.group_id}`, {
      state: {
        prevScr: prevScr,
      },
    });
  };

  const onSave = async () => {
    //If no changes are made without any negate operations, we can display this
    if (
      (tableInstance?.current?.api?.checkConfiguration || []).length <= 1 &&
      !editChange
    ) {
      props.addSnack({
        message: "No changes to Save",
        options: {
          variant: "warning",
        },
      });
      return;
    }
    props.ToggleLoader(true);
    const grpId = props.match.params.group_id;
    const res = await props.getGroupInfo(grpId);
    const grpObj = res.data.data[0];
    let grpType = grpObj.special_classification;
    if (grpType !== "manual" && props.deletedProds.length !== 0) {
      grpType = "manual";
    }
    const body = {
      name: grpObj.name,
      group_type: grpType,
      channel: tableData.length > 0 ? tableData[0].channel : "", //For now keeping it as empty channel
      objective_metrics: grpObj?.selection_metadata?.objective_metrics,
      store_ids: {
        filters: [],
        meta: {
          search: [],
          range: [],
          sort: [],
        },
        metrics: [],
        selection: {
          data: tableInstance?.current?.api?.checkConfiguration,
          unique_columns: ["store_code"],
        },
      },
      store_group_ids: {
        filters: [],
        meta: {
          search: [],
          range: [],
          sort: [],
        },
        metrics: [],
        selection: {
          data: [],
          unique_columns: ["sg_code"],
        },
      },
    };
    let selectedData = tableInstance.current?.api
      ?.getSelectedNodes()
      .map((node) => {
        return node.data;
      });
    let store_grade = selectedData
      .filter((item) => item.grade)
      .map((item) => {
        return {
          store_code: item.store_code,
          store_grade: item.grade,
        };
      });
    if (storeGradeFlag) {
      body.store_grades = store_grade;
    }
    try {
      const action = "remove_only";
      await props.EditGroup(body, grpId, action);
      props.deletedRowsInEdit([]);
      props.addSnack({
        message: "Successfully updated",
        options: {
          variant: "success",
        },
      });
      refreshTableState();
      props.ToggleLoader(false);
      setEditChange(false);
    } catch (error) {
      displaySnackMessages("Update Failed.Please try again", "error");
      props.ToggleLoader(false);
    }
  };
  const prevScr = location.state?.prevScr;

  const routeOptions = [
    {
      id: "product_grping_scr",
      label: "Store Grouping",
      action: () => {
        navigate(prevScr ? prevScr : storeGrouping.home);
      },
    },
    {
      id: "view Group",
      label: "View Group",
      action: () => null,
    },
  ];

  const getPromptStatus = (loc) => {
    const message = `Are you sure you want to go to ${loc.pathname}?`;
    if (
      (loc.pathname === storeGrouping.home ||
        loc.pathname.includes(storeGrouping.modifyGroup) ||
        !loc.pathname.includes("store-grouping")) &&
      props.deletedStores.length !== 0
    ) {
      return message;
    }
    return true;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const refreshTableState = () => {
    tableInstance?.current?.api?.refreshServerSideStore({ purge: true });
  };

  const onCancel = () => {
    if (props.deletedStores.length === 0) {
      displaySnackMessages("No changes are made", "warning");
    } else {
      showConfirmBox(true);
    }
  };

  // this code would be removed once it's handled in generic way (value getter)
  const processCellForClipboard = useCallback((params) => {
    let l_cellValue = cloneDeep(params.value);
    if (Array.isArray(l_cellValue)) {
      return isNonPrimitiveArray(l_cellValue)
        ? l_cellValue.map((val) => val.label)?.join(" | ")
        : l_cellValue;
    }
    return replaceSpecialCharacter(l_cellValue);
  }, []);

  const checkdisabledFlag = () => {
    if (editChange) {
      return false;
    } else if (props.deletedStores.length === 0) {
      return true;
    } else {
      return false;
    }
  };
  return (
    <>
      <Prompt
        message={(location) => {
          return getPromptStatus(location);
        }}
      />
      <IaPrompt
        isOpen={confirmBox}
        title="Cancel Changes"
        subHeading="Your changes will be discarded if you proceed. Are you sure you want to cancel?"
        infoList={[]}
        primaryButtonProps={{
          children: "Yes",
          onClick: () => {
            isCancelled.current = true;
            refreshTableState();
            showConfirmBox(false);
          },
        }}
        tertiaryButtonProps={{
          children: "No",
          onClick: () => showConfirmBox(false),
        }}
        variant="warning"
      />
      <LoadingOverlay loader={props.isLoading} spinner>
        <PageRouteTitles
          id="storeGrpingEditGrpBrdCrmbs"
          options={routeOptions}
        />
        <Container maxWidth={false}>
          <div
            className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignCenter} ${globalClasses.marginBottom}`}
          >
            <Typography variant="h4">Edit Stores</Typography>
            <Typography variant="h4">
              Selected Group :{" "}
              <Typography variant="body1" component="span">
                {replaceSpecialCharacter(props.groupName)}
              </Typography>
            </Typography>
            <Button
              onClick={() => onModify()}
              size="large"
              variant="contained"
              color="primary"
              id="storeGrpingEditGrpModifyBtn"
            >
              Modify
            </Button>
          </div>
          {columns.length > 0 && (
            <AgGridComponent
              processCellForClipboard={processCellForClipboard}
              columns={columns}
              selectAllHeaderComponent={true}
              onGridChanged
              onBlur={(
                e,
                data,
                column,
                isChanged,
                value,
                initialValue,
                cellData
              ) => setEditChange(true)}
              onRowSelected
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              ignoreClearSelectionOnSearchandSort={true}
              customCellRenderer={(cellProps, item) => {
                if (cellProps.data.disableStoreGrade) {
                  return cellProps.value
                    ? replaceSpecialCharacter(cellProps.value)
                    : cellProps.value;
                } else {
                  return (
                    <CellRenderers
                      cellData={cellProps}
                      column={item}
                    ></CellRenderers>
                  );
                }
              }}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId={"store_code"}
              loadTableInstance={setNewTableInstance}
              suppressClickEdit={true}
              onSelectionChanged={selectionHandler}
              noRowOverlayMessage="No groups present"
            />
          )}
        </Container>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.centerAlign} ${globalClasses.marginTop}`}
        >
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={goBack}
            id="storeGrpingEditBckBtn"
          >
            Go Back
          </Button>
          <Button
            size="large"
            variant="contained"
            color="primary"
            onClick={onSave}
            id="storeGrpingEditSaveBtn"
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => onCancel()}
            id="storeGrpingEditBckBtn"
          >
            Cancel
          </Button>
        </div>
      </LoadingOverlay>
    </>
  );
};

const mapActionsToProps = {
  getColumnsAg,
  setStoreGrpFilteredCols,
  fetchGroupStores,
  deletedRowsInEdit,
  getGroupInfo,
  EditGroup,
  ToggleLoader,
  addSnack,
  setSelectedGroupToEdit,
  getTenantConfigApplicationLevel,
};
const mapStateToProps = (state) => {
  return {
    columns: state.storeGroupReducer.manualFilteredStoresCols,
    deletedStores: state.storeGroupReducer.deletedStoresInEdit,
    isLoading: state.storeGroupReducer.isLoading,
    groupName: state.storeGroupReducer.selectedGroupToEdit,
  };
};
export default connect(mapStateToProps, mapActionsToProps)(EditGrpProducts);
