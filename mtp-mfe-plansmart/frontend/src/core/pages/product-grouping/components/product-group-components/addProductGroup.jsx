import { useRef, useState, useEffect } from "react";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Container, Typography } from "@mui/material";
import FormLabel from "@mui/material/FormLabel";
import GroupType from "./groupType";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import PageRouteTitles from "../PageRouteTitles";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredProducts from "./productFilters";
import { Prompt } from "impact-ui";
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
      <PageRouteTitles options={routeOptions} />
      <Container maxWidth={false} ref={wrapperRef}>
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
          subHeading="Are you sure you want to leave this page without saving changes?"
          infoList={[]}
          primaryButtonProps={{
            children: "Confirm",
            onClick: () => {
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
      </Container>
    </>
  );
};
export default AddProductGroup;
