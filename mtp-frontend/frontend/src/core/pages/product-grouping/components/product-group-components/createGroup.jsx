import GroupType from "./groupType";
import PageRouteTitles from "../PageRouteTitles";
import { Container, Paper } from "@mui/material";
import FormLabel from "@mui/material/FormLabel";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredProducts from "./productFilters";
import LoadingOverlay from "../../../../Utils/Loader/loader";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useRef, useState, useEffect } from "react";
import { getRouteForPopUp } from "core/Utils/utils";
import { Prompt } from "impact-ui";
import { useNavigate } from "react-router-dom-v5-compat";

const CreateProductGroup = (props) => {
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const prevScr = props.history?.location?.state?.prevScr;
  const productGrpTypeOptions = [
    {
      label: "Manual",
      value: "manual",
    },
  ];
  const routeOptions = [
    {
      id: "product_grping_scr",
      label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
      action: () => {
        prevScr ? navigate(prevScr) : navigate("/product-grouping");
      },
    },
    {
      id: "create_new_product_grp",
      label: "Create New Group",
      action: () => null,
    },
  ];
  const manualProductsTableRef = useRef(null);
  const manualProductGroupsTableRef = useRef(null);
  const manualStyleLvlTableRef = useRef(null);
  return (
    <>
      <PageRouteTitles options={routeOptions} />
      <Container maxWidth={false}>
        <LoadingOverlay loader={props.isLoading} spinner>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
          >
            <FormLabel
              classes={{ root: globalClasses.marginRight }}
              component="legend"
            >
              GroupType
            </FormLabel>
            <GroupType
              ref={{
                productLvlRef: manualProductsTableRef,
                styleLvlRef: manualStyleLvlTableRef,
                productGroupLvlRef: manualProductGroupsTableRef,
              }}
              type="product"
              options={productGrpTypeOptions}
            />
          </div>
        </LoadingOverlay>
        <GroupTypeFilters
          ref={{
            productLvlRef: manualProductsTableRef,
            styleLvlRef: manualStyleLvlTableRef,
            productGroupLvlRef: manualProductGroupsTableRef,
          }}
          screenName={props.screenName}
          application_code={props?.history?.location?.state?.application_code}
        />
        <LoadingOverlay loader={props.isLoading} spinner>
          <FilteredProducts
            ref={{
              productLvlRef: manualProductsTableRef,
              styleLvlRef: manualStyleLvlTableRef,
              productGroupLvlRef: manualProductGroupsTableRef,
            }}
            prevScr={prevScr}
          />
        </LoadingOverlay>
      </Container>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: state.productGroupReducer.isLoading,
  };
};
export default connect(mapStateToProps, null)(CreateProductGroup);
