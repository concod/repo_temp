import PageRouteTitles from "../PageRouteTitles";
import "../groupTable.scss";
import ViewDefinitions from "./viewdefinitions";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";
import { Button } from "impact-ui-v3";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { Grid } from "@mui/material";

const GroupDefintions = (props) => {
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const params = useParams();
  const getPrevScr = () => {
    if (location.pathname.includes("create-group")) {
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group`;
    } else if (location.pathname.includes("modify")) {
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/${params.group_id}`;
    } else {
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping`;
    }
  };
  const prevScr = getPrevScr();
  let routeOptions = [];
  if (prevScr === `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group`) {
    routeOptions = [
      {
        label: "Home",
        to: "/home",
      },
      {
        id: "product_grouping_home_scr",
        label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
        action: () => {
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping`);
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "Create New Group",
        action: () => {
          navigate(prevScr);
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "View Definitions",
        action: () => null,
      },
    ];
  } else if (prevScr.includes("modify")) {
    routeOptions = [
      {
        label: "Home",
        to: "/home",
      },
      {
        id: "product_grouping_home_scr",
        label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
        action: () => {
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping`);
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "View Group",
        action: () => {
          navigate(prevScr.replace("modify", "view"));
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "Modify Group",
        action: () => {
          navigate(prevScr);
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "View Definitions",
        action: () => null,
      },
    ];
  } else {
    routeOptions = [
      {
        label: "Home",
        to: "/home",
      },
      {
        id: "product_grouping_home_scr",
        label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
        action: () => {
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping`);
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "Grouping Definitions",
        action: () => null,
      },
    ];
  }
  return (
    <div className={globalClasses.paddingAroundNew}>
      <div className={globalClasses.breadcrumbPadding}>
      <PageRouteTitles id="productGrpingBrdCrmbs" options={routeOptions} />
      </div>
      <DefinitionHeader
            isEdit={props.isEdit}
            groupId={params.group_id}
            prevScr={prevScr}
          />
    </div>
  );
};
const DefinitionHeader = (props) => {
  const location = useLocation();
  const getPrevScr = () => {
    if (props.prevScr.includes("create-group")) {
      return "create-group/group-definitions";
    } else if (props.prevScr.includes("modify")) {
      return `modify/${props.groupId}/group-definitions`;
    } else {
      return "group-definitions";
    }
  };
  const prevScr = `/product-grouping/${getPrevScr()}`;
  const navigate = useNavigate();
  const getTopRightOptions = () => {
    let options = []
    options.push(<Button
      variant="primary"
      id="productGrpingCrtDfnBtn"
      onClick={() => {
        navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definitions/create-definition`, {
          state: {
            prevScr: location.pathname,
          },
        });
      }}
      size="large"
    >
      Create New Definition
    </Button>)

    return options
  }
  const globalClasses = globalStyles();
  return (
    <>
      <div style={{marginTop: "12px"}}>
        <ViewDefinitions id="productGrpingDfnsComp" prevScr={prevScr} title="Definitions" topRightOptions={getTopRightOptions}/>
      </div>
      {(props.prevScr.includes("create-group") ||
        props.prevScr.includes("modify")) && (
        <Grid gap={2} className={`${globalClasses.stickyFooter}`}>
          <Button
            variant="tertiary"
            onClick={() => {
              navigate(props.prevScr);
            }}
            id="productGrpingBackCancelBtn"
          >
            Go Back
          </Button>
        </Grid>
      )}
    </>
  );
};
export default GroupDefintions;
