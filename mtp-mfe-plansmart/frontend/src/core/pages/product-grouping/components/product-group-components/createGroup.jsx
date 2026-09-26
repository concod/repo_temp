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
  const [confirmModal, showConfirmModal] = useState(false);
  const [route, setRoute] = useState({});
  const wrapperRef = useRef(null);
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
  const useOutsideclickHandler = (ref) => {
    useEffect(() => {
      function handleClickOutside(event) {
        const route = getRouteForPopUp(
          ref,
          routeOptions,
          event,
          "Create New Group"
        );
        if (route && wrapperRef.current.selectedProducts.length > 0) {
          setRoute(route);
          showConfirmModal(true);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);
  };
  useOutsideclickHandler(wrapperRef);
  const manualProductsTableRef = useRef(null);
  const manualProductGroupsTableRef = useRef(null);
  const manualStyleLvlTableRef = useRef(null);
  useEffect(() => {
    if (props?.selectedProducts?.length > 0) {
      wrapperRef.current.selectedProducts = props.selectedProducts;
    } else {
      wrapperRef.current.selectedProducts = [];
    }
  }, [props.selectedProducts]);
  return (
    <>
      <PageRouteTitles options={routeOptions} />
      <Container maxWidth={false} ref={wrapperRef}>
        <Prompt
          isOpen={confirmModal}
          title="Leave Page"
          subHeading="Are you sure you want to leave this page without saving changes?"
          infoList={[]}
          primaryButtonProps={{
            children: "Confirm",
            onClick: () => {
              if (route) {
                route.action();
              }
              showConfirmModal(false);
            },
          }}
          tertiaryButtonProps={{
            children: "Cancel",
            onClick: () => showConfirmModal(false),
          }}
          variant="warning"
        />
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
    selectedProducts: state.productGroupReducer.selectedProducts,
  };
};
export default connect(mapStateToProps, null)(CreateProductGroup);
