import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useState } from "react";
import { Prompt, useParams } from "react-router-dom";
import Definition from "./Definition";
import { getPromptStatus } from "./common-functions";
import {
  useLocation,
  useNavigate,
} from "react-router-dom-v5-compat";

const CreateDefintion = (props) => {
  const [isEdited, setIsEdited] = useState(false);
  const params = useParams();
  let location = useLocation();
  const getPrevScr = () => {
    if (location.pathname.includes("create-group")) {
      return "/product-grouping/create-group/group-definitions";
    } else if (location.pathname.includes("definition-mapping")) {
      const group_id = params.group_id;
      return `/product-grouping/group-definition-mapping/${group_id}`;
    } else if (location.pathname.includes("modify")) {
      const group_id = params.group_id;
      return `/product-grouping/modify/${group_id}/group-definitions`;
    } else {
      return "/product-grouping/group-definitions";
    }
  };
  const prevScr = getPrevScr();
  const navigate = useNavigate();
  let routeOptions = [];
  if (prevScr.includes("create-group")) {
    routeOptions = [
      {
        id: "product_grouping_home_scr",
        label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
        action: () => {
          navigate("/product-grouping");
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "Create New Group",
        action: () => {
          navigate("/product-grouping/create-group");
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "View Definitions",
        action: () => {
          navigate("/product-grouping/create-group/group-definitions");
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "create definition",
        action: () => null,
      },
    ];
  } else if (prevScr.includes("group-definition-mapping")) {
    routeOptions = [
      {
        id: "product_grouping_home_scr",
        label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
        action: () => {
          navigate("/product-grouping");
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
        label: "create definition",
        action: () => null,
      },
    ];
  } else if (prevScr.includes("modify")) {
    routeOptions = [
      {
        id: "product_grouping_home_scr",
        label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
        action: () => {
          navigate("/product-grouping");
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "View Group",
        action: () => {
          navigate(`/product-grouping/view/${params.group_id}`);
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "Modify Group",
        action: () => {
          navigate(`/product-grouping/modify/${params.group_id}`);
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
        label: "create definition",
        action: () => null,
      },
    ];
  } else {
    routeOptions = [
      {
        id: "product_grouping_home_scr",
        label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
        action: () => {
          navigate("/product-grouping");
        },
      },
      {
        id: "product_grouping_definitions_scr",
        label: "Grouping Definitions",
        action: () => {
          navigate("/product-grouping/group-definitions");
        },
      },
      {
        id: "product_grouping_definitions_create_definition",
        label: "create definition",
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
