import { Grid } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt,Button } from "impact-ui-v3";
import HeaderInfoTooltip from "core/Utils/agGrid/column-component/headerInfoTooltip";
import { DEFAULT_LEVELS } from "config/constants";
import {
  EditGroup,
  ToggleLoader,
  deletedRowsInEdit,
  fetchGroupProducts,
  getGroupInfo,
  setProdGrpFilteredCols,
  setSelectedGroupToEdit,
  updateGrp,
} from "core/pages/product-grouping/product-grouping-service";
import { getRouteForPopUp } from "core/Utils/utils";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import LoadingOverlay from "../../../../Utils/Loader/loader";
import { addSnack } from "../../../../actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import PageRouteTitles from "../PageRouteTitles";
import { cloneDeep } from "lodash";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";
import { handleErrorMessage } from "./common-product-group-functions";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { downloadWithSnack } from "core/Utils/download/downloadTableData";
import { makeStyles } from "@mui/styles";
import SelectedGroupHeader from "core/pages/common/grouping/SelectedGroupHeader";
import {
  hasGroupNameChanged,
  hasPendingGroupNameChange,
  resolveGroupUpdateAction,
} from "core/pages/common/grouping/groupNameActions";

const useStyles = makeStyles(() => ({
  editGrpProductsTable: {
    "& .impact-table-main-header-left": {
      gap: "6px !important",
    },
  },
  customPadding: {
    padding: "12px 24px",
  },
}));

const EditGrpProducts = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const routeParams = useParams();
  const [confirmType, setconfirmType] = useState("");
  const [openPopUp, setopenPopUp] = useState(false);
  const tableInstance = useRef({});
  const [route, setRoute] = useState({});
  const wrapperRef = useRef(null);
  const [confirmBox, showConfirmBox] = useState(false);
  const [confirmModal, showConfirmModal] = useState(false);
  const [mountTableState, setMountTableState] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [pendingGroupName, setPendingGroupName] = useState("");
  const originalGroupNameRef = useRef("");
  const groupNameEditStateRef = useRef({
    isEditing: false,
    draftName: "",
    baselineName: "",
  });
  const [displayLevels, setDisplayLevels] = useState(
    DEFAULT_LEVELS["product"].map((level) =>
      dynamicLabelKeysBasedOnTenant(level, "core")
    )
  );
  const [isStyleLevel, setisStylelevel] = useState(false);
  const [hasAggregatedConfig, setHasAggregatedConfig] = useState(false);
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };
  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: "product_grping_scr",
      label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
      action: () => {
        navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping`);
      },
    },
    {
      id: "view Group",
      label: "View Group",
      action: () => null,
    },
  ];

  const useOutsideclickHandler = (ref) => {
    useEffect(() => {
      function handleClickOutside(event) {
        const route = getRouteForPopUp(ref, routeOptions, event, "View Group");
        if (
          route &&
          (wrapperRef.current.deletedProds.length > 0 ||
            wrapperRef.current.hasUnsavedNameChange)
        ) {
          setRoute(route);
          showConfirmModal(true);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);
  };
  useOutsideclickHandler(wrapperRef);
  useEffect(() => {
    if (!wrapperRef.current) {
      wrapperRef.current = {};
    }
    wrapperRef.current.deletedProds = props.deletedProds;
    wrapperRef.current.hasUnsavedNameChange = hasPendingGroupNameChange(
      pendingGroupName,
      originalGroupNameRef.current,
      groupNameEditStateRef.current
    );
  }, [props.deletedProds, pendingGroupName]);
  const isCancelled = useRef(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        props.ToggleLoader(true);
        let tablename = "table_name=product_group_filter";
        const displayLevelsResp = await props.getTenantConfigApplicationLevel(
          3,
          {
            attribute_name: "display_levels",
          }
        );
        let updatedLevels = cloneDeep(displayLevels);
        let hasGroupingConfig = Boolean(
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
            "productGrouping"
          ]
        );
        //By default, we have 2 levels, product and style
        //If user wants to hide any level, we can pass in those levels
        //in the hiddenLevels of displayLevels key in tenant attribute master
        //Along with that, we can also provide default level key
        if (
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"] &&
          (displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ] ||
            hasGroupingConfig)
        ) {
          const requiredConfig = hasGroupingConfig
            ? displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
                "productGrouping"
              ]
            : displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
                "value"
              ]?.["product"];
          let defaultLvl = requiredConfig?.["default"];
          const hidden_levels = requiredConfig?.["hidden_levels"];
          if (hidden_levels) {
            updatedLevels = cloneDeep(updatedLevels).filter(
              (level) =>
                !hidden_levels.includes(
                  dynamicLabelKeysBasedOnTenant(level, "core")
                )
            );
            setDisplayLevels(updatedLevels);
            setHasAggregatedConfig(hidden_levels.includes("product"));
          }
          if (defaultLvl !== "product") {
            setisStylelevel(true);
            tablename = "table_name=product_group_filter_hierarchy";
          }
        }
        if (props.columns.length === 0) {
          const cols = await props.getColumnsAg(tablename);
          props.setProdGrpFilteredCols(cols);
        }
        setMountTableState(true);
        props.ToggleLoader(false);
        const grpId = routeParams.group_id;
        const res = await props.getGroupInfo(grpId);
        const groupName = res?.data?.data[0]?.name;
        props.setSelectedGroupToEdit(groupName);
        originalGroupNameRef.current = groupName;
        setPendingGroupName(groupName);
      } catch (err) {
        props.ToggleLoader(false);
        handleErrorMessage(err, displaySnackMessages);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (props.groupName && !originalGroupNameRef.current) {
      originalGroupNameRef.current = props.groupName;
      setPendingGroupName(props.groupName);
    }
  }, [props.groupName]);

  const selectionHandler = (event) => {
    let selectedRows = event.api.getSelectedRows();
    let tableRows = event.api.getRenderedNodes().map((item) => {
      return item.data;
    });
    const type = isStyleLevel
      ? dynamicLabelKeysBasedOnTenant("style", "core")
      : "product_code";
    let updatedDelete = props.deletedProds.filter((prod) => {
      return !selectedRows.some((selection) => {
        if (isStyleLevel) {
          return selection[type] === prod[type];
        } else {
          return selection[type] === prod[type];
        }
      });
    });
    const deleteRows = tableRows.filter((row) => {
      return !selectedRows.some((selection) => {
        if (isStyleLevel) {
          return selection[type] === row[type];
        } else {
          return selection[type] === row[type];
        }
      });
    });
    updatedDelete.push(...deleteRows);
    if (updatedDelete?.length !== 0 || selectedRows.length !== tableRows.length) {
      setIsEdited(true);
    }
    props.deletedRowsInEdit(updatedDelete);
    wrapperRef.current.deletedProds = updatedDelete;
  };

  const editGroupManualCallBack = async (body, pageIndex, params) => {
    props.ToggleLoader(true);
    try {
      const level = hasAggregatedConfig ? "aggregation" : null;
      let res = {
        data: {
          data: [],
          total: 0,
        },
      };
      let manualBody = {
        meta: {
          ...body,
          limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 },
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
          unique_columns: [isStyleLevel ? "article" : "product_code"],
        },
      };
      const grpId = routeParams.group_id;
      res = await props.fetchGroupProducts(
        grpId,
        manualBody,
        level,
        pageIndex + 1,
        props.pageSizeGrouping || 20
      );
      isCancelled.current = false;
      setTotalRowsCount(res.data.total);
      props.ToggleLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (err) {
      props.ToggleLoader(false);
      handleErrorMessage(err, displaySnackMessages);
    }
  };

  const hasUnsavedChanges = () =>
    props.deletedProds.length > 0 ||
    hasPendingGroupNameChange(
      pendingGroupName,
      originalGroupNameRef.current,
      groupNameEditStateRef.current
    );

  const handleGroupNameEditStateChange = (editState) => {
    groupNameEditStateRef.current = editState;
  };

  const goBack = () => {
    if (!hasUnsavedChanges()) {
      const path = location?.state?.prevScr;
      navigate(path ? path : `${STORE_ELIGIBILITY_GROUP}/product-grouping/`, {
        state: {
          from: location.pathname,
        },
      });
    } else {
      setopenPopUp(true);
      setconfirmType("back");
    }
  };

  const onModify = () => {
    if (!hasUnsavedChanges()) {
      navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/${routeParams.group_id}`, {
        ...(props?.location?.state?.application_code && {
          state: {
            application_code: props?.location?.state?.application_code,
          },
        }),
      });
    } else {
      setopenPopUp(true);
      setconfirmType("modify");
    }
  };
  const handleClose = () => {
    setopenPopUp(false);
  };
  const handleGroupNameChange = (newName) => {
    setPendingGroupName(newName);
    props.setSelectedGroupToEdit(newName);
    if (hasGroupNameChanged(newName, originalGroupNameRef.current)) {
      setIsEdited(true);
    }
  };

  const onSave = async () => {
    const hasSelectionChanges =
      props.deletedProds.length !== 0 ||
      (tableInstance?.current?.api?.checkConfiguration || []).length > 1;
    const nameChanged = hasGroupNameChanged(
      pendingGroupName,
      originalGroupNameRef.current
    );

    if (!hasSelectionChanges && !nameChanged) {
      displaySnackMessages("No changes to Save", "warning");
      return;
    }

    props.ToggleLoader(true);
    try {
      const grpId = routeParams.group_id;
      const res = await props.getGroupInfo(grpId);
      const grpObj = res.data.data[0];
      let grpType = grpObj.special_classification;
      if (grpType !== "manual" && props.deletedProds.length !== 0) {
        grpType = "manual";
      }
      const body = {
        name: pendingGroupName,
        group_type: grpType,
        objective_metrics: grpObj.selection_metadata["objective_metrics"],
        group_definition_ids: grpObj.selection_metadata["defintion_ids"],
        product_ids: {
          filters: [],
          meta: {
            search: [],
            range: [],
            sort: [],
          },
          metrics: [],
          selection: {
            data: tableInstance?.current?.api?.checkConfiguration,
            unique_columns: [isStyleLevel ? "article" : "product_code"],
          },
        },
        product_group_ids: {
          filters: [],
          meta: {
            search: [],
            range: [],
            sort: [],
          },
          metrics: [],
          selection: {
            data: [],
            unique_columns: ["pg_code"],
          },
        },
      };
      setMountTableState(false);
      const action = resolveGroupUpdateAction(
        "remove_only",
        hasSelectionChanges,
        nameChanged
      );
      const response = await props.updateGrp(grpId, body, isStyleLevel, action);
      props.deletedRowsInEdit([]);
      props.addSnack({
        message: response?.data?.message || "Successfully updated",
        options: {
          variant: "success",
        },
      });
      originalGroupNameRef.current = pendingGroupName;
      setIsEdited(false);
    } catch (error) {
      handleErrorMessage(error, displaySnackMessages);
    } finally {
      setMountTableState(true);
      props.ToggleLoader(false);
    }
  };

  const onConfirm = () => {
    props.deletedRowsInEdit([]);
    if (confirmType === "modify") {
      navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/${routeParams.group_id}`, {
        ...(props?.location?.state?.application_code && {
          state: {
            application_code: props?.location?.state?.application_code,
          },
        }),
      });
    } else {
      navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping`);
    }
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
    if (!hasUnsavedChanges()) {
      displaySnackMessages("No changes are made", "warning");
    } else {
      showConfirmBox(true);
    }
  };

  const getTopRightOptions = () => {
    let options = []
    options.push(<Button
      onClick={() => onModify()}
      size="large"
      variant="primary"
      id="productGrpingEditGrpsModifyBtn"
    >
      Modify
    </Button>)

    return options
  };

  const getTopLeftOptions = () => (
    <SelectedGroupHeader
      groupName={pendingGroupName || props.groupName}
      onNameChange={handleGroupNameChange}
      onEditStateChange={handleGroupNameEditStateChange}
    />
  );

  const getTableHeader = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span>{`Edit ${dynamicLabelsBasedOnTenant("product", "core")}s`}</span>
      <HeaderInfoTooltip
        iconSize={16}
        orientation="right"
        text="Products are selected by default. Deselect the ones not required."
      />
    </div>
  );

  return (
    <>
      <Prompt
        isOpen={confirmBox}
        title="Cancel Changes"
        primaryButtonLabel="Yes"
        onPrimaryButtonClick={() => {
            isCancelled.current = true;
            refreshTableState();
            showConfirmBox(false);
        }}
        handleClose={() => showConfirmBox(false)}
        secondaryButtonLabel="No"
        onSecondaryButtonClick={() => showConfirmBox(false)}
        variant="warning"

      >
        Your changes will be discarded if you proceed. Are you sure you want to cancel?
      </Prompt>
      <LoadingOverlay loader={props.isLoading} spinner>
        <div className={classes.customPadding}>
          <div className={globalClasses.breadcrumbPadding}><PageRouteTitles options={routeOptions} /></div>
        </div>
        <div ref={wrapperRef} className={`${globalClasses.paddingHorizontal}`}>
          <Prompt
            isOpen={confirmModal}
            title="Leave Page"
            primaryButtonLabel="Confirm"
            onPrimaryButtonClick={() => {
              if (route) {
                route.action();
                }
                showConfirmModal(false);
            }}
            secondaryButtonLabel="Cancel"
            onSecondaryButtonClick={() => showConfirmModal(false)}
            variant="warning"
            handleClose={() => showConfirmModal(false)}
          >
            Are you sure you want to leave this page without saving changes?
          </Prompt>
          <Prompt
            isOpen={openPopUp}
            title="Leave Page"
            primaryButtonLabel="Confirm"
            onPrimaryButtonClick={() => onConfirm()}
            secondaryButtonLabel="Cancel"
            onSecondaryButtonClick={() => handleClose()}
            variant="warning"
            handleClose={() => handleClose()}
          >
            Are you sure you want to leave this page without saving changes?
          </Prompt>
          {mountTableState && props.columns.length > 0 && (
            <div className={classes.editGrpProductsTable}>
            <AgGridComponent
              columns={props.columns}
              selectAllHeaderComponent={true}
              sizeColumnsToFitFlag
              onGridChanged
              onRowSelected
              disablePaginationForSinglePage
              manualCallBack={(body, pageIndex, params) =>
                editGroupManualCallBack(body, pageIndex, params)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={props.pageSizeGrouping || 20}
              paginationPageSize={props.pageSizeGrouping || 20}
              uniqueRowId={
                isStyleLevel
                  ? dynamicLabelKeysBasedOnTenant("style", "core")
                  : "product_code"
              }
              loadTableInstance={setNewTableInstance}
              suppressClickEdit={true}
              hideSelectAllRecords={false}
              onSelectionChanged={selectionHandler}
              tableHeader={getTableHeader()}
              topRightOptions={getTopRightOptions()}
              topLeftOptions={getTopLeftOptions()}
              showDownloadButton={totalRowsCount > 0}
              onDownloadButtonClick={() => downloadWithSnack({
                tableRef: tableInstance,
                columns: props.columns,
                filters: [],
                totalRowsCount,
                tableApi: `core/group/product/${routeParams.group_id}/products${hasAggregatedConfig ? '?level=aggregation' : ''}`,
                uniqueColumns: [isStyleLevel ? "article" : "product_code"],
              }, displaySnackMessages)}
            />
            </div>
          )}
        </div>
        <Grid
          gap={2}
          className={`${globalClasses.stickyFooter}`}
        >
          <div>
          <Button
            variant="tertiary"
            size="large"
            onClick={goBack}
            id="productGrpingEditGrpsBackBtn"
            sx={{marginRight: "1rem"}}
          >
            {"< Back to Product Grouping"}
          </Button>
          {isEdited && <>
          </>}
          <Button
            variant="tertiary"
            size="large"
            onClick={onCancel}
            id="productGrpingEditCancelBtn"
          >
            Cancel
          </Button>
          </div>
          {isEdited && <Button
            size="large"
            variant="primary"
            onClick={onSave}
            id="productGrpingEditGrpsSaveBtn"
            disabled={!isEdited}
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
  setProdGrpFilteredCols,
  fetchGroupProducts,
  deletedRowsInEdit,
  getGroupInfo,
  EditGroup,
  ToggleLoader,
  addSnack,
  getTenantConfigApplicationLevel,
  setSelectedGroupToEdit,
  updateGrp,
};

const mapStateToProps = (state) => {
  return {
    columns: state.productGroupReducer.manualFilteredProdsCols,
    deletedProds: state.productGroupReducer.deletedProdsInEdit,
    isLoading: state.productGroupReducer.isLoading,
    groupName: state.productGroupReducer.selectedGroupToEdit,
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
  };
};

export default connect(mapStateToProps, mapActionsToProps)(EditGrpProducts);
