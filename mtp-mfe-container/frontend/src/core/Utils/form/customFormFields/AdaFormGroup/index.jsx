import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { Switch, Alert } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: "8px 12px 10px 12px",
    backgroundColor: "#fff",
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    height: "32px",
    justifyContent: "space-between",
  },

  headerText: {
    fontWeight: 600,
    fontSize: 14,
    color: "#111827",
  },
  leftSection: {
    display: "grid",
    gridTemplateColumns: "315px 1fr",
  },
  headerAlert: {
    justifySelf: "flex-end",
  },
  innerContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 16,
    marginTop: "16px",
  },

  fieldRow: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    alignItems: "center",
    marginBottom: 12,

    "&:last-child": {
      marginBottom: 0,
    },
  },

  label: {
    fontSize: 14,
    color: "#1F2B4D",
  },

  fieldWrapper: {
    display: "flex",
    alignItems: "center",
  },
}));

const AdaFormGroup = ({
  item,
  formData,
  handleChange,
  renderForm,
  disabledFields,
}) => {
  const classes = useStyles();

  const {
    label,
    header,
    field_name,
    accessor,
    fields = null,
    is_disabled,
    show_notification,
  } = item;

  const [showNotification, setShowNotification] = useState("");

  const isToggleVisible = item.show_toggle !== false;

  const key = accessor || field_name;
  const isEnabled = isToggleVisible ? !!formData?.[key] : true;

  const handleToggle = (e) => {
    if (!isToggleVisible) return;
    const checked = e.target.checked;
    // Show notification if config exists
    if (show_notification) {
      // Show ON message
      if (checked && show_notification.on_msg) {
        setShowNotification(show_notification.on_msg);
      }
      // Show OFF message
      else if (!checked && show_notification.off_msg) {
        setShowNotification(show_notification.off_msg);
      } else {
        setShowNotification(false);
      }
    }
    handleChange(e, "toggle", key, item);
  };

  useEffect(() => {
    if (!show_notification) return;

    const timer = setTimeout(() => {
      setShowNotification("");
    }, show_notification.duration);

    return () => clearTimeout(timer);
  }, [show_notification]);

  return (
    <div className={classes.root}>
      {/* Header */}
      <div className={classes.headerRow}>
        <div className={classes.leftSection}>
          <Typography className={classes.headerText}>{header}</Typography>
          {isToggleVisible && (
            <Switch
              checked={isEnabled}
              onChange={handleToggle}
              disabled={is_disabled || disabledFields}
              name={key}
            />
          )}
        </div>

        {showNotification && (
          <div className={classes.headerAlert}>
            <Alert
              actionButtonProps={{}}
              onClose={() => setShowNotification("")}
              severity={isEnabled ? "info" : "warning"}
              subtleBackground
              title={showNotification}
            />
          </div>
        )}
      </div>

      {/* Conditional Fields */}
      {fields && isEnabled && (
        <div className={classes.innerContainer}>
          {fields.map((child, index) => {
            const childKey = child.accessor || child.field_name;

            return (
              <div key={childKey || index} className={classes.fieldRow}>
                <Typography className={classes.label}>{child.label}</Typography>

                <div className={classes.fieldWrapper}>
                  {renderForm(
                    {
                      ...child,
                      accessor: childKey,
                      field_type: child.display_type,
                      label: "",
                    },
                    index
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdaFormGroup;
