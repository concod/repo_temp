import GroupType from "./groupType";
import PageRouteTitles from "../PageRouteTitles";
import { Container, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import FormLabel from "@mui/material/FormLabel";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredProducts from "./productFilters";
import LoadingOverlay from "../../../../Utils/Loader/loader";
import { connect } from "react-redux";
import {
  getGroupInfo,
  ToggleLoader,
  setManualGrpFilterType,
  setSelectedProductGrpType,
  setManualGrpDefns,
  setSelectedGroupToEdit,
} from "core/pages/product-grouping/product-grouping-service";
import { useEffect, useState, useRef } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getRouteForPopUp } from "core/Utils/utils";
import { Prompt } from "impact-ui";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";

const ModifyProductGroup = (props) => {
  const globalClasses = globalStyles();
  const [grpObject, setgrpObj] = useState({});
  const navigate = useNavigate();
  let location = useLocation();
  const params = useParams();
  const productGrpTypeOptions = [
    {
      label: "Manual",
      value: "manual",
    },
    // {
    //   label: "Objective based",
    //   value: "objective",
    // },
    // {
    //   label: "Custom",
    //   value: "custom",
    // },
  ];
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
      action: () => {
        navigate(`/product-grouping/view/${params.group_id}`);
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
        const grpId = location.pathname.split("/")[3];
        const res = await props.getGroupInfo(grpId);
        const grpObj = res.data.data[0];
        setgrpObj(grpObj);
        props.setSelectedProductGrpType("manual");
        props.setManualGrpFilterType({
          type: "product_hierarchy",
          isDisabled: true,
        });
        props.setSelectedGroupToEdit(grpObj.name);
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
    return () => {
      props.setManualGrpFilterType({
        type: "product_hierarchy",
        isDisabled: false,
      });
    };
  }, []);
  const manualProductsTableRef = useRef(null);
  const manualProductGroupsTableRef = useRef(null);
  const manualStyleLvlTableRef = useRef(null);
  return (
    <>
      <PageRouteTitles options={routeOptions} />
      <>
        <Container maxWidth={false} className={globalClasses.marginBottom}>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
          >
            <FormLabel component="legend">GroupType</FormLabel>
            <GroupType
              isEdit={true}
              grpObj={grpObject}
              type="product"
              options={productGrpTypeOptions}
            />
            <Typography variant="h4" className={globalClasses.marginHorizontal}>
              Selected Group :{" "}
              <Typography variant="body1" component="span">
                {replaceSpecialCharacter(props.groupName)}
              </Typography>
            </Typography>
          </div>
        </Container>
        <Container maxWidth={false}>
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
            />
          </LoadingOverlay>
        </Container>
      </>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: state.productGroupReducer.isLoading,
    groupName: state.productGroupReducer.selectedGroupToEdit,
  };
};

const mapActionsToProps = {
  getGroupInfo,
  ToggleLoader,
  setManualGrpFilterType,
  setSelectedProductGrpType,
  setManualGrpDefns,
  addSnack,
  setSelectedGroupToEdit,
};
export default connect(mapStateToProps, mapActionsToProps)(ModifyProductGroup);
