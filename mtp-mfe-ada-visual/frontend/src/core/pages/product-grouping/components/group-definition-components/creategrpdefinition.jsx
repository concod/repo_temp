import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useState } from "react";
import { Prompt, useParams } from "react-router-dom";
import Definition from "./Definition";
import { getPromptStatus } from "./common-functions";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const CreateDefintion = (props) => {
  const [isEdited, setIsEdited] = useState(false);
  const params = useParams();
  let location = useLocation();
  const getPrevScr = () => {          
    let isCreateDefScreen = location.pathname.includes("create-definition");
    if (isCreateDefScreen && location.state.prevScr.includes("create-group")) {
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group/group-definitions`;
    } else if (isCreateDefScreen && location.state.prevScr.includes("definition-mapping")) {
      const group_id = params.group_id;
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definition-mapping/${group_id}`;
    } else if (isCreateDefScreen && location.state.prevScr.includes("modify")) {  
      const group_id = params.group_id;
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/${group_id}/group-definitions`;
    } else {
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definitions`;
    }
  };
  const prevScr = getPrevScr();
  const navigate = useNavigate();
  let routeOptions = [];
  if (prevScr.includes("create-group")) {
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
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group`);
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "View Definitions",
        action: () => {
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group/group-definitions`);
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "Create Definition",
        action: () => null,
      },
    ];
  } else if (prevScr.includes("group-definition-mapping")) {
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
        label: "Group Definition Mapping",
        action: () => {
          navigate(prevScr);
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "Create Definition",
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
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/view/${params.group_id}`);
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "Modify Group",
        action: () => {
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/${params.group_id}`);
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "View Definitions",
        action: () => {
          navigate(prevScr);
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "Create Definition",
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
        action: () => {
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definitions`);
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "Create Definition",
        action: () => null,
      },
      {
        id: "product_grouping_definitions_create_definition_rules",
        label: "Rules",
        action: () => null,
      },
    ];
  }

  return (
    <>
      <Prompt
        message={(location) => {
          const condition =
            !location.pathname.includes("create-definition") && isEdited;
          return getPromptStatus(condition, location);
        }}
      />
      <Definition
        id="productGrpngCrtDfnComp"
        prevScr={prevScr}
        type="create"
        routeOptions={routeOptions}
        setIsEdited={setIsEdited}
      />
    </>
  );
};

export default CreateDefintion;
