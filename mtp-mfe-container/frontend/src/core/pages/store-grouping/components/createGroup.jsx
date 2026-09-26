import globalStyles from "core/Styles/globalStyles";
import { CLUSTER_DASHBOARD } from "core/Utils/constants/assortSmart-constants";
import { storeGrouping } from "config/routes";
import { useRef } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router-dom";
import LoadingOverlay from "../../../Utils/Loader/loader";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredStores from "./storeFilters";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  pageRoot: {
    "& [class*='filterBreadcrumbHeight']": {
      padding: "0px !important",
    },
  },
}));

const CreateStoreGroup = (props) => {
  const classes = useStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const prevScr = location.state?.prevScr;
  const globalClasses = globalStyles();
  const storeFiltersDependencyRef = useRef([]);
  const productFiltersDependencyRef = useRef([]);
  const storeTableRef = useRef(null);
  const storeGroupTableRef = useRef(null);
  const storeGrpTypeOptions = [
    {
      label: "Manual",
      value: "manual",
    },
    // {
    //   label: "Custom",
    //   value: "custom",
    // },
  ];
  let routeOptions = prevScr
    ? [
        {
          label: "Home",
          to: "/home",
        },
        {
          id: "assort_smart_cluster_dashboard",
          label: "Cluster Dashboard",
          action: () => {
            navigate(CLUSTER_DASHBOARD);
          },
        },
        {
          id: "assort_smart_cluster_input",
          label: "Cluster Input",
          action: () => {
            navigate(prevScr);
          },
          icon: null,
        },

        {
          id: "create_new_store_grp",
          label: "Create New Group",
          action: () => null,
        },
      ]
    : [
        {
          label: "Home",
          to: "/home",
        },
        {
          id: "store_grping_scr",
          label: `${dynamicLabelsBasedOnTenant("Store", "core")} Grouping`,
          action: () => {
            navigate(storeGrouping.home);
          },
        },
        {
          id: "create_new_store_grp",
          label: "Create New Group",
          action: () => null,
        },
      ];

  if (prevScr === "/inventory-smart/store-eligibility-grouping") {
    routeOptions = [
      {
        label: "Home",
        to: "/home",
      },
      {
        id: "store_grping_scr",
        label: `${dynamicLabelsBasedOnTenant("Store", "core")} Grouping`,
        action: () => {
          navigate(prevScr);
        },
      },
      {
        id: "create_new_store_grp",
        label: "Create New Group",
        action: () => null,
      },
    ];
  }

  const getPromptStatus = (loc) => {
    const message = `Are you sure you want to go to ${loc.pathname}?`;
    if (
      (loc.pathname === storeGrouping.home ||
        !loc.pathname.includes("store-grouping")) &&
      (props.selectedStores.length !== 0 || props.selectedGrps.length !== 0)
    ) {
      return message;
    }
    return true;
  };

  return (
    <div className={`${globalClasses.paddingAroundNew} ${classes.pageRoot}`}>
      <Prompt
        message={(location) => {
          return getPromptStatus(location);
        }}
      />
      <div>
        <GroupTypeFilters
          ref={{
            storeFiltersRef: storeFiltersDependencyRef,
            productFiltersRef: productFiltersDependencyRef,
            storeTableRef: storeTableRef,
            storeGroupTableRef: storeGroupTableRef,
          }}
          {...props}
          id="storeGrpingGrpTypeFiltersComp"
          options={routeOptions} 
        />
        <LoadingOverlay loader={props.isLoading} spinner>
          <FilteredStores
            ref={{
              storeFiltersRef: storeFiltersDependencyRef,
              productFiltersRef: productFiltersDependencyRef,
              storeTableRef: storeTableRef,
              storeGroupTableRef: storeGroupTableRef,
            }}
            prevScr={prevScr}
            id="storeGrpingFilteredStoresComp"
          />
        </LoadingOverlay>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading:
      state.storeGroupReducer.isLoading ||
      state.storeGroupReducer.customStoreGroupLoader,
    selectedStores: state.storeGroupReducer.selectedstores,
    selectedGrps: state.storeGroupReducer.manualselectedGroups,
  };
};
export default connect(mapStateToProps, null)(CreateStoreGroup);
