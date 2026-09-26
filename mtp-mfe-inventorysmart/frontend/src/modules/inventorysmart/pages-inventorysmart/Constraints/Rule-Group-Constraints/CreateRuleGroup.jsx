import { useState } from "react";
import { Button, Input, TextArea, useTranslation } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import Loader from "core/Utils/Loader/loader";
import colours from "core/Styles/colours";
import InfoBanner from "../../Exceptions-stores/InfoBanner";
import { createRuleGroup } from "../../../services-inventorysmart/Rule-Group-Constraints/rule-group-services";
import createRule from "assets/createRule.png";

const useStyles = makeStyles(() => ({
  pageWrapper: {
    padding: "18.5px",
    display: "flex",
    justifyContent: "center",
  },
  mainContainer: {
    width: "100%",
    margin: "0 156px",
    borderRadius: "0.5rem",
    background: colours.white,
    boxShadow: "0 0 0.25rem 0 rgba(171, 171, 171, 0.25)",
    overflow: "hidden",
  },
  contentGrid: {
    position: "relative",
    display: "flex",
    minHeight: "40.8rem",
    height: "100%",
  },
  divider: {
    position: "absolute",
    left: "28.5%",
    top: 0,
    bottom: 0,
    width: "0.0625rem",
    backgroundColor: colours.separaterColor,
    zIndex: 1,
  },
  leftSection: {
    width: "28.5%",
    padding: "5rem 3.2rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    "& .inv-content": {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
  },
  leftTitle: {
    margin: 0,
    marginBottom: "0.75rem",
    fontFamily: "Manrope",
    fontSize: "1.5rem",
    fontWeight: 800,
    lineHeight: "2.25rem",
    color: colours.darkBlack,
  },
  descriptionBox: {
    fontFamily: "Manrope",
    fontSize: "0.75rem",
    fontWeight: 500,
    lineHeight: "1rem",
    color: colours.greyHelperText,
    flex: "0 0 auto",
    maxWidth: "14.95rem",
  },
  imageWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  image: {
    objectFit: "contain",
  },
  rightSection: {
    width: "71.5%",
    padding: "5rem 190px 5rem 190px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  infoBannerWrapper: {
    marginBottom: "24px",
    minHeight: "2.25rem",
    width: "23.125rem",
    "& > div": {
      height: "2.25rem",
      minWidth: "auto",
      width: "100%",
      padding: "0.5rem 1rem",
      gap: "0.75rem !important",
    },
    "& > div > .MuiSvgIcon-root": {
      marginLeft: "0 !important",
    },
  },
  fieldBlock: {
    marginBottom: "32px",
    // Input has no width prop (it spreads to MUI OutlinedInput), so its width is
    // set here. TextArea sizes itself via its native width/height props.
    "& .impact_inputbox_container": {
      width: "20.75rem !important",
    },
    "& .MuiInputBase-root": {
      width: "20.75rem !important",
    },
    "& .MuiInputBase-input": {
      minWidth: "0 !important",
      width: "100% !important",
    },
    "& textarea:focus": {
      outline: "none",
      boxShadow: "none",
    },
  },
  descriptionField: {
    marginBottom: 0,
  },
  formFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formFooterLeft: {
    display: "flex",
    gap: "12px",
  },
}));

const CreateRuleGroup = (props) => {
  const {
    title = "inventorysmart.createRuleGroup",
    description: propsDescription = "inventorysmart.createRuleGroupDescription",
    infoBanner = "inventorysmart.ruleGroupSavedInRuleGroupsTab",
    inputLableName = "inventorysmart.ruleGroupInputName",
    saveButtonLabel = "inventorysmart.ruleGroupSaveGroup",
    descriptionMaxCharLimit = 200,
    inputMaxChatLimit = 999999999,
    showInfoBanner: propsShowInfoBanner = true,
    initialGroupName = "",
    initialDescription = "",
    onBlur,
  } = props;
  const classes = useStyles();
  const { t } = useTranslation();

  const [showInfoBanner, setShowInfoBanner] = useState(propsShowInfoBanner);
  const [groupName, setGroupName] = useState(initialGroupName);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    props.onCancel && props.onCancel();
  };

  const handleClearField = () => {
    setGroupName("");
    setDescription("");
  };

  const handleSaveGroup = async () => {
    if (props.skipSaveApi) {
      props.onSave?.({ rule_name: groupName, description });
      return;
    }

    const rules = (props.selectedRules || []).map((rule) => ({
      rcl_code: rule.rcl_code,
      rule_code: rule.rule_code,
      psa_code: rule.psa_code,
    }));

    const payload = {
      group_name: groupName,
      group_description: description,
      rules,
    };

    try {
      setLoading(true);
      const response = await createRuleGroup(payload);
      if (response?.data?.status) {
        props.addSnack?.({
          message: response?.data?.message || "Rule group created successfully",
          options: { variant: "success" },
        });
        props.onSave && props.onSave();
      } else {
        props.addSnack?.({
          message: response?.data?.message || "Failed to create rule group",
          options: { variant: "error" },
        });
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.data?.message ||
        "Something went wrong";
      props.addSnack?.({
        message: errorMessage,
        options: { variant: "error" },
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = groupName.trim() !== "";

  return (
    <Loader loader={loading}>
      <div className={classes.pageWrapper}>
        <div className={classes.mainContainer}>
          <div className={classes.contentGrid}>
            <div className={classes.divider} />
            <div className={classes.leftSection}>
              <div className="inv-content">
                <h2 className={classes.leftTitle}>{t(title)}</h2>
                <div className={classes.descriptionBox}>
                  {t(propsDescription)}
                </div>
              </div>

              <div className={classes.imageWrapper}>
                <img
                  src={createRule}
                  alt="Create rule group"
                  className={classes.image}
                  width="279"
                  height="166"
                />
              </div>
            </div>

            <div className={classes.rightSection}>
              <div>
                {propsShowInfoBanner && (
                  <div className={classes.infoBannerWrapper}>
                    {showInfoBanner && (
                      <InfoBanner
                        message={t(infoBanner)}
                        onClose={() => setShowInfoBanner(false)}
                      />
                    )}
                  </div>
                )}

                <div className={classes.fieldBlock}>
                  <Input
                    label={t(inputLableName)}
                    placeholder="Enter Here..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    isClearable
                    isRequired
                    inputProps={{
                      maxLength: inputMaxChatLimit,
                    }}
                    onBlur={onBlur}
                    isDisabled={props.isDisabledField}
                  />
                </div>

                <div
                  className={`${classes.fieldBlock} ${classes.descriptionField}`}
                >
                  <TextArea
                    label="Description"
                    placeholder="Enter Text"
                    value={description}
                    onChange={(e) => {
                      if (e.target.value.length <= descriptionMaxCharLimit) {
                        setDescription(e.target.value);
                      }
                    }}
                    characterLimit={descriptionMaxCharLimit}
                    width="20.75rem"
                    height="6.25rem"
                    disabled={props.isDisabledField}
                  />
                </div>
              </div>

              <div className={classes.formFooter}>
                <div className={classes.formFooterLeft}>
                  <Button variant="text" onClick={handleCancel}>
                    {t("inventorysmart.cancel")}
                  </Button>
                  {!propsShowInfoBanner && (
                    <Button
                      variant="tertiary"
                      onClick={handleClearField}
                      disabled={(!isFormValid && !description) || props.isDisabledField}
                    >
                      {t("inventorysmart.storeTransferClearAllFields")}
                    </Button>
                  )}
                </div>

                <Button
                  variant="primary"
                  onClick={handleSaveGroup}
                  disabled={!isFormValid}
                >
                  {t(saveButtonLabel)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Loader>
  );
};

export default CreateRuleGroup;
