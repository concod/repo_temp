import makeStyles from "@mui/styles/makeStyles";

export const CacheScreenStyling = makeStyles((theme) => ({
  container: {
    padding: "20px",
    maxWidth: "500px",
    margin: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.palette.background.paper, // Add a background color for the container
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    marginTop: "60px",
  },
  title: {
    marginBottom: "30px",
    fontWeight: "bold",
    fontSize: "24px",
    color: theme.palette.text.primary, // Title color
  },
  text: {
    fontSize: "14px",
  },
}));
