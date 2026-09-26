import makeStyles from "@mui/styles/makeStyles";

export const ChangePasswordStyling = makeStyles((theme) => ({
  container: {
    padding: "32px",
    maxWidth: "420px",
    margin: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "center",
    backgroundColor: theme.palette.background.paper,
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    marginTop: "80px",
  },
  title: {
    marginBottom: "8px",
    fontWeight: 600,
    fontSize: "22px",
    color: theme.palette.text.primary,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: "24px",
    fontSize: "14px",
    color: theme.palette.text.secondary,
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 500,
    color: theme.palette.text.primary,
  },
  errorText: {
    fontSize: "12px",
    color: theme.palette.error.main,
    margin: 0,
  },
  submitButton: {
    marginTop: "8px",
    padding: "10px 24px",
    textTransform: "none",
    fontWeight: 600,
  },
  linkToLogin: {
    marginTop: "16px",
    textAlign: "center",
    fontSize: "14px",
  },
}));
