import { Checkbox, FormControlLabel, Grid, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import clsx from "clsx";
import { DEFAULT_LEVELS } from "config/constants";
import { Prompt, Switch } from "impact-ui";
import _, { cloneDeep } from "lodash";
import moment from "moment";
import {
  ToggleLoader,
  addSelectedGroups,
  addToExistingProds,
  deletedGrpsInEdit,
  deletedRowsInEdit,
  fetchProdGrpFilteredProducts,
  fetchProductGroups,
  fetchRequestInfo,
  fetchStyleLevelData,
  newGrpsInEdit,
  newRowsInEdit,
  resetFilterProds,
  setDeletedProdsInDefn,
  setDeletedStylesInDefn,
  setGroupsCols,
  setInitialMetricFilters,
  setMetricEndDate,
  setMetricStartDate,
  setProdGroupFilteredProds,
  setResetFilterTable,
  setSelectedManualStyles,
  setSelectedObjectiveMetric,
  setSelectedObjectiveTimeFormat,
  setSelectedProducts,
  setStyleTableCols,
  setStyleTableData,
  updateGrp,
  bulkAddStores,
} from "core/pages/product-grouping/product-grouping-service";
import { formatFiltersDependency } from "core/pages/store-grouping/components/common-functions";
import { forwardRef, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { setSelectedFilters } from "../../../../actions/filterAction";
import { addSnack } from "../../../../actions/snackbarActions";
import { setTableState } from "../../../../actions/tableColumnActions";
import "../groupTable.scss";
import RequestsTable from "./clusterRequestsTable";
import ManualProdGroupTable from "./manual-product-group-table";
import ManualProductTable from "./manual-product-tables";
import ManualStyleTable from "./manual-style-table";
import GroupName from "./productGroupName";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles((theme) => ({
  cancelBtn: {
    backgroundColor: "white",
    color: "#4F677B",
    borderColor: "#4F677B",
  },
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
  checkBoxGrid: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: theme.typography.pxToRem(10),
  },
}));
const FilteredProducts = forwardRef((props, ref) => {
  const classes = useStyles();
  const [selectedProducts, setselectedProducts] = useState([]);
  const [open, setopen] = useState(false);
  const [isIncludeGrpsChecked, setisIncludeGrpsChecked] = useState(false);
  const [selectedGrps, setselectedGrps] = useState([]);
  const [confirmPopUp, setconfirmPopUp] = useState(false);
  const [isStyleLevel, setisStylelevel] = useState(false);
  const [confirmDefnPopUp, setconfirmDefnPopUp] = useState(false);
  const [openRequests, setopenRequests] = useState(false);
  const [selectedCluster, setselectedCluster] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasAggregatedConfig, setHasAggregatedConfig] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const isCancelledOrUpdated = useRef(false);
  const isCancelledOrUpdatedGroups = useRef(false);
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();

  const [displayLevels, setDisplayLevels] = useState(
    DEFAULT_LEVELS["product"].map((level) =>
      dynamicLabelKeysBasedOnTenant(level, "core")
    )
  );

  const openReqFunc = () => {
    setopenRequests(true);
  };
  const closeReqFunc = async (reqData = null) => {
    setopenRequests(false);
    if (!_.isEmpty(reqData)) {
      props.ToggleLoader(true);
      try {
        const reqInfo = await props.fetchRequestInfo(reqData.id);
        const filters = reqInfo.data.data.metrics.filters.map((filter) => {
          return {
            ...filter,
            filter_id: filter.attribute_name,
          };
        });
        props.setInitialMetricFilters(filters);
        if (props.selectedGroupType === "objective") {
          props.setSelectedObjectiveMetric([
            {
              label: reqInfo.data.data.metrics.metrics.value[0],
              value: reqInfo.data.data.metrics.metrics.value[0],
            },
          ]);
        } else {
          props.setSelectedObjectiveMetric(
            reqInfo.data.data.metrics.metrics.value.map((metric) => {
              return {
                label: metric,
                value: metric,
                checked: true,
              };
            })
          );
        }
        props.setMetricStartDate(
          moment(reqInfo.data.data.metrics.metrics.start_date, "YYYY-MM-DD")
        );
        props.setMetricEndDate(
          moment(reqInfo.data.data.metrics.metrics.end_date, "YYYY-MM-DD")
        );
        props.setSelectedObjectiveTimeFormat({
          label: reqInfo.data.data.metrics.metrics.time_format,
          value: reqInfo.data.data.metrics.metrics.time_format,
        });
        setselectedCluster(reqInfo.data.data);
        ref.productLvlRef?.current?.api?.refreshServerSideStore({
          purge: false,
        });
        props.ToggleLoader(false);
      } catch (error) {
        props.addSnack({
          message: "something went wrong",
          options: {
            variant: "error",
          },
        });
        props.ToggleLoader(false);
      }
    }
  };

  const goBack = () => {
    const groupTypeExpression =
      props.selectedGroupType !== "manual" ||
      (props.selectedGroupType === "manual" &&
        props.selectedManualFilterType === "product_hierarchy");
    const isEditedExpression =
      props.deleteEditProds.length !== 0 || props.newEditProds.length !== 0;
    const isCreatedExpression =
      props.selectedProducts.length !== 0 || props.selectedGrps.length !== 0;
    const isDefinitionsProdAddedCheck = props.deletedDefnProds.length !== 0;
    if (groupTypeExpression && (isEditedExpression || isCreatedExpression)) {
      setconfirmPopUp(true);
      return;
    }

    const pathToViewGroup = props.prevScr
      ? `${props.prevScr}/product-grouping/view/`
      : `/product-grouping/view/`;
    const pathToProductGrouping = props.prevScr
      ? `${props.prevScr}`
      : `/product-grouping/`;

    if (props.isEdit && groupTypeExpression && !isEditedExpression) {
      props.resetFilterProds();
      const grpId = location.pathname.split("/")[3];
      navigate(`${pathToViewGroup}${grpId}`, {
        state: {
          from: location.pathname,
        },
      });
      return;
    }

    if (!props.isEdit && groupTypeExpression && !isCreatedExpression) {
      props.resetFilterProds();
      navigate(pathToProductGrouping, {
        state: {
          from: location.pathname,
        },
      });
      return;
    }

    if (!groupTypeExpression && isDefinitionsProdAddedCheck) {
      setconfirmPopUp(true);
      return;
    }

    if (props.isEdit && !groupTypeExpression && !isDefinitionsProdAddedCheck) {
      props.resetFilterProds();
      const grpId = location.pathname.split("/")[3];
      navigate(`${pathToViewGroup}${grpId}`, {
        ...{
          state: {
            from: location.pathname,
          },
        },
      });
      return;
    }

    if (!groupTypeExpression && !isDefinitionsProdAddedCheck) {
      props.resetFilterProds();
      history.push({
        pathname: pathToProductGrouping,
        state: {
          from: history.location.pathname,
        },
      });
    }
  };

  useEffect(() => {
    const fetchDisplayLevels = async () => {
      const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
        attribute_name: "display_levels",
      });
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
        setHasAggregatedConfig(hasGroupingConfig);
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
        }
        if (defaultLvl !== "product") {
          setisStylelevel(true);
        }
      }
    };
    // fetchStyleInfo();
    fetchDisplayLevels();
  }, []);
  useEffect(() => {
    closeReqFunc(props.selectedCluster);
    setselectedCluster(props.selectedCluster);
  }, [props.selectedCluster]);
  useEffect(() => {
    if (props.resetFilterTable) {
      props.setResetFilterTable(!props.resetFilterTable);
    }
  }, [props.resetFilterTable]);
  useEffect(() => {
    props.setResetFilterTable(true);
  }, [props.selectedGroupType, props.selectedManualFilterType]);
  useEffect(() => {
    if (props.selectedManualFilterType !== "product_hierarchy") {
      setisIncludeGrpsChecked(false);
    }
  }, [props.selectedManualFilterType]);

  useEffect(() => {
    let filterObj = {};
    filterObj["product_hierarchy"] = [];
    props.setSelectedFilters(filterObj);
    return () => {
      let obj = {};
      obj["product_filters"] = {
        filters: [],
        pageIndex: 0,
        pageSize: 10,
      };
      obj["style_filters"] = {
        filters: [],
        pageIndex: 0,
        pageSize: 10,
      };
      props.setTableState(obj);
    };
  }, []);

  const toggleModalState = (status, isCancelled) => {
    if (props.isEdit) {
      onUpdate();
      return;
    }
    if (isCancelled) {
      setopen(status);
      setconfirmDefnPopUp(false);
      return;
    }
    if (
      props.selectedManualFilterType === "grouping_definitions" &&
      props.deletedDefnProds.length !== 0
    ) {
      setconfirmDefnPopUp(true);
    } else {
      setopen(status);
    }
  };

  const getFormattedPayloadObject = (filters, selectionData, uniqueCol) => {
    return {
      filters: filters,
      meta: {
        search: [],
        range: [],
        sort: [],
      },
      definitions: [],
      metrics: [],
      selection: {
        data: selectionData,
        unique_columns: [uniqueCol],
      },
    };
  };

  const onUpdate = async () => {
    let grpType = props.grpObj.special_classification;
    if (
      (grpType !== "manual" && props.newEditProds.length !== 0) ||
      props.deleteEditProds.length !== 0 ||
      props.newEditGrps.length !== 0 ||
      props.deleteEditGrps.length !== 0
    ) {
      grpType = "manual";
    }
    let body = {
      name: props.grpObj.name,
      group_type: grpType,
      ...(grpType !== "manual" && {
        objective_metrics: props.grpObj.selection_metadata.objective_metrics,
      }),
      definitions: Array.isArray(props.manualDefinitionFilter)
        ? props.manualDefinitionFilter.map((defn) => defn.pgd_code)
        : [props.manualDefinitionFilter.pgd_code],
    };
    const staticPayloadObject = {
      searchColumns: {
        is_mapped: {
          filterType: "bool",
          filter: true,
        },
      },
      checkAll: true,
    };
    const config = isStyleLevel
      ? [
        staticPayloadObject,
        ...(ref.styleLvlRef?.current?.api?.checkConfiguration || []),
      ]
      : [
          staticPayloadObject,
          ...(ref.productLvlRef?.current?.api?.checkConfiguration || []),
        ];
    const uniqueColumnKey = isStyleLevel
      ? dynamicLabelKeysBasedOnTenant("style", "core")
      : "product_code";
    const groupData = [
      staticPayloadObject,
      ...(ref.productGroupLvlRef?.current?.api?.checkConfiguration || []),
    ];
    const formattedFilterDependency = formatFiltersDependency(
      props.selectedFilters,
      "product",
      true
    );
    body["product_ids"] = getFormattedPayloadObject(
      formattedFilterDependency,
      config,
      uniqueColumnKey
    );
    body["product_group_ids"] = getFormattedPayloadObject(
      formattedFilterDependency,
      groupData,
      "pg_code"
    );
    try {
      props.ToggleLoader(true);
      const grpId = location.pathname.split("/")[3];
      const action = "add_remove";
      await props.updateGrp(grpId, body, isStyleLevel, action);
      isCancelledOrUpdated.current = true;
      if (isIncludeGrpsChecked) {
        isCancelledOrUpdatedGroups.current = true;
      }
      props.resetFilterProds();
      refreshTables();
      props.addSnack({
        message: `${
          isStyleLevel
            ? dynamicLabelsBasedOnTenant("style", "core")
            : dynamicLabelsBasedOnTenant("product", "core")
        } added successfully"`,
        options: {
          variant: "success",
          onClose: onProceed(),
        },
      });
      props.ToggleLoader(false);
    } catch (error) {
      props.ToggleLoader(false);
      props.addSnack({
        message: "Update Failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const handleClose = () => {
    setconfirmPopUp(false);
  };

  const onDefnProceed = () => {
    setopen(true);
  };

  const handleDefnPopUpClose = () => {
    setconfirmDefnPopUp(false);
  };

  const onProceed = () => {
    setconfirmPopUp(false);
    if (props.isEdit) {
      const grpId = location.pathname.split("/")[3];
      navigate(`/product-grouping/view/${grpId}`);
    } else {
      navigate("/product-grouping/");
    }
    props.resetFilterProds();
  };

  const toggleAggLevel = () => {
    setShowConfirmModal(true);
  };

  const onConfirmCallBack = (stateValue) => {
    if (stateValue) {
      setisStylelevel(!isStyleLevel);
    }
  };

  const refreshTables = () => {
    if (isStyleLevel) {
      ref.styleLvlRef.current.api.refreshServerSideStore({ purge: true });
    } else {
      ref.productLvlRef.current.api.refreshServerSideStore({ purge: true });
    }
    if (isIncludeGrpsChecked) {
      ref.productGroupLvlRef.current.api.refreshServerSideStore({
        purge: true,
      });
    }
  };

  const handleAddProducts = async () => {
    const body = {
      product_groups: [
        ...props.selectedProductGroups?.map((group) => {
          return {
            pg_code: group.pg_code,
            name: group.name,
            group_type: group.special_classification,
          };
        }),
      ],
      definitions: [],
    };
    const formattedFilterDependency = formatFiltersDependency(
      props.selectedFilters,
      "product",
      true
    );
    const uniqueColumnKey = isStyleLevel
      ? dynamicLabelKeysBasedOnTenant("style", "core")
      : "product_code";
    body["product_ids"] = getFormattedPayloadObject(
      formattedFilterDependency,
      isStyleLevel
        ? ref.styleLvlRef?.current?.api?.checkConfiguration || []
        : [...(ref.productLvlRef?.current?.api?.checkConfiguration || [])],
      uniqueColumnKey
    );
    body["product_group_ids"] = getFormattedPayloadObject(
      formattedFilterDependency,
      [...(ref.productGroupLvlRef?.current?.api?.checkConfiguration || [])],
      "pg_code"
    );
    try {
      props.ToggleLoader(true);
      const level = isStyleLevel ? "aggregate" : null;
      await props.bulkAddStores(body, level);
      if (isStyleLevel) {
        ref.styleLvlRef?.current?.api?.setCheckConfiguration([]);
        ref.styleLvlRef?.current?.api?.setPrevAction(null);
      } else {
        ref.productLvlRef?.current?.api?.setCheckConfiguration([]);
        ref.productLvlRef?.current?.api?.setPrevAction(null);
      }
      isCancelledOrUpdated.current = true;
      if (isIncludeGrpsChecked) {
        isCancelledOrUpdatedGroups.current = true;
        ref.productGroupLvlRef?.current?.api?.setCheckConfiguration([]);
        ref.productGroupLvlRef?.current?.api?.setPrevAction(null);
      }
      props.resetFilterProds();
      refreshTables();
      props.addSnack({
        message: `${
          isStyleLevel
            ? dynamicLabelsBasedOnTenant("style", "core")
            : dynamicLabelsBasedOnTenant("product", "core")
        } added successfully"`,
        options: {
          variant: "success",
          onClose: onProceed(),
        },
      });
      props.ToggleLoader(false);
    } catch (error) {
      props.ToggleLoader(false);
      props.addSnack({
        message: "Update Failed",
        options: {
          variant: "error",
        },
      });
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
            isCancelledOrUpdated.current = true;
            if (isIncludeGrpsChecked) {
              isCancelledOrUpdatedGroups.current = true;
            }
            props.resetFilterProds();
            refreshTables();
            showConfirmBox(false);
          },
        }}
        tertiaryButtonProps={{
          children: "No",
          onClick: () => showConfirmBox(false),
        }}
        variant="warning"
      />
      <Prompt
        isOpen={showConfirmModal}
        title="Switch Hierarchy Level"
        subHeading="Are you sure of switching the hierarchy level \n Your selections will be lost"
        infoList={[]}
        primaryButtonProps={{
          children: "Confirm",
          onClick: () => {
            onConfirmCallBack(true);
            setShowConfirmModal(false);
          },
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => setShowConfirmModal(false),
        }}
        variant="warning"
      />
      <Prompt
        isOpen={confirmDefnPopUp}
        title="Warning"
        subHeading="Some of the products were unmapped. Do you wish to proceed?"
        infoList={[]}
        primaryButtonProps={{
          children: "Confirm",
          onClick: () => onDefnProceed(),
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => handleDefnPopUpClose(),
        }}
        variant="warning"
      />
      <Prompt
        isOpen={confirmPopUp}
        title="Leave Page"
        subHeading="Changes will be lost. Are you sure want to proceed?"
        infoList={[]}
        primaryButtonProps={{
          children: "Confirm",
          onClick: () => onProceed(),
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => handleClose(),
        }}
        variant="warning"
      />
      {open && (
        <GroupName
          ref={{
            productLvlRef: ref.productLvlRef,
            styleLvlRef: ref.styleLvlRef,
            productGroupLvlRef: ref.productGroupLvlRef,
          }}
          selectedFilters={props.selectedFilters}
          open={open}
          handleClose={(isCancelled) => toggleModalState(false, isCancelled)}
          currentScrSelection={selectedProducts}
          currentScrGrps={selectedGrps}
          clusterData={selectedCluster}
          isStyleLevel={isStyleLevel}
        />
      )}
      {openRequests && (
        <RequestsTable
          dimension="product"
          selectedGroupType={props.selectedGroupType}
          // key="request_table"
          open={openRequests}
          handleClose={closeReqFunc}
        />
      )}

      {props.columns.length !== 0 && (
        <>
          <Grid container>
            <Grid
              item
              xs={4}
              className={clsx(
                globalClasses.verticalAlignCenter,
                globalClasses.flexRow
              )}
            >
              <Typography variant="h5">{`Filtered ${dynamicLabelsBasedOnTenant(
                "product",
                "core"
              )}`}</Typography>
            </Grid>
            <Grid
              item
              xs={4}
              className={clsx(
                globalClasses.verticalAlignCenter,
                globalClasses.flexRow
              )}
            >
              {props.selectedGroupType === "manual" &&
                displayLevels.length === 2 && (
                  <Switch
                    checked={isStyleLevel}
                    onChange={toggleAggLevel}
                    id="productToggleBtn"
                    rightLabel={
                      displayLevels.includes(
                        dynamicLabelKeysBasedOnTenant("style", "core")
                      ) &&
                      `${dynamicLabelsBasedOnTenant("style", "core")}
                    level`
                    }
                    leftLabel={
                      displayLevels.includes("product") &&
                      `${dynamicLabelsBasedOnTenant("product", "core")}
                    level`
                    }
                  />
                )}
            </Grid>
            <Grid
              item
              xs={4}
              className={clsx(
                globalClasses.verticalAlignCenter,
                globalClasses.flexRow,
                classes.checkBoxGrid
              )}
            >
              {props.selectedGroupType !== "manual" && (
                <Button
                  onClick={openReqFunc}
                  variant="contained"
                  color="primary"
                >
                  View Cluster Status
                </Button>
              )}
              {props.selectedGroupType === "manual" &&
                props.selectedManualFilterType === "product_hierarchy" && (
                  <FormControlLabel
                    id="productGroupingIncludeGrpsLabel"
                    control={
                      <Checkbox
                        id="productGroupingIncludeGrpsCheckbox"
                        color="primary"
                        checked={isIncludeGrpsChecked}
                        onChange={(event) =>
                          setisIncludeGrpsChecked(event.target.checked)
                        }
                      />
                    }
                    label={`Include ${dynamicLabelsBasedOnTenant(
                      "product",
                      "core"
                    )} Groups`}
                  />
                )}
            </Grid>
          </Grid>
          {!isStyleLevel && (
            <>
              <ManualProductTable
                ref={{
                  productLvlRef: ref.productLvlRef,
                  isCancelledOrUpdated: isCancelledOrUpdated,
                }}
                selectedFilters={props.selectedFilters}
                type={"product"}
                manualDefinitionFilter={props.manualDefinitionFilter}
                columns={props.columns}
                pathname={location.pathname}
                isEdit={props.isEdit}
                selectedCluster={selectedCluster}
              />
            </>
          )}
          {isStyleLevel && (
            <ManualStyleTable
              ref={{
                styleLvlRef: ref.styleLvlRef,
                isCancelledOrUpdated: isCancelledOrUpdated,
              }}
              selectedFilters={props.selectedFilters}
              type={"style"}
              manualDefinitionFilter={props.manualDefinitionFilter}
              styleLevelCols={props.styleLevelCols}
              pathname={location.pathname}
              isEdit={props.isEdit}
              selectedCluster={selectedCluster}
              level={hasAggregatedConfig ? "aggregation" : null}
            />
          )}

          {isIncludeGrpsChecked &&
            props.selectedManualFilterType === "product_hierarchy" && (
              <ManualProdGroupTable
                ref={{
                  productGroupLvlRef: ref.productGroupLvlRef,
                  isCancelledOrUpdatedGroups: isCancelledOrUpdatedGroups,
                }}
                type={"product_group"}
                pathname={location.pathname}
                isEdit={props.isEdit}
                selectedFilters={props.selectedFilters}
                manualDefinitionFilter={props.manualDefinitionFilter}
                selectedCluster={selectedCluster}
              />
            )}
        </>
      )}
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.centerAlign} ${globalClasses.marginTop}`}
      >
        <Button
          variant="outlined"
          classes={{ root: classes.cancelBtn }}
          onClick={goBack}
          id="productGrpingProdFiltersBackBtn"
        >
          {" "}
          Go Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          id={
            props.isEdit
              ? "productGrpingProdFiltersUpdBtn"
              : "productGrpingProdFiltersSaveBtn"
          }
          onClick={() =>
            location.pathname?.includes("add-products")
              ? handleAddProducts()
              : toggleModalState(true)
          }
        >
          {location.pathname?.includes("add-products")
            ? `Add ${dynamicLabelsBasedOnTenant("style", "core")}`
            : props.isEdit
            ? "Update"
            : "Save"}
        </Button>
        <Button
          variant="outlined"
          classes={{ root: classes.cancelBtn }}
          onClick={() => showConfirmBox(true)}
          id="productGrpingProdFiltersCnclBtn"
        >
          {" "}
          Cancel
        </Button>
      </div>
    </>
  );
});

const getTabLevelSelectedFilters = (type, state) => {
  switch (type) {
    case "manual":
      return state.filterReducer.selectedFilters[
        "product-grouping-manual-group-product-0"
      ];
    case "objective":
      return state.filterReducer.selectedFilters["product_metric"];
    case "custom":
      return state.filterReducer.selectedFilters["product_metric"];
    default:
      return;
  }
};
const mapStateToProps = (state) => {
  return {
    selectedProducts: state.productGroupReducer.selectedProducts,
    columns: state.productGroupReducer.manualFilteredProdsCols,
    selectedFilters: getTabLevelSelectedFilters(
      state.productGroupReducer.selectedGroupType,
      state
    ),
    selectedManualFilterType:
      state.productGroupReducer.selectedManualFilterType,
    selectedGrps: state.productGroupReducer.manualselectedGroups,
    manualDefinitionFilter: state.productGroupReducer.manualGroupDfnFilters,
    deletedDefnProds: state.productGroupReducer.deleteProdsInDefn,
    newEditProds: state.productGroupReducer.newProdsInEdit,
    deleteEditProds: state.productGroupReducer.deletedProdsInEdit,
    selectedGroupType: state.productGroupReducer.selectedGroupType,
    newEditGrps: state.productGroupReducer.newGrpsInEdit,
    deleteEditGrps: state.productGroupReducer.deletedGrpsInEdit,
    styleLevelCols: state.productGroupReducer.styleLevelTableCols,
    selectedStyles: state.productGroupReducer.selectedStyles,
    deletedDefnStyles: state.productGroupReducer.deletedDefnStyles,
    selectedCluster: state.productGroupReducer.selectedCluster,
    resetFilterTable: state.productGroupReducer.resetTable,
  };
};

const mapActionsToProps = {
  fetchProdGrpFilteredProducts,
  setProdGroupFilteredProds,
  setSelectedProducts,
  ToggleLoader,
  fetchProductGroups,
  setGroupsCols,
  addSelectedGroups,
  addToExistingProds,
  setDeletedProdsInDefn,
  newRowsInEdit,
  deletedRowsInEdit,
  updateGrp,
  addSnack,
  setSelectedFilters,
  deletedGrpsInEdit,
  newGrpsInEdit,
  setStyleTableCols,
  setSelectedManualStyles,
  setTableState,
  fetchStyleLevelData,
  setStyleTableData,
  setDeletedStylesInDefn,
  fetchRequestInfo,
  setInitialMetricFilters,
  setSelectedObjectiveMetric,
  setMetricStartDate,
  setMetricEndDate,
  setSelectedObjectiveTimeFormat,
  resetFilterProds,
  setResetFilterTable,
  bulkAddStores,
  getTenantConfigApplicationLevel,
};

export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(FilteredProducts);
