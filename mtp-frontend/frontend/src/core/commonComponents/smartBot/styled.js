import styled from "styled-components";
import RefreshIcon from "@mui/icons-material/Refresh";
import colours from "core/Styles/colours";

export const StyledRefreshIcon = styled(RefreshIcon)`
  & path {
    fill: ${(props) =>
      props.loading
        ? colours.slateGrayLight
        : colours.endavour}; // Change fill color of the path based on loading prop
  }
`;
