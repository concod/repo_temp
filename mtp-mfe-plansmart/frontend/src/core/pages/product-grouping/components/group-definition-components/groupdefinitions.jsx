import PageRouteTitles from "../PageRouteTitles";
import { Container, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import makeStyles from "@mui/styles/makeStyles";
import "../groupTable.scss";
import ViewDefinitions from "./viewdefinitions";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";

const useStyles = makeStyles({
  root: {
    background: "white",
    margin: "25px 0px",
  },
  AddButton: {
    marginRight: 20,
  },
});
const GroupDefintions = (props) => {
  const navigate = useNavigate();
  let location = useLocation();
  const params = useParams();
  const classes = useStyles();
  const getPrevScr = () => {
    if (location.pathname.includes("create-group")) {
      return "/product-grouping/create-group";
    } else if (location.pathname.includes("modify")) {
      return `/product-grouping/modify/${params.group_id}`;
    } else {
      return "/product-grouping";
    }
  };
  const prevScr = getPrevScr();
  let routeOptions = [];
  if (prevScr === "/product-grouping/create-group") {
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
        id: "product_grouping_home_scr",
        label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
        action: () => {
          navigate("/product-grouping");
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
    <>
      <PageRouteTitles id="productGrpingBrdCrmbs" options={routeOptions} />
      <Container maxWidth={false}>
        <Container
          maxWidth={false}
          classes={{ root: classes.root }}
          disableGutters={true}
        >
          <DefinitionHeader
            isEdit={props.isEdit}
            groupId={params.group_id}
            prevScr={prevScr}
          />
        </Container>
      </Container>
    </>
  );
};
const DefinitionHeader = (props) => {
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
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  return (
    <>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
      >
        <Typography>Defintions</Typography>
        <Button
          color="primary"
          variant="contained"
          id="productGrpingCrtDfnBtn"
          onClick={() => {
            navigate(`${props.prevScr}/group-definitions/create-definition`);
          }}
        >
          Create New Definition
        </Button>
      </div>
      <ViewDefinitions id="productGrpingDfnsComp" prevScr={prevScr} />
      {(props.prevScr.includes("create-group") ||
        props.prevScr.includes("modify")) && (
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            navigate(props.prevScr);
          }}
          id="productGrpingBackCancelBtn"
        >
          Cancel
        </Button>
      )}
    </>
  );
};
export default GroupDefintions;
