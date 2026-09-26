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
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "../../../../actions/tableColumnActions";
import globalStyles from "core/Styles/globalStyles";
import {
  getGroupingConfig,
  getTenantConfigApplicationLevel,
} from "core/actions/tenantConfigActions";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  getUAMScreenName,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import { capitalize, isEmpty } from "lodash";
import {
  dynamicLabelsBasedOnTenant,
  fetchDynamicConfigFromTenantReducer,
} from "core/Utils/DynamicLabels";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { Button, Select, Tooltip, Tabs } from "impact-ui-v3";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH, IS_TAB_OVERRIDEN_WIDTH, IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

const useStyles = makeStyles((theme) => ({
  defnIcon: {
    marginLeft: 20,
    padding: 8,
    backgroundColor: "#68727E",
    "&:hover": {
      backgroundColor: "#3D5772",
    },
  },
  customMarginBottom: {
    marginBottom: '8px',
  },
  customMarginTop: {
    marginTop: '12px',
  },
  hierarchyFilterContainer: {
    '& .ia-styles.ia-btn.ia-btn-tertiary': {
      marginBottom: '0px !important',
    },
  },
}));

const ManualGroup = forwardRef((props, ref) => {
  const globalClasses = globalStyles();
    const classes = useStyles();
  const screenName = "product grouping";
  const [showStyleLevelData, setShowStyleLevelData] = useState(true);
  const [mannualGroupTypeFilters, setMannualGroupTypeFilters] = useState(
    MANUAL_GROUP_TYPE_FILTERS
  );
  const [restrictedFilters, setRestrictedFilters] = useState([]);
  const [restrictedFiltersLabel, setRestrictedFiltersLabel] = useState({});

  const onFilterDependency = useRef([]);

  const onFilterChange = (event, newValue) => {
    // Handle both ButtonGroup (event.target.value) and Tabs (newValue) formats
    const filterType = newValue || event?.target?.value;

    props.setManualGrpFilterType({
      type: filterType,
      isDisabled: false,
    });
    props.setManualGrpDefns([]);
    onFilter();
  };

  const makeLabelValueObjByUsingFilterData = (filterData, hierarchyData) => {
    try {
      let labelValueObj = {};
      filterData.forEach((filter) => {
        hierarchyData.forEach((data) => {
          if (filter?.column_name === data) {
            labelValueObj[filter?.column_name] = filter.label;
          }
        });
      });
      setRestrictedFiltersLabel(labelValueObj);
    } catch (error) {
      console.error("makeLabelValueObjByUsingFilterData error", error);
    }
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
      const productManualGroupApis = [
        fetchFilterFieldValues(
          screenName,
          props.savedFilterSelection,
          props.application_code === 1
            ? "Inventorysmart Store Eligibility Group"
            : getUAMScreenName(props.screenName),
          props.application_code === 1 ? { application_code: 1 } : []
        ),
        getGroupingConfig(1, "product_group_unique_attributes"),
      ];

      let productManualGroupResponses = await Promise.all(
        productManualGroupApis
      );

      let [data, restrictedFilterData] = productManualGroupResponses;

      let restrictedFilterHierarchyInfoArray =
        restrictedFilterData[0]?.attribute_value
          ?.product_group_unique_attributes;

      if (!isEmpty(restrictedFilterHierarchyInfoArray)) {
        makeLabelValueObjByUsingFilterData(
          data,
          restrictedFilterHierarchyInfoArray
        );
        setRestrictedFilters(restrictedFilterHierarchyInfoArray);
      }

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

      if (props.prodFilterCols?.length === 0) {
        const cols = await props.getColumnsAg("table_name=product_group_filter");
        props.setProdGrpFilteredCols(cols);
      }
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
      // Reset product hierarchy filters when switching to grouping definitions
      obj["product-grouping-manual-group-product-0"] = [];
      props.setSelectedFilters(obj);
      fetchDefinitionData();
    }
  }, [props.manualFilterType]);

  const checkForCrossFilters = (dependencyData) => {
    let restrictedFilterForCrossFilterSelection = [...restrictedFilters];
    let restrictedCrossFilterName = "";
    restrictedFilterForCrossFilterSelection.some((filterName) => {
      const filterData = dependencyData.filter(
        (filter) => filter.attribute_name === filterName
      );
      if (Array.isArray(filterData) && filterData.length > 1) {
        restrictedCrossFilterName = filterName;
        return true;
      }
      if (Array.isArray(filterData) && filterData.length === 1) {
        const filterVal = filterData[0]?.values;
        if (
          Array.isArray(filterVal) &&
          filterVal.length === 1 &&
          replaceSpecialCharacter(filterVal[0]) !==
          replaceSpecialCharacter(props?.grpObj?.[filterName])
        ) {
          restrictedCrossFilterName = filterName;
          return true;
        }
      }
    });
    return restrictedFiltersLabel?.[restrictedCrossFilterName];
  };

  const onFilter = async (dependencyData) => {
    let crossChannelRestrictedFilterName = checkForCrossFilters(dependencyData);
    if (
      props.isEdit &&
      // isChannelExist &&
      !isEmpty(crossChannelRestrictedFilterName)
    ) {
      props.addSnack({
        message: `Cross ${capitalize(
          crossChannelRestrictedFilterName
        )} is not supported`,
        options: {
          variant: "error",
        },
      });
      return;
    }
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
    onFilter(dependencyData);
  };

  const tabNames = mannualGroupTypeFilters.map((filter) => {
    return {
      label: filter.label.replace(
        "Product",
        dynamicLabelsBasedOnTenant("product", "core")
      ),
      value: filter.value,
    };
  });

  const tabPanels = mannualGroupTypeFilters.map((filter) => {
    if (filter.value === "product_hierarchy") {
      return (
        <div key={filter.value} className={classes.hierarchyFilterContainer} style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
          <CoreComponentScreen
            IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
            headerBreadCrumb={null}
            showPageRoute={false}
            showFilterDashboard={true}
            filterConfigKey={"productGroupingManualGroupFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            {...(props.application_code === 1
              ? { customDependencyValue: { application_code: 1 } }
              : {})}
            hideNoDataFound
          />
        </div>
      );
    } else {
      return (
        <GroupingDefnFilter
          key={filter.value}
          options={props.definitions}
          onChange={onChange}
          value={props.manualDefinitionFilter}
          onFilter={onDefinitionFilter}
          onReset={onReset}
          isEdit={props.isEdit}
        />
      );
    }
  });

  const marginBottomClass = props.manualFilterType !== "product_hierarchy" ? classes.customMarginBottom : "";
  const tabContainerClass = `${classes.customMarginTop} ${marginBottomClass || ""}`.trim();
  const tabSx = props.manualFilterType === "product_hierarchy" ? { width: IS_TAB_OVERRIDEN_WIDTH } : {};
  return (
    <>
      <div className={tabContainerClass} style={{ position: 'relative' }}>
        <Tabs
          value={props.manualFilterType}
          onChange={onFilterChange}
          orientation="horizontal"
          tabNames={tabNames}
          tabPanels={tabPanels}
          sx={tabSx}
        />
      </div>
    </>
  );
});

const GroupingDefnFilter = (props) => {
  const [currentOptions, setCurrentOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();

  const originalOptionsRef = useRef([]);



  useEffect(() => {
    // Only set current options if props.options exists and has elements
    if (props.options && props.options.length > 0) {
      const mappedOptions = props.options.map((option) => ({
        ...option,
        label: option.name,
        value: option.pgd_code,
      }));
      setCurrentOptions(mappedOptions);
      originalOptionsRef.current = mappedOptions;
    }

    // Only set selected options if props.value exists
    if (props.value) {
      setSelectedOptions(props.value);
    }
  }, [props.options, props.value]);

  function isFilterDisabled() {
    if (Array.isArray(props.value)) {
      return props.value.length === 0; // Disable if the array is empty
    } else if (typeof props.value === "object" && props.value !== null) {
      return Object.keys(props.value).length === 0; // Disable if the object is empty
    }
    return true; // Disable for any other case (e.g., null or undefined)
  }
  const onSearch = (searchEvent) => {
    const searchValue = searchEvent?.target?.value || '';

    if (searchValue.trim() === '') {
      setCurrentOptions(originalOptionsRef.current);
    } else {
      const filtered = originalOptionsRef.current.filter(
        (option) => option.label.toLowerCase().includes(searchValue.toLowerCase())
      );
      setCurrentOptions(filtered);
    }
  };

  return (
    <div>
      <div className={globalClasses.flexRow}>
        <div className={`${globalClasses.layoutAlignStart} ${globalClasses.flexBasisHalf}`}>
          <div className={globalClasses.extraButtonStyle}>
            <Select
              portalContainer={document.body}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              isWithSearch={true}
              isClearable={false}
              isMulti={false}
              setCurrentOptions={setCurrentOptions}
              currentOptions={currentOptions}
              selectedOptions={selectedOptions}
              initialOptions={currentOptions}
              setSelectedOptions={setSelectedOptions}
              handleChange={props.onChange}
              labelOrientation="left"
              onSearch={onSearch}
              withPortal={true}
              label="Select Definitions"
            />
          </div>

          <div className={globalClasses.extraButtonStyle}>
            <Tooltip
              orientation="top"
              title="View Definitions"
              variant="tertiary"
            >
              <Button
                id="productGrpingManualDfnsBtn"
                onClick={() => {
                  navigate(
                    props.isEdit
                      ? `${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/${location.pathname.split("/")[5]
                      }/group-definitions`
                      : `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group/group-definitions`
                  );
                }}
                className={classes.defnIcon}
                size="large"
                icon={<ListAltOutlinedIcon />}
                iconPlacement="left"
                variant="secondary"
              />
            </Tooltip>
          </div>
          <div className={globalClasses.extraButtonStyle}>
            <Button
              variant="primary"
              onClick={() => props.onFilter()}
              id="productGrpingDfnsFilterBtn"
              disabled={isFilterDisabled()}
            >
              Filter
            </Button>
          </div>
          <div className={globalClasses.extraButtonStyle}>
            <Button
              variant="secondary"
              onClick={props.onReset}
              id="productGrpingDfnsResetBtn"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
const mapStateToProps = (state) => {
  return {
    isDefnDisabled: state.productGroupReducer.isDefnBasedDisabled,
    prodFilterCols: state.productGroupReducer.manualFilteredProdsCols,
    definitions: state.productGroupReducer.productGrpDefinitions,
    manualDefinitionFilter: state.productGroupReducer.manualGroupDfnFilters,
    manualFilterType: state.productGroupReducer.selectedManualFilterType,
    tableState: state.tableReducer.tableState,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
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
  addSnack,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ManualGroup);
