import { Button, Container, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { storeGrouping } from "config/routes";
import { Prompt as IaPrompt } from "impact-ui";
import { cloneDeep, isEmpty, isNull } from "lodash";
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
  useParams,
} from "react-router-dom-v5-compat";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

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
        const cols = await props.getColumnsAg("table_name=store_group_filter");
        cols.forEach((item) => {
          if (item.extra?.is_unique || item.extra?.is_unique === "true") {
            uniqueColRef.current = { uniqueCol: item.column_name };
            setUniqueColName(item?.column_name);
          }
        });
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
    if(updatedDelete?.length!==0){
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
      res = await props.fetchGroupStores(grpId, manualbody, pageIndex, 10);
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
      const errMsg = !isEmpty(err?.response?.data?.message)
        ? err?.response?.data?.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
      props.ToggleLoader(false);
    }
  };
  const prevScr = location.state?.prevScr;

  const routeOptions = [
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
            <Typography variant="h4">
              Edit{" "}
              {`${dynamicLabelsBasedOnTenant("Store", "core").replace(/([a-z])([A-Z])/g, '$1 $2')}s`.replace(/\s/g, '')}
            </Typography>
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
              cacheBlockSize={10}
              uniqueRowId={
                uniqueColRef.current?.uniqueCol
                  ? uniqueColRef.current.uniqueCol
                  : "store_code"
              }
              loadTableInstance={setNewTableInstance}
              suppressClickEdit={true}
              onSelectionChanged={selectionHandler}
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
            disabled={!isEdited}
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
  };
};
export default connect(mapStateToProps, mapActionsToProps)(EditGrpProducts);
