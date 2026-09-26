import { makeStyles } from "@mui/styles";

const WAVE_OVERLAY = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='418' height='41' viewBox='0 0 418 41' preserveAspectRatio='none' fill='none'%3E%3Cpath d='M0 -0.382422C0 -0.382422 103.641 37.2685 191.971 41.7136H223.671C224.144 41.6862 224.616 41.6574 225.087 41.6272C282.624 37.9377 339.452 8.00862 396.387 -0.382422C437.897 -6.5 427.958 26.5 427.958 26.5L422.696 41.7136H232.103H223.671C213.484 42.3048 202.844 42.2608 191.971 41.7136H0V-0.382422Z' fill='%23F0FAF9' fill-opacity='0.5'/%3E%3C/svg%3E") no-repeat center / 100% 100%`;

export const useKpiCardStyles = makeStyles(() => ({
  emptyStateContainer: {
    height: "calc(100vh - 15rem)",
    display: "flex",
    alignItems: "center",
  },
  emptyStateDescriptionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "center",
    textAlign: "center",
  },
  emptyStateHeading: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    lineHeight: "30px",
    color: "#0D152C",
    textTransform: "capitalize",
  },
  emptyStateDescriptionLine: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "21px",
    color: "#7A8294",
  },
  emptyStateDescriptionEmphasis: {
    fontWeight: 600,
    color: "#1F2B4D",
  },
  summaryContainer: {
    background: "#FFFFFF",
    border: "1px solid #D9DDE7",
    borderRadius: "8px",
    boxShadow: "0px 0px 2px 0px rgba(0, 0, 0, 0.1)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
  },
  summaryTitle: {
    fontSize: "16px",
    fontWeight: 800,
    lineHeight: "24px",
    color: "#0D152C",
    margin: 0,
  },
  cardsRow: {
    display: "flex",
    gap: "24px",
    alignItems: "stretch",
    width: "100%",
  },
  cardOuter: {
    flex: "1 1 0",
    minWidth: 0,
    cursor: "pointer",
    boxSizing: "border-box",
    borderRadius: "12px",
    overflow: "hidden",
    transition: "box-shadow 0.2s ease, background 0.2s ease",
  },
  cardOuterDefault: {
    border: "2px solid #ECEEFD",
    background:
      "linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(158, 203, 218, 0.16) 100%)",
    boxShadow: "0px 0px 2px 0px rgba(0, 0, 0, 0.1)",
  },
  cardOuterSelected: {
    border: "4px solid transparent",
    background:
      "linear-gradient(#CFF0F8, #CFF0F8) padding-box, linear-gradient(180deg, #3FC2E3 0%, #86D8EE 100%) border-box",
  },
  cardInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "41px",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    borderRadius: "8px",
  },
  cardInnerDefault: {
    background: "transparent",
  },
  cardInnerSelected: {
    background: `${WAVE_OVERLAY}, #CFF0F8`,
    boxShadow: "0px 0px 3px 2px rgba(0, 0, 0, 0.19)",
  },
  cardLabelGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  cardIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    flexShrink: 0,
    "& svg": {
      fontSize: "24px",
    },
  },
  cardLabel: {
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "21px",
    color: "#31416E",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardCount: {
    fontSize: "20px",
    fontWeight: 700,
    lineHeight: "20px",
    color: "#1F2B4D",
    flexShrink: 0,
    marginLeft: "8px",
  },
  detailsSection: {
    marginTop: "16px",
    "& .impact-table-main-container": {
      marginBottom: "0 !important",
    },
  },
  detailsTitle: {
    fontSize: "16px",
    fontWeight: 800,
    lineHeight: "24px",
    color: "#0D152C",
    margin: "0 0 16px 0",
  },
}));
