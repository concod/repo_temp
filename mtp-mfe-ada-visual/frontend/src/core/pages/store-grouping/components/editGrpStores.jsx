import { Typography, Grid } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { storeGrouping } from "config/routes";
import { Prompt as IaPrompt ,Button} from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router-dom";
import LoadingOverlay from "../../../Utils/Loader/loader";
import { addSnack } from "../../../actions/snackbarActions";
import {
  EditGroup,
  ToggleLoader,
  deletedRowsInEdit,
  fetchGroupStores,
  getGroupInfo,
  setSelectedFilters,
  setSelectedGroupToEdit,
  setStoreGrpFilteredCols,
} from "../services-store-grouping/custom-store-group-service";
import PageRouteTitles from "./PageRouteTitles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { fetchGradeList } from "core/pages/store-grading/grading-services";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  useLocation,
  useNavigate,
} from "react-router-dom-v5-compat";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { handleErrorMessage } from "./common-functions";

const EditGrpProducts = (props) => {
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  // const routerParams = useParams();
  let location = useLocation();
  const [tableData, settableData] = useState([]);
  const [confirmBox, showConfirmBox] = useState(false);
  const tableInstance = useRef({});
  const isCancelled = useRef(false);
  const [columns, setColumns] = useState([]);
  const uniqueColRef = useRef(null);
  const [uniqueColName, setUniqueColName] = useState("store_code");
  const [isEdited, setIsEdited] = useState(false);

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        props.ToggleLoader(true);
        let cols = props.columns;
        if (cols.length === 0) {
          cols = await props.getColumnsAg("table_name=store_group_filter");
          props.setStoreGrpFilteredCols(cols);
        }
        cols.forEach((item) => {
          if (item.extra?.is_unique || item.extra?.is_unique === "true") {
            uniqueColRef.current = { uniqueCol: item.column_name };
            setUniqueColName(item?.column_name);
          }
        });
        props.ToggleLoader(false);
        const grpId = props.match.params.group_id;
        const res = await props.getGroupInfo(grpId);
        const grpObj = res.data.data[0];
        props.setSelectedGroupToEdit(grpObj.name);
      } catch (error) {
        props.ToggleLoader(false);
        handleErrorMessage(error, displaySnackMessages);
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
        if (item.extra?.is_unique || item.extra?.is_unique === "true") {
          uniqueColRef.current = { uniqueCol: item.column_name };
          setUniqueColName(item?.column_name);
        }
      });
      if (gradeFlag) {
        const { data } = await fetchGradeList();
        cols = cols.map((item) => {
          if (item.column_name === "grade") {
            item.options = data.data.map((item) => {
              return {
                label: item.name,
                id: item.name,
                value: item.name,
              };
            });
            item.initialData = item.options;
            item.disabled = true;
          }
          return item;
        });
        const formattedResponse = agGridColumnFormatter(cols);
        setColumns(formattedResponse);
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
        return selection?.[uniqueColName] === prod?.[uniqueColName];
      });
    });

    const deleteRows = tableRows.filter((row) => {
      return !selectedRows.some((selection) => {
        return selection?.[uniqueColName] === row?.[uniqueColName];
      });
    });
    updatedDelete.push(...deleteRows);
    if (updatedDelete?.length !== 0) {
      setIsEdited(true);
    }
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
    const uniqueId = uniqueColRef.current?.uniqueCol
      ? uniqueColRef.current.uniqueCol
      : "store_code";
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
        unique_columns: [uniqueId],
      },
    };
    try {
      const grpId = props.match.params.group_id;
      res = await props.fetchGroupStores(grpId, manualbody, pageIndex, props.pageSizeGrouping || 20);
      settableData(res.data.data);
      isCancelled.current = false;
      props.ToggleLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (error) {
      props.ToggleLoader(false);
      handleErrorMessage(error, displaySnackMessages);
    }
  };

  const goBack = () => {
    //when we navigate back to previous screen, we will render the table data
    //on mount to avoid refiltering
    //We are using shouldRenderTableData state variable to render the data
    props.setSelectedFilters([]);
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
    try {
      if ((tableInstance?.current?.api?.checkConfiguration || []).length <= 1) {
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
      const uniqueId = uniqueColRef.current?.uniqueCol
        ? uniqueColRef.current.uniqueCol
        : "store_code";
      const body = {
        name: grpObj.name,
        group_type: grpType,
        channel: grpObj?.channel ? grpObj.channel : "NC", //For now keeping it as empty channel
        objective_metrics: grpObj?.selection_metadata?.objective_metrics,
        store_ids: {
          filters: props.selectedFilters,
          meta: {
            search: [],
            range: [],
            sort: [],
          },
          metrics: [],
          selection: {
            data: tableInstance?.current?.api?.checkConfiguration,
            unique_columns: [uniqueId],
          },
        },
        store_group_ids: {
          filters: props.selectedFilters,
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
      const action = "remove_only";
      const response = await props.EditGroup(body, grpId, action);
      props.deletedRowsInEdit([]);
      props.addSnack({
        message: response?.data?.message || "Successfully updated",
        options: {
          variant: "success",
        },
      });
      refreshTableState();
      props.ToggleLoader(false);
      setIsEdited(false);
    } catch (err) {
      handleErrorMessage(err, displaySnackMessages);
      props.ToggleLoader(false);
    }
  };
  const prevScr = location.state?.prevScr;

  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: "product_grping_scr",
      label: `${dynamicLabelsBasedOnTenant("Store", "core")} Grouping`,
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
  const tabelHeaderValue = () => {
    const label = dynamicLabelsBasedOnTenant("Store", "core");
    const spacedLabel = label.replace(/([a-z])([A-Z])/g, "$1 $2");
    const pluralLabel = `${spacedLabel}s`.replace(/\s/g, "");
    return pluralLabel;
  };

  const topRightOptions = () => {
    return (
      <Button onClick={() => onModify()} size="large" variant="primary" id="storeGrpingEditGrpModifyBtn">Modify</Button>
    )
  }

  const topLeftOptions = () => {
    return (
      <div>
        Selected Group:{"  "}
        <span style={{fontWeight: "bold"}}>
          {replaceSpecialCharacter(props.groupName)}
        </span>
      </div>
    )
  }
  
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
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
        onPrimaryButtonClick={() => {
          isCancelled.current = true;
          refreshTableState();
          showConfirmBox(false);
        }}
        onSecondaryButtonClick={() => showConfirmBox(false)}
        handleClose={() => showConfirmBox(false)}
        variant="warning"
      >
        Your changes will be discarded if you proceed. Are you sure you want to cancel?
      </IaPrompt>
      <LoadingOverlay loader={props.isLoading} spinner>
        <div className={`${globalClasses.paddingAround}`}>
          <PageRouteTitles
            id="storeGrpingEditGrpBrdCrmbs"
            options={routeOptions}
          />
        <div style={{paddingTop: "1.5rem"}}>
          {columns.length > 0 && (
            <AgGridComponent
              columns={columns}
              selectAllHeaderComponent={true}
              sizeColumnsToFitFlag
              onGridChanged
              onRowSelected
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={props.pageSizeGrouping || 20}
              paginationPageSize={props.pageSizeGrouping || 20}
              uniqueRowId={
                uniqueColRef.current?.uniqueCol
                  ? uniqueColRef.current.uniqueCol
                  : "store_code"
              }
              loadTableInstance={setNewTableInstance}
              suppressClickEdit={true}
              onSelectionChanged={selectionHandler}
              tableHeader={`Edit ${tabelHeaderValue()}`}
              topRightOptions={topRightOptions()}
              topLeftOptions={topLeftOptions()}
            />
          )}
        </div>
        </div>
        <Grid
          className={`${globalClasses.stickyFooter}`}
          gap={2}
        >
          <div>
          <Button
            variant="tertiary"
            size="large"
            onClick={goBack}
            id="storeGrpingEditBckBtn"
            style={{marginRight: "10px"}}
          >
            {"< Go Back"}
          </Button>
          <Button
            variant="tertiary"
            size="large"
            onClick={() => onCancel()}
            id="storeGrpingEditBckBtn"
          >
            Cancel
          </Button>
          </div>
          {isEdited && <Button
            size="large"
            variant="secondary"
            onClick={onSave}
            id="storeGrpingEditSaveBtn"
          >
            Save
          </Button>}
        </Grid>
      </LoadingOverlay>
    </>
  );
};

const mapActionsToProps = {
  getColumnsAg,
  setStoreGrpFilteredCols,
  setSelectedFilters,
  fetchGroupStores,
  deletedRowsInEdit,
  getGroupInfo,
  EditGroup,
  ToggleLoader,
  addSnack,
  setSelectedGroupToEdit,
};
const mapStateToProps = (state) => {
  return {
    columns: state.storeGroupReducer.manualFilteredStoresCols,
    deletedStores: state.storeGroupReducer.deletedStoresInEdit,
    isLoading: state.storeGroupReducer.isLoading,
    groupName: state.storeGroupReducer.selectedGroupToEdit,
    selectedFilters: state.storeGroupReducer.selectedFilters,
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
  };
};
export default connect(mapStateToProps, mapActionsToProps)(EditGrpProducts);
