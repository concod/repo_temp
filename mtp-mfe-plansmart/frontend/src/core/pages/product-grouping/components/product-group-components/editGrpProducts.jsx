import { Button, Container, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt } from "impact-ui";
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
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";

const useStyles = makeStyles({
  contentStyle: {
    height: "20vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  textStyle: {
    fontWeight: 500,
    fontSize: 18,
  },
  actionStyle: {
    backgroundColor: "#F7F7F7",
  },
});

const EditGrpProducts = (props) => {
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
  const [displayLevels, setDisplayLevels] = useState(
    DEFAULT_LEVELS["product"].map((level) =>
      dynamicLabelKeysBasedOnTenant(level, "core")
    )
  );
  const [isStyleLevel, setisStylelevel] = useState(false);
  const [hasAggregatedConfig, setHasAggregatedConfig] = useState(false);
  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };
  const routeOptions = [
    {
      id: "product_grping_scr",
      label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
      action: () => {
        navigate("/product-grouping");
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
        if (route && wrapperRef.current.deletedProds.length > 0) {
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
        const cols = await props.getColumnsAg(tablename);
        props.setProdGrpFilteredCols(cols);
        setMountTableState(true);
        props.ToggleLoader(false);
        const grpId = routeParams.group_id;
        const res = await props.getGroupInfo(grpId);
        props.setSelectedGroupToEdit(res?.data?.data[0]?.name);
      } catch (err) {
        props.ToggleLoader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    };
    fetchData();
  }, []);

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
    if(updatedDelete?.length!==0){
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
          limit: { limit: 10, page: pageIndex + 1 },
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
        10
      );
      isCancelled.current = false;
      props.ToggleLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (err) {
      props.ToggleLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const goBack = () => {
    if (props.deletedProds.length === 0) {
      const path = location?.state?.prevScr;
      navigate(path ? path : `/product-grouping/`, {
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
    if (props.deletedProds.length === 0) {
      navigate(`/product-grouping/modify/${routeParams.group_id}`, {
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
  const onSave = async () => {
    props.ToggleLoader(true);
    const grpId = routeParams.group_id;
    const res = await props.getGroupInfo(grpId);
    const grpObj = res.data.data[0];
    let grpType = grpObj.special_classification;
    if (grpType !== "manual" && props.deletedProds.length !== 0) {
      grpType = "manual";
    }
    const body = {
      name: grpObj.name,
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
    try {
      setMountTableState(false);
      const action = "remove_only";
      await props.updateGrp(grpId, body, isStyleLevel, action);
      props.deletedRowsInEdit([]);
      props.addSnack({
        message: "Successfully updated",
        options: {
          variant: "success",
        },
      });
      setMountTableState(true);
      props.ToggleLoader(false);
      setIsEdited(false);
    } catch (error) {
      displaySnackMessages("Update Failed.Please try again", "error");
    }
  };

  const onConfirm = () => {
    props.deletedRowsInEdit([]);
    if (confirmType === "modify") {
      navigate(`/product-grouping/modify/${routeParams.group_id}`, {
        ...(props?.location?.state?.application_code && {
          state: {
            application_code: props?.location?.state?.application_code,
          },
        }),
      });
    } else {
      navigate("/product-grouping");
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
    if (props.deletedProds?.length === 0) {
      displaySnackMessages("No changes are made", "warning");
    } else {
      showConfirmBox(true);
    }
  };

  return (
    <>
      <Prompt
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
        <PageRouteTitles options={routeOptions} />
        <Container maxWidth={false} ref={wrapperRef}>
          <Prompt
            isOpen={confirmModal}
            title="Leave Page"
            subHeading="Are you sure you want to leave this page without saving changes?"
            infoList={[]}
            primaryButtonProps={{
              children: "Confirm",
              onClick: () => {
                if (route) {
                  route.action();
                }
                showConfirmModal(false);
              },
            }}
            tertiaryButtonProps={{
              children: "Cancel",
              onClick: () => showConfirmModal(false),
            }}
            variant="warning"
          />
          <Prompt
            isOpen={openPopUp}
            title="Leave Page"
            subHeading="Changes will be lost. Are you sure want to proceed ?"
            infoList={[]}
            primaryButtonProps={{
              children: "Confirm",
              onClick: () => onConfirm(),
            }}
            tertiaryButtonProps={{
              children: "Cancel",
              onClick: () => handleClose(),
            }}
            variant="warning"
          />
          <div
            className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.marginBottom}`}
          >
            <Typography variant="h4">{`Edit ${dynamicLabelsBasedOnTenant(
              "product",
              "core"
            )}s`}</Typography>
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
              id="productGrpingEditGrpsModifyBtn"
            >
              Modify
            </Button>
          </div>
          {mountTableState && props.columns.length > 0 && (
            <AgGridComponent
              columns={props.columns}
              selectAllHeaderComponent={true}
              sizeColumnsToFitFlag
              onGridChanged
              onRowSelected
              manualCallBack={(body, pageIndex, params) =>
                editGroupManualCallBack(body, pageIndex, params)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId={
                isStyleLevel
                  ? dynamicLabelKeysBasedOnTenant("style", "core")
                  : "product_code"
              }
              loadTableInstance={setNewTableInstance}
              suppressClickEdit={true}
              hideSelectAllRecords={false}
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
            id="productGrpingEditGrpsBackBtn"
          >
            Back
          </Button>
          <Button
            size="large"
            variant="contained"
            color="primary"
            onClick={onSave}
            id="productGrpingEditGrpsSaveBtn"
            disabled={!isEdited}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={onCancel}
            id="productGrpingEditCancelBtn"
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
  };
};

export default connect(mapStateToProps, mapActionsToProps)(EditGrpProducts);
