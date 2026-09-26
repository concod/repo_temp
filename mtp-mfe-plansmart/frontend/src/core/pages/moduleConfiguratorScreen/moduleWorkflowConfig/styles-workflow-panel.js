import { Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import styled from "styled-components";

export const useStyles = makeStyles(() => ({
  workflowContainer: {
    display: "grid",
    gridTemplateColumns: `${pxToRem(386)} auto`,
    gap: pxToRem(15),
  },
  workflowInnerContainer: {
    width: "100%",
    borderRadius: pxToRem(4),
    border: `${pxToRem(1)} solid ${colours.alto}`,
    minHeight: "100vh",
  },
  workflowActionContainer: {
    marginTop: "auto",
  },
  containerHeader: {
    padding: `${pxToRem(15)} ${pxToRem(16)} ${pxToRem(18)} ${pxToRem(20)}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `${pxToRem(1)} solid ${colours.alto}`,
  },
  rightContainerHeader: {
    padding: `${pxToRem(16)} ${pxToRem(35)} ${pxToRem(16)} ${pxToRem(18)}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `${pxToRem(1)} solid ${colours.alto}`,
    width: "100%",
  },
  rightContainerFooter: {
    padding: `${pxToRem(24)} ${pxToRem(35)}`,
    borderTop: `${pxToRem(1)} solid ${colours.alto}`,
    width: "100%",
  },
  containerHeaderText: {
    color: colours.black,
    font: `normal normal 600 ${pxToRem(18)}/normal Poppins`,
    textTransform: "capitalize",
  },
  containerBody: {
    padding: `${pxToRem(28)} ${pxToRem(22)}`,
  },
  menuNameText: {
    color: colours.endavour,
    font: `normal normal 600 ${pxToRem(14)}/normal Poppins`,
    marginLeft: pxToRem(8),
    marginRight: pxToRem(5),
    cursor: "pointer",
  },
  menuNameTextWhenClosed: {
    color: colours.codGray,
    font: `normal normal 400 ${pxToRem(14)}/normal Poppins`,
    marginLeft: pxToRem(8),
    marginRight: pxToRem(5),
    cursor: "pointer",
  },
  menuOpenCloseIcon: {
    cursor: "pointer",
    display: "flex",
    "& svg": {
      width: pxToRem(19),
      height: pxToRem(19),
    },
  },
  doneIcon: {
    display: "flex",
    "& svg": {
      width: pxToRem(16),
      height: pxToRem(16),
    },
  },
  verticalLines: {
    width: pxToRem(1),
    height: pxToRem(29),
    background: "transparent",
    borderStyle: "dashed",
    border: `${pxToRem(1)} solid ${colours.alto}`,
    position: "absolute",
    top: pxToRem(22),
    left: pxToRem(8),
  },
  subMenuContainer: {
    position: "absolute",
    top: pxToRem(44),
    left: pxToRem(8),
    cursor: "pointer",
  },
  gap20: {
    gap: pxToRem(20),
  },
}));

export const PanelMenuItem = styled.div`
  position: relative;
  margin-bottom: ${(props) => props.marginBottom};
`;

export const SubMenu = styled.div`
  position: relative;
  border: ${pxToRem(1.8)} solid ${colours.alto};
  border-image: none;
  border-style: dashed;
  width: ${pxToRem(32)};
  height: ${pxToRem(29)};
  border-bottom: none;
  border-right: transparent;
  border-left: ${(props) => (props.lastChildBorderLeftNone ? "none" : "block")};
  &::after {
    content: '${(props) => props.itemName}';
    position: absolute;
    left: ${pxToRem(34)};
    top: ${pxToRem(-10)};
    display: inline-block;
    width: max-content;
    color: ${(props) => (props.isOpen ? colours.endavour : colours.codGray)};
    font: normal normal 400 ${pxToRem(14)} / normal Poppins;
    font-weight: ${(props) => (props.isOpen ? "600" : "400")};;
  }
`;

export const ActionButton = styled(Button)`
  width: 100%;
  height: ${pxToRem(37)};
  max-width: ${pxToRem(82)};
  padding: ${pxToRem(8)} ${pxToRem(24)};
  font: normal normal 400 ${pxToRem(14)} / normal Poppins;
  display: ${(props) => (props.display ? "flex" : "none")};
`;
