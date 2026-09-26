import {
  RadioGroup,
  Radio,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Typography,
} from "@mui/material";
import { MANUAL_GROUP_TYPE_FILTERS } from "../../../../../config/constants/index";
import makeStyles from "@mui/styles/makeStyles";
import { forwardRef, useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { setSelectedFilters } from "../../../../actions/filterAction";
import {
  setProdGroupFilteredProds,
  ToggleLoader,
  setProdGrpFilteredCols,
  setManualGrpFilterType,
  setManualGrpDefns,
  resetFilterProds,
  setDefinitions,
  getDefinitions,
} from "core/pages/product-grouping/product-grouping-service";
import ReactSelect from "../../../../Utils/select";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import Button from "@mui/material/Button";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "../../../../actions/tableColumnActions";
import globalStyles from "core/Styles/globalStyles";
import { Grid } from "@mui/material";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  getUAMScreenName,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { isEmpty } from "lodash";
import {
  dynamicLabelsBasedOnTenant,
  fetchDynamicConfigFromTenantReducer,
} from "core/Utils/DynamicLabels";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles((theme) => ({
  filterLabel: {
    marginRight: 15,
  },
  defnIcon: {
    marginLeft: 20,
    padding: 8,
    backgroundColor: "#68727E",
    "&:hover": {
      backgroundColor: "#3D5772",
    },
  },
  listIcon: {
    backgroundColor: "white",
    fontSize: 22,
    color: "#68727E",
    "&:hover": {
      color: "#3D5772",
    },
  },
  selectDefinitions: {
    color: theme.palette.text.primary
  }
}));

const ManualGroup = forwardRef((props, ref) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const screenName = "product grouping";
  const [showStyleLevelData, setShowStyleLevelData] = useState(true);
  const [mannualGroupTypeFilters, setMannualGroupTypeFilters] = useState(
    MANUAL_GROUP_TYPE_FILTERS
  );

  const onFilterDependency = useRef([]);

  const onFilterChange = (event) => {
    props.setManualGrpFilterType({
      type: event.target.value,
      isDisabled: false,
    });
    props.setManualGrpDefns([]);
    onFilter();
  };

  useEffect(() => {
    const fetchStyleInfo = async () => {
      let showStyleLevelDataResp = await props.getTenantConfigApplicationLevel(
        3,
        {
          attribute_name: "core_show_style_level_info",
        }
      );

      if (showStyleLevelDataResp?.data?.data?.[0]?.["attribute_value"]) {
        setShowStyleLevelData(
          showStyleLevelDataResp?.data?.data?.[0]?.["attribute_value"].value
        );
      }
    };
    fetchStyleInfo();
  }, []);

  useEffect(() => {
    //Initialize the hidden filters
    let hiddenFilters = [];
    //fetch the core config for product grouping screen
    //In the db we need to add below key to core screen configuration for whichever client we need to
    //disable grouping definitions
    // productGrouping : {hiddenModules : ["grouping_definitions"]}
    //
    const productGroupConfig = fetchDynamicConfigFromTenantReducer(
      "core",
      "productGrouping"
    );
    //Assign the hiddenModules to hidden filters
    hiddenFilters = productGroupConfig?.hiddenModules || [];
    if (sessionStorage.getItem("currentApp") === "inventorysmart") {
      //If the flow is through inventory smart, we declare it to inventory smart config
      //Else it will be core screens config
      hiddenFilters =
        props.inventorysmartScreenConfig?.inventorysmart_productgroup
          ?.mannualGroupByHiddenFilter ||
        hiddenFilters ||
        [];
    }
    let finalfilter = MANUAL_GROUP_TYPE_FILTERS.filter(
      (item) => hiddenFilters.indexOf(item.value) === -1
    );
    setMannualGroupTypeFilters(finalfilter);
    return () => {
      props.resetFilterProds();
      let obj = {};
      obj["product_hierarchy"] = [];
      props.setSelectedFilters(obj);
    };
  }, []);

  useEffect(() => {
    props.ToggleLoader(true);
    props.resetFilterProds(true);
    const fetchHierarchyData = async () => {
      props.ToggleLoader(true);

      let data = await fetchFilterFieldValues(
        screenName,
        props.savedFilterSelection,
        props.application_code === 1
          ? "Inventorysmart Store Eligibility Group"
          : getUAMScreenName(props.screenName),
        props.application_code === 1 ? { application_code: 1 } : []
      );
      if (isEmpty(props.filterDashboardConfiguration)) {
        const filterConfigData = [
          {
            filterSectionHeader: "Merchant Category",
            filterDashboardData: data,
            isCrossDimensionFilter: false,
            screen_name:
              props.application_code === 1
                ? "Inventorysmart Store Eligibility Group"
                : getUAMScreenName(props.screenName),
          },
        ];
        if (props.application_code === 1) {
          filterConfigData[0]["saved_filter_screen_name"] =
            "Inventorysmart Product Eligibility Group";
        }
        const filterConfig = formattedFilterConfiguration(
          "productGroupingManualGroupFilterConfiguration",
          filterConfigData,
          "Product Grouping Manual Group"
        );
        props.setFilterConfiguration(filterConfig);
      }

      const cols = await props.getColumnsAg("table_name=product_group_filter");
      props.setProdGrpFilteredCols(cols);
      props.ToggleLoader(false);
    };
    const fetchDefinitionData = async () => {
      const body = {
        search: [],
        sort: [],
        range: [],
        filters: [],
        include_mapped_definition: false,
      };
      const res = await props.getDefinitions(body, 100);
      props.setDefinitions({
        definitions: res.data.data,
        count: res.data.total,
      });
      props.ToggleLoader(false);
    };
    if (props.manualFilterType === "product_hierarchy") {
      fetchHierarchyData();
    } else {
      let obj = {};
      obj["product_hierarchy"] = [];
      props.setSelectedFilters(obj);
      fetchDefinitionData();
    }
  }, [props.manualFilterType]);

  const onFilter = async (data) => {
    props.resetTableRecentChanges();
    ref.productLvlRef.current?.api?.setFilterModel(null);
    ref.productGroupLvlRef.current?.api?.setFilterModel(null);
    ref.productLvlRef?.current?.api?.refreshServerSideStore({ purge: true });
    ref.productGroupLvlRef?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    if (showStyleLevelData) {
      ref.styleLvlRef.current?.api?.setFilterModel(null);
      ref.styleLvlRef?.current?.api?.refreshServerSideStore({ purge: true });
    }
    props.ToggleLoader(false);
  };

  const onChange = (options) => {
    props.setManualGrpDefns(options);
  };

  const onDefinitionFilter = async () => {
    props.ToggleLoader(true);
    ref.productLvlRef?.current?.api?.refreshServerSideStore({ purge: false });
    if (showStyleLevelData) {
      ref.styleLvlRef?.current?.api?.refreshServerSideStore({ purge: false });
    }
    props.ToggleLoader(false);
  };

  const onReset = async () => {
    onChange([]);
    let obj = {};
    obj["product_hierarchy"] = [];
    props.setSelectedFilters(obj);
    props.setProdGroupFilteredProds({ data: [], count: 0 });
    ref.productLvlRef?.current?.api?.refreshServerSideStore({ purge: true });
    ref.productGroupLvlRef?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    if (showStyleLevelData) {
      ref.styleLvlRef?.current?.api?.refreshServerSideStore({ purge: true });
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    onFilter();
  };
  return (
    <>
      <div
        className={`${globalClasses.verticalAlignCenter} ${globalClasses.flexRow}`}
      >
        <FormLabel classes={{ root: classes.filterLabel }} component="legend">
          {`Filter ${captializeStringIfCamelCase(
            dynamicLabelsBasedOnTenant("product", "core")
          )}s by`}
        </FormLabel>
        <FormControl component="fieldset">
          <RadioGroup
            id="productGrpingManualFilterRadioGrp"
            value={props.manualFilterType}
            aria-label="gender"
            name="customized-radios"
            onChange={onFilterChange}
            row
          >
            {mannualGroupTypeFilters.map((filter) => {
              return (
                <>
                  <FormControlLabel
                    value={filter.value}
                    id={`productGrpingManualFilterLabel${filter.value}`}
                    control={
                      <Radio
                        id={`productGrpingManualFilterRadio${filter.value}`}
                        color="primary"
                        disabled={
                          filter.value === "grouping_definitions" &&
                          (props.isDefnDisabled || props.isEdit)
                        }
                      />
                    }
                    label={filter.label.replace(
                      "Product",
                      dynamicLabelsBasedOnTenant("product", "core")
                    )}
                  />
                </>
              );
            })}
          </RadioGroup>
        </FormControl>
      </div>
      {props.manualFilterType === "product_hierarchy" ? (
        <CoreComponentScreen
          showFilterDashboard={true}
          filterConfigKey={"productGroupingManualGroupFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          {...(props.application_code === 1
            ? { customDependencyValue: { application_code: 1 } }
            : {})}
          hideNoDataFound
        />
      ) : (
        <GroupingDefnFilter
          options={props.definitions}
          onChange={onChange}
          value={props.manualDefinitionFilter}
          onFilter={onDefinitionFilter}
          onReset={onReset}
          isEdit={props.isEdit}
        />
      )}
    </>
  );
});

const GroupingDefnFilter = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();

  const getOptions = () => {
    return props.options.map((option) => {
      return {
        ...option,
        label: option.name,
        value: option.pgd_code,
      };
    });
  };

  return (
    <div className={globalClasses.marginVertical2rem}>
      <Grid direction="row">
        <Grid item xs={12}>
          <Typography
            variant="body1"
            component="h4"
            className={classes.selectDefinitions}
          >
            Select Definitions
          </Typography>
        </Grid>
      </Grid>
      <Grid
        direction="row"
        justifyContent="flex-start"
        alignItems="center"
        container
        className={globalClasses.marginVertical}
      >
        <Grid item xs={3}>
          <ReactSelect
            id="productGrpingGrpDefnDropDwn"
            isMulti={false}
            isClearable={false}
            isSearchable={true}
            options={getOptions()}
            value={props.value}
            onChange={props.onChange}
            menuPortalTarget={document.body}
          />
        </Grid>
        <Grid item xs={2}>
          {" "}
          <IconButton
            id="productGrpingManualDfnsBtn"
            onClick={() => {
              navigate(
                props.isEdit
                  ? `/product-grouping/modify/${
                      location.pathname.split("/")[3]
                    }/group-definitions`
                  : "/product-grouping/create-group/group-definitions"
              );
            }}
            classes={{ root: classes.defnIcon }}
            size="large"
          >
            <ListAltOutlinedIcon classes={{ root: classes.listIcon }} />
          </IconButton>
        </Grid>
        <Grid item xs={2}>
          {" "}
          <div
            className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.centerAlign} ${globalClasses.marginTop}`}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => props.onFilter()}
              id="productGrpingDfnsFilterBtn"
            >
              Filter
            </Button>
            <Button
              variant="outlined"
              onClick={props.onReset}
              id="productGrpingDfnsResetBtn"
            >
              Reset
            </Button>
          </div>
        </Grid>
      </Grid>
    </div>
  );
};
const mapStateToProps = (state) => {
  return {
    isDefnDisabled: state.productGroupReducer.isDefnBasedDisabled,
    definitions: state.productGroupReducer.productGrpDefinitions,
    manualDefinitionFilter: state.productGroupReducer.manualGroupDfnFilters,
    manualFilterType: state.productGroupReducer.selectedManualFilterType,
    tableState: state.tableReducer.tableState,
    inventorysmartScreenConfig:
      state.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "productGroupingManualGroupFilterConfiguration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};
const mapActionsToProps = {
  setProdGroupFilteredProds,
  ToggleLoader,
  setProdGrpFilteredCols,
  setManualGrpFilterType,
  setManualGrpDefns,
  setSelectedFilters,
  resetFilterProds,
  getTenantConfigApplicationLevel,
  getColumnsAg,
  getDefinitions,
  setDefinitions,
  setFilterConfiguration,
  resetTableRecentChanges,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ManualGroup);
