import { useRef } from "react";
import LoadingOverlay from "../../../Utils/Loader/loader";
import { Container, Typography } from "@mui/material";
import PageRouteTitles from "./PageRouteTitles";
import GroupTypeFilters from "./grpTypeFilters";
import FilteredStores from "./storeFilters";
import globalStyles from "core/Styles/globalStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

const AddStoreGroup = (props) => {
  const globalClasses = globalStyles();
  let location = useLocation();
  const selectedStoreGroups = location?.state?.selectedStoreGroups;
  const navigate = useNavigate();
  const storeFiltersDependencyRef = useRef([]);
  const productFiltersDependencyRef = useRef([]);
  const storeTableRef = useRef(null);
  const storeGroupTableRef = useRef(null);

  let routeOptions = [
    {
      id: "store_grping_scr",
      label: `${dynamicLabelsBasedOnTenant("Store", "core")} Grouping`,
      action: () => navigate(-1),
    },
    {
      id: "add_store_to_group",
      label: "Add Stores",
      action: () => null,
    },
  ];

  return (
    <>
      <PageRouteTitles id="storeGrpingCrtBrdCrmbs" options={routeOptions} />
      <Container maxWidth={false}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.marginBottom}`}
        >
          <Typography variant="h5" id="storeGrpingCrtEditTableTitle">
            Selected Stores Groups:
          </Typography>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.layoutAlignCenter} ${globalClasses.marginLeft1rem}`}
          >
            {selectedStoreGroups?.map((item, index) => {
              return (
                <Typography variant="body1">
                  {replaceSpecialCharacter(item?.name)}
                  {selectedStoreGroups.length - 1 != index ? "," : ""}
                </Typography>
              );
            })}
          </div>
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
            prevScr={location?.state?.prevScr}
            selectedStoreGroups={selectedStoreGroups}
            id="storeGrpingFilteredStoresComp"
            location={location.pathname}
          />
        </LoadingOverlay>
      </Container>
    </>
  );
};
export default AddStoreGroup;
