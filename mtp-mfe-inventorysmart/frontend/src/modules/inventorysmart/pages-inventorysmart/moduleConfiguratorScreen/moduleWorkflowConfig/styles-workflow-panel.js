import { Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import styled from "styled-components";

export const useStyles = makeStyles(() => ({
  workflowContainer: {
    display: "grid",
    gridTemplateColumns: `${pxToRem(310)} auto`,
    gap: pxToRem(15),
    height: "100%",
    minHeight: 0,
  },
  workflowInnerContainer: {
    background: 'white'
  },
  menuNameText: {
    color: colours.endavour,
    font: `normal normal 600 ${pxToRem(14)}/normal Poppins`,
    marginLeft: pxToRem(8),
    marginRight: pxToRem(5),
    color: '#1F2B4D',
  },
  menuNameTextWhenClosed: {
    color: colours.codGray,
    font: `normal normal 400 ${pxToRem(14)}/normal Poppins`,
    marginLeft: pxToRem(8),
    marginRight: pxToRem(5),
  },
  menuOpenCloseIcon: {
    "& svg": {
      width: pxToRem(19),
      height: pxToRem(19),
    },
  },
  doneIcon: {
    "& svg": {
      width: pxToRem(16),
      height: pxToRem(16),
    },
  },
  verticalLines: {
    width: pxToRem(1),
    height: pxToRem(29),
    background: "transparent",
    border: `${pxToRem(1)} solid ${colours.alto}`,
    top: pxToRem(22),
    left: pxToRem(8),
  },
  subMenuContainer: {
    top: pxToRem(44),
    left: pxToRem(8),
  },
}));

export const PanelMenuItem = styled.div`
  position: relative;
  margin-bottom: ${(props) => props.marginBottom};
  color: #1F2B4D;
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
    font-weight: ${(props) => (props.isOpen ? "600" : "400")};
    color: #1F2B4D
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
