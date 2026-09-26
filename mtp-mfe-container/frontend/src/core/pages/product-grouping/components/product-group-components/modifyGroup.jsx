import PageRouteTitles from "../PageRouteTitles";
import globalStyles from "core/Styles/globalStyles";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredProducts from "./productFilters";
import LoadingOverlay from "../../../../Utils/Loader/loader";
import { connect } from "react-redux";
import {
  getGroupInfo,
  ToggleLoader,
  setManualGrpFilterType,
  setSelectedProductGrpType,
  setSelectedGroupToEdit,
} from "core/pages/product-grouping/product-grouping-service";
import { useEffect, useState, useRef } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getRouteForPopUp } from "core/Utils/utils";
import { Prompt } from "impact-ui-v3";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { makeStyles } from "@mui/styles";
import SelectedGroupHeader from "core/pages/common/grouping/SelectedGroupHeader";
import { hasGroupNameChanged } from "core/pages/common/grouping/groupNameActions";

const useStyles = makeStyles(() => ({
  customPadding: {
    padding: "12px 24px 0px",
  },
  customSpacing: {
    "& .ia-styles.ia-tabContainer .ia-tabPanel": {
      padding: "0px !important"
    }
  }
}));

const ModifyProductGroup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [grpObject, setgrpObj] = useState({});
  const [pendingGroupName, setPendingGroupName] = useState("");
  const originalGroupNameRef = useRef("");
  const navigate = useNavigate();
  let location = useLocation();
  const params = useParams();
  const [confirmBox, showConfirmBox] = useState(false);
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
      action: () => {
        navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/view/${params.group_id}`);
      },
    },
    {
      id: "Modify Group",
      label: "Modify Group",
      action: () => null,
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        props.ToggleLoader(true);
        const grpId = location.pathname.split("/")[5];
        const res = await props.getGroupInfo(grpId);
        const grpObj = res.data.data[0];
        setgrpObj(grpObj);
        props.setSelectedProductGrpType("manual");
        props.setManualGrpFilterType({
          type: "product_hierarchy",
          isDisabled: true,
        });
        props.setSelectedGroupToEdit(grpObj.name);
        originalGroupNameRef.current = grpObj.name;
        setPendingGroupName(grpObj.name);
      } catch (error) {
        //Fetching Error
        props.addSnack({
          message: "Unable to fetch group information",
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchData();
  }, []);
  const manualProductsTableRef = useRef(null);
  const manualProductGroupsTableRef = useRef(null);
  const manualStyleLvlTableRef = useRef(null);
  const wrapperRef = useRef(null);
  const [route, setRoute] = useState({});
  const useOutsideclickHandler = (ref) => {
    useEffect(() => {
      function handleClickOutside(event) {
        const route = getRouteForPopUp(
          ref,
          routeOptions,
          event,
          "Modify Group"
        );
        if (route && wrapperRef.current.newProdsInEdit.length > 0) {
          setRoute(route);
          showConfirmBox(true);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [ref]);
  };
  useOutsideclickHandler(wrapperRef);
  useEffect(() => {
    if (props.newProdsInEdit.length > 0) {
      wrapperRef.current.newProdsInEdit = props.newProdsInEdit;
    } else {
      wrapperRef.current.newProdsInEdit = [];
    }
  }, [props.newProdsInEdit]);

  const handleGroupNameChange = (newName) => {
    setPendingGroupName(newName);
    props.setSelectedGroupToEdit(newName);
  };

  const isNameChanged = hasGroupNameChanged(
    pendingGroupName,
    originalGroupNameRef.current
  );

  const topLeftOptions = () => (
    <SelectedGroupHeader
      groupName={pendingGroupName || props.groupName}
      onNameChange={handleGroupNameChange}
    />
  );

  return (
    <>     
      <div className={classes.customPadding}>
        <div className={globalClasses.breadcrumbPadding}><PageRouteTitles options={routeOptions} /></div>
      </div>
      <div className={globalClasses.paddingHorizontal}>
        <div
          ref={wrapperRef}
          className={globalClasses.marginBottom}
        >
          <Prompt
            isOpen={confirmBox}
            title="Leave Page"
            primaryButtonLabel="Confirm"
            onPrimaryButtonClick={() => {
                if (route) {
                  route.action();
                }
                showConfirmBox(false);
            }}
            handleClose={() => showConfirmBox(false)}
            secondaryButtonLabel="Cancel"
            onSecondaryButtonClick={() => showConfirmBox(false)}
            variant="warning"
          >
            Are you sure you want to leave this page without saving changes?
          </Prompt>
        </div>
        <div>
          <GroupTypeFilters
            ref={{
              productLvlRef: manualProductsTableRef,
              styleLvlRef: manualStyleLvlTableRef,
              productGroupLvlRef: manualProductGroupsTableRef,
            }}
            grpObj={grpObject}
            isEdit={true}
            application_code={props?.history?.location?.state?.application_code}
          />
          <LoadingOverlay loader={props.isLoading} spinner>
            <FilteredProducts
              ref={{
                productLvlRef: manualProductsTableRef,
                styleLvlRef: manualStyleLvlTableRef,
                productGroupLvlRef: manualProductGroupsTableRef,
              }}
              isEdit={true}
              grpObj={grpObject}
              application_code={
                props?.history?.location?.state?.application_code
              }
              groupName={props.groupName}
              topLeftOptions={topLeftOptions()}
              pendingGroupName={pendingGroupName}
              isNameChanged={isNameChanged}
              onGroupNameSaved={() => {
                originalGroupNameRef.current = pendingGroupName;
              }}
            />
          </LoadingOverlay>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: state.productGroupReducer.isLoading,
    groupName: state.productGroupReducer.selectedGroupToEdit,
    newProdsInEdit: state.productGroupReducer.newProdsInEdit,
  };
};

const mapActionsToProps = {
  getGroupInfo,
  ToggleLoader,
  setManualGrpFilterType,
  setSelectedProductGrpType,
  addSnack,
  setSelectedGroupToEdit,
};
export default connect(mapStateToProps, mapActionsToProps)(ModifyProductGroup);
