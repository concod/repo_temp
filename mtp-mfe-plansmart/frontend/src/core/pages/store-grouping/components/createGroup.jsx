import { Container } from "@mui/material";
import FormLabel from "@mui/material/FormLabel";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { DASHBOARD } from "core/Utils/constants/assortSmart-constants";
import { storeGrouping } from "config/routes";
import { useRef } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router-dom";
import LoadingOverlay from "../../../Utils/Loader/loader";
import PageRouteTitles from "./PageRouteTitles";
import GroupType from "./groupType";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredStores from "./storeFilters";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

const useStyles = makeStyles((theme) => ({
  groupTypeContainer: {
    margin: theme.typography.pxToRem(20),
    padding: 18,
  },
  grpTypeLabel: {
    marginRight: 20,
  },
  grpFiltersContainer: {
    padding: 18,
  },
}));

const CreateStoreGroup = (props) => {
  const navigate = useNavigate();
  let location = useLocation();
  const classes = useStyles();
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
          id: "assort_smart_dashboard",
          label: "AssortSmart",
          action: () => {
            navigate(DASHBOARD);
          },
        },
        {
          id: "assort_smart_intelligent_clustering",
          label: "Intelligent Clustering",
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
    <>
      <Prompt
        message={(location) => {
          return getPromptStatus(location);
        }}
      />
      <PageRouteTitles id="storeGrpingCrtBrdCrmbs" options={routeOptions} />
      <Container maxWidth={false}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
        >
          <FormLabel
            classes={{ root: classes.grpTypeLabel }}
            component="legend"
          >
            GroupType
          </FormLabel>
          <GroupType
            id="storeGrpingGrpTypeComp"
            type="store"
            options={storeGrpTypeOptions}
          />
        </div>
        <GroupTypeFilters
          ref={{
            storeFiltersRef: storeFiltersDependencyRef,
            productFiltersRef: productFiltersDependencyRef,
            storeTableRef: storeTableRef,
            storeGroupTableRef: storeGroupTableRef,
          }}
          {...props}
          id="storeGrpingGrpTypeFiltersComp"
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
      </Container>
    </>
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
