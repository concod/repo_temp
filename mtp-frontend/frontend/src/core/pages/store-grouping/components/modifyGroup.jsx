import { Container, Typography } from "@mui/material";
import FormLabel from "@mui/material/FormLabel";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { storeGrouping } from "config/routes";
import { isEmpty } from "lodash";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt, useParams } from "react-router-dom";
import LoadingOverlay from "../../../Utils/Loader/loader";
import {
  ToggleLoader,
  getGroupInfo,
  setSelectedGroupToEdit,
  setSelectedStoreGrpType,
} from "../services-store-grouping/custom-store-group-service";
import PageRouteTitles from "./PageRouteTitles";
import GroupType from "./groupType";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredProducts from "./storeFilters";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles((theme) => ({
  groupTypeContainer: {
    backgroundColor: "white",
    padding: 18,
    margin: theme.typography.pxToRem(20),
  },
  grpTypeLabel: {
    marginRight: 20,
  },
  grpFiltersContainer: {
    backgroundColor: "white",
    padding: 18,
    margin: theme.typography.pxToRem(20),
  },
}));

const ModifyStoreGroup = (props) => {
  const navigate = useNavigate();
  let location = useLocation();
  const params = useParams();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [grpObject, setgrpObj] = useState({});
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
  const prevScr = location.state?.prevScr;
  const routeOptions = [
    {
      id: "store_grping_scr",
      label: "Store Grouping",
      action: () => {
        navigate(prevScr ? prevScr : storeGrouping.home);
      },
    },
    {
      id: "view Group",
      label: "View Group",
      action: () => {
        navigate(
          prevScr
            ? `${prevScr}/view/${params.group_id}`
            : `/store-grouping/view/${params.group_id}`,
          {
            state: {
              prevScr: prevScr,
            },
          }
        );
      },
    },
    {
      id: "Modify Group",
      label: "Modify Group",
      action: () => null,
    },
  ];

  const storeFiltersDependencyRef = useRef([]);
  const productFiltersDependencyRef = useRef([]);
  const storeTableRef = useRef(null);
  const storeGroupTableRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        props.ToggleLoader(true);
        const urlSplitArr = location.pathname.split("/");
        const grpId = urlSplitArr.pop();
        const res = await props.getGroupInfo(grpId);
        const grpObj = res.data.data[0];
        setgrpObj(grpObj);
        props.setSelectedGroupToEdit(grpObj.name);
      } catch (error) {
        //Fetching Error
      }
    };
    fetchData();
  }, []);

  const getPromptStatus = (loc) => {
    const message = `Are you sure you want to go to ${loc.pathname}?`;
    if (
      (loc.pathname === storeGrouping.home ||
        loc.pathname.includes(storeGrouping.viewGroup) ||
        !loc.pathname.includes("store-grouping")) &&
      (props.deleteEditStores.length !== 0 ||
        props.newEditStores.length !== 0 ||
        props.newGrpsInEdit.length !== 0 ||
        props.deletedGrpsInEdit.length !== 0)
    ) {
      /**
       * The above condition is satisfied when there are selections made in stores table (i.e Either we add
       * new stores while updating or delete existing stores) and Include Store Groups table (i.e Either we remove existing group or add new group)
       * We are checking all the lengths of variables
       *
       * This Happens when we navigate either to dashboard of store grouping or viewing a group route or any other route
       */
      return message;
    }
    //Returns true if the above condition are false. User can move to new location/route
    return true;
  };

  return (
    <>
      <Prompt
        message={(location) => {
          return getPromptStatus(location);
        }}
      />
      <PageRouteTitles options={routeOptions} />
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
          <GroupType isEdit={true} type="store" options={storeGrpTypeOptions} />
          <Typography variant="h4" className={globalClasses.marginHorizontal}>
            Selected Group :{" "}
            <Typography variant="body1" component="span">
              {replaceSpecialCharacter(props.groupName)}
            </Typography>
          </Typography>
        </div>
        {!isEmpty(grpObject) && (
          <GroupTypeFilters
            grpObj={grpObject}
            isEdit={true}
            {...props}
            ref={{
              storeFiltersRef: storeFiltersDependencyRef,
              productFiltersRef: productFiltersDependencyRef,
              storeTableRef: storeTableRef,
              storeGroupTableRef: storeGroupTableRef,
            }}
          />
        )}
        <LoadingOverlay loader={props.isLoading} spinner>
          {!isEmpty(grpObject) && (
            <FilteredProducts
              prevScr={prevScr}
              isEdit={true}
              grpObj={grpObject}
              ref={{
                storeFiltersRef: storeFiltersDependencyRef,
                productFiltersRef: productFiltersDependencyRef,
                storeTableRef: storeTableRef,
                storeGroupTableRef: storeGroupTableRef,
              }}
            />
          )}
        </LoadingOverlay>
      </Container>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: state.storeGroupReducer.isLoading,
    newEditStores: state.storeGroupReducer.newStoresInEdit,
    deleteEditStores: state.storeGroupReducer.deletedStoresInEdit,
    newGrpsInEdit: state.storeGroupReducer.newGrpsInEdit,
    deletedGrpsInEdit: state.storeGroupReducer.deletedGrpsInEdit,
    groupName: state.storeGroupReducer.selectedGroupToEdit,
  };
};

const mapActionsToProps = {
  getGroupInfo,
  ToggleLoader,
  setSelectedStoreGrpType,
  setSelectedGroupToEdit,
};
export default connect(mapStateToProps, mapActionsToProps)(ModifyStoreGroup);
