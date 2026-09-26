import { connect } from "react-redux";
import ViewStyles from "./components/viewStyles";
import React, { useEffect, useRef } from "react";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchUnitDefns,
  ToggleLoader,
  setStyleTableCols,
  setUnitDefns,
  setShowStylesTable,
  setUnitDefnFilterValues,
} from "./product-unit-definition-service";
import { getColumnsAg } from "../../actions/tableColumnActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import { isEmpty } from "lodash";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useLocation } from "react-router-dom-v5-compat";

const UnitDefinition = (props) => {
  const onFilterDependency = useRef(null);
  const stylesDashboardTableRef = useRef(null);
  let location = useLocation();

  useEffect(() => {
    //Load the API for table
    const fetchData = async () => {
      try {
        props.ToggleLoader(true);
        const data = await fetchFilterFieldValues(
          "product unit definition",
          props.savedFilterSelection,
          props.screenName
        );

        if (isEmpty(props.filterDashboardConfiguration)) {
          const filterConfigData = [
            {
              filterDashboardData: data,
              isCrossDimensionFilter: false,
              screen_name: props.screenName
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "productUnitDefFilterConfiguration",
            filterConfigData,
            "Product Unit Definition"
          );
          props.setFilterConfiguration(filterConfig);
        }

        props.setUnitDefnFilterValues(data);
        if (props.columns.length === 0) {
          const rescols = await props.getColumnsAg(
            "table_name=product_unit_definition"
          );
          props.setStyleTableCols(rescols);
        }
        props.ToggleLoader(false);
      } catch (error) {
        //Error Handling
        props.ToggleLoader(false);
      }
    };
    fetchData();
    return () => {
      props.setShowStylesTable(false);
    };
  }, []);

  const onClickFilter = () => {
    if (stylesDashboardTableRef.current) {
      stylesDashboardTableRef.current.api?.refreshServerSideStore({
        purge: true,
      });
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    onClickFilter();
  };

  return (
    <CoreComponentScreen
      pageLabel={`${captializeStringIfCamelCase(
        dynamicLabelsBasedOnTenant("product", "core")
      )} Unit Definition`}
      showPageRoute={true}
      showPageHeader={true}
      location={location}
      // Filter dashboard props
      showFilterDashboard={true}
      filterConfigKey={"productUnitDefFilterConfiguration"}
      onApplyFilter={onFilterDashboardClick}
      contained={true}
    >
      <ViewStyles
        ref={{
          stylesDashboardTableRef: stylesDashboardTableRef,
          filterDependencyRef: onFilterDependency,
        }}
        id="productUnitDefnStylesComp"
      />
    </CoreComponentScreen>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: state.UnitDefnReducer.isLoading,
    filters: state.UnitDefnReducer.filtersData,
    columns: state.UnitDefnReducer.stylesTableCols,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "productUnitDefFilterConfiguration"
      ],
    planningLevelHierarchy:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .planningLevelHierarchy,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};

const mapActionsToProps = {
  fetchUnitDefns,
  setUnitDefns,
  ToggleLoader,
  setStyleTableCols,
  setShowStylesTable,
  setUnitDefnFilterValues,
  getColumnsAg,
  setFilterConfiguration,
};

export default connect(mapStateToProps, mapActionsToProps)(UnitDefinition);
