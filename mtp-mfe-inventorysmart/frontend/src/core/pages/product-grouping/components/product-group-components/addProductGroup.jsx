import { useRef, useState, useEffect } from "react";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Typography } from "@mui/material";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import PageRouteTitles from "../PageRouteTitles";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredProducts from "./productFilters";
import { Prompt } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const AddProductGroup = (props) => {
  const globalClasses = globalStyles();
  let location = useLocation();
  const selectedProductGroups = location?.state?.selectedProductGroups;
  const [confirmModal, showConfirmModal] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const prevScr = props.history?.location?.state?.prevScr;
  const productGrpTypeOptions = [
    {
      label: "Manual",
      value: "manual",
    },
  ];

  let routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: "product_grping_scr",
      label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
      action: () => {
        prevScr ? () => navigate(prevScr) : navigate("/product-grouping");
      },
    },
    {
      id: "add_product_to_group",
      label: "Add Products",
      action: () => null,
    },
  ];
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
      <div className={`${globalClasses.paddingAround}`}>
        <PageRouteTitles options={routeOptions} />
      </div>
      <div ref={wrapperRef} className={`${globalClasses.paddingAround}`}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.marginBottom}`}
        >
          <Typography variant="h4" id="productGrpingAddScreen">
            Selected Product Groups:
          </Typography>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.layoutAlignCenter} ${globalClasses.marginLeft1rem}`}
          >
            {selectedProductGroups?.map((item, index) => {
              return (
                <Typography variant="body1">
                  {replaceSpecialCharacter(item?.name)}
                  {selectedProductGroups.length - 1 !== index ? "," : ""}
                </Typography>
              );
            })}
          </div>
        </div>
        <Prompt
          isOpen={confirmModal}
          title="Leave Page"
          primaryButtonLabel="Confirm"
          onPrimaryButtonClick={() => {
            showConfirmModal(false);
          }}
          secondaryButtonLabel="Cancel"
          onSecondaryButtonClick={() => showConfirmModal(false)}
          variant="warning"
          handleClose={() => showConfirmModal(false)}
        >
          Are you sure you want to leave this page without saving changes?
        </Prompt>
        <GroupTypeFilters
          ref={{
            productLvlRef: manualProductsTableRef,
            styleLvlRef: manualStyleLvlTableRef,
            productGroupLvlRef: manualProductGroupsTableRef,
          }}
          screenName={props.screenName}
          application_code={props?.history?.location?.state?.application_code}
          isEdit={false}
        />
        <LoadingOverlay loader={props.isLoading} spinner>
          <FilteredProducts
            ref={{
              productLvlRef: manualProductsTableRef,
              styleLvlRef: manualStyleLvlTableRef,
              productGroupLvlRef: manualProductGroupsTableRef,
            }}
            selectedProductGroups={selectedProductGroups}
            isEdit={false}
            location={location.pathname}
            prevScr={prevScr}
          />
        </LoadingOverlay>
      </div>
    </>
  );
};
export default AddProductGroup;
