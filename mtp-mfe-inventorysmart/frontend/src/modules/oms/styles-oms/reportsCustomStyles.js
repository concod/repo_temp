import { makeStyles } from "@mui/styles";

const rem = (px) => `${px / 16}rem`;

export const useStyles = makeStyles((theme) => ({
  vendorProjectionSubTabsContainer: {
    display: "flex",
    flexDirection: "column",
    padding: rem(16),
    gap: rem(16),
    borderRadius: rem(8),
    backgroundColor: "white",
    boxShadow: `0px 0px ${rem(4)} 0px ${theme.palette.colours.boxShadowCard}`,
  },
  vendorProjectionSubTabsHeader: {
    display: "grid",
    alignItems: "center",
    gridTemplateColumns: "auto 1fr auto",
    width: "100%",
    justifyItems: "self-end",
  },
  vendorProjectionSubTabsHeaderTabs: {
    display: "flex",
    gap: "12px",
    justifySelf: "start",
  },
  vendorProjectionSubTabsHeaderAlert: {
    justifySelf: "center",
    zIndex: 0,
  },
  vendorOrderSkuProjectionsContainer: {
    "& .impact-table-main-container": {
      marginBottom: "0 !important",
    },
  },
  customMarginBlock: {
    marginBlock: `${rem(12)} ${rem(24)}`,
  },
  containerCards: {
    border: "1px solid #C3C8D4",
    borderRadius: "8px",
    backgroundColor: "#fff",
    padding: "12px",
  },
}));
