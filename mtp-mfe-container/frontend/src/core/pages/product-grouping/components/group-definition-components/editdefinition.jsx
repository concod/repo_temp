import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  ToggleLoader,
  fetchGroupDefinitionById,
} from "core/pages/product-grouping/product-grouping-service";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Prompt, useParams } from "react-router-dom";
import LoadingOverlay from "../../../../Utils/Loader/loader";
import Definition from "./Definition";
import { getPromptStatus } from "./common-functions";
import {
  useLocation,
  useNavigate,
} from "react-router-dom-v5-compat";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const EditDefinition = (props) => {
  const params = useParams();
  const navigate = useNavigate();
  let location = useLocation();
  const [definitionObj, setdefinitionObj] = useState({});
  const [isEdited, setIsEdited] = useState(false);
  const getPrevScr = () => {
    if (location.pathname.includes("create-group")) {
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group/group-definitions`;
    } else if (location.pathname.includes("modify")) {
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/${params.group_id}/group-definitions`;
    } else {
      return `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definitions`;
    }
  };
  const prevScr = getPrevScr();
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
          navigate(prevScr);
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
        id: "product_grouping_definitions_edit_definition",
        label: "Edit definition",
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
        action: () =>
          navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/${params.group_id}`),
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
        label: "Edit definition",
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
        id: "product_grouping_definitions_edit_definition",
        label: "Edit Definition",
        action: () => null,
      },
    ];
  }

  useEffect(() => {
    const fetchDefinitionData = async () => {
      try {
        props.ToggleLoader(true);
        const res = await props.fetchGroupDefinitionById(params.id);
        setdefinitionObj(res.data.data);
        props.ToggleLoader(false);
      } catch (error) {
        props.ToggleLoader(false);
        //error handling
      }
    };
    fetchDefinitionData();
  }, []);
  return (
    <>
      <Prompt
        message={(location) => {
          const condition =
            !location.pathname.includes("edit-definitions") && isEdited;
          return getPromptStatus(condition, location);
        }}
      />
      <LoadingOverlay loader={props.isLoading} spinner applyDefaultCenterStyle={true} minHeight={"calc(100vh - 64px)"}>
        <Definition
          type="edit"
          definition={definitionObj}
          routeOptions={routeOptions}
          prevScr={prevScr}
          setIsEdited={setIsEdited}
        />
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: state.productGroupReducer.isLoading,
  };
};
const mapActionsToProps = {
  fetchGroupDefinitionById,
  ToggleLoader,
};
export default connect(mapStateToProps, mapActionsToProps)(EditDefinition);
