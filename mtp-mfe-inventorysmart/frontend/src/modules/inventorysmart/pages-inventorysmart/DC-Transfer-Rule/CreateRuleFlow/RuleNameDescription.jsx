import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, TextArea, useTranslation } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";
import InfoBanner from "../../Exceptions-stores/InfoBanner";
import createRule from "assets/createRule.png";
import { fetchDCTransferRules } from "../../../services-inventorysmart/DC-Transfer-Rule/dc-transfer-rule";

const BOTTOM_SPACING = 35;

const useStyles = makeStyles(() => ({
  pageWrapper: {
    padding: "18.5px 18.5px 0",
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
    padding: "3rem 3.2rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    "& .inv-content": {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      width: "100%",
    },
  },
  leftTitle: {
    margin: 0,
    marginBottom: "0.75rem",
    fontFamily: "Manrope",
    fontSize: "1.5rem",
    fontWeight: 800,
    lineHeight: "2.25rem",
    textAlign: "left",
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
    padding: "3rem 190px",
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
  footerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
}));

const RuleNameDescription = ({
  initialRuleName = "",
  initialDescription = "",
  onCancel,
  onNext,
  isDisabled = false,
  excludeRuleId = null,
}) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const mainContainerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState();
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [ruleName, setRuleName] = useState(initialRuleName);
  const [description, setDescription] = useState(initialDescription);
  const [existingRules, setExistingRules] = useState([]);

  useEffect(() => {
    const updateHeight = () => {
      if (!mainContainerRef.current) return;
      const top = mainContainerRef.current.getBoundingClientRect().top;
      setContainerHeight(window.innerHeight - top - BOTTOM_SPACING);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadExistingRules = async () => {
      try {
        const response = await fetchDCTransferRules()();
        if (!cancelled) {
          setExistingRules(response?.data?.data || []);
        }
      } catch {
        if (!cancelled) {
          setExistingRules([]);
        }
      }
    };

    loadExistingRules();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedRuleName = ruleName.trim().toLowerCase();
  const isDuplicateRuleName = useMemo(() => {
    if (!normalizedRuleName || isDisabled) {
      return false;
    }

    return existingRules.some((rule) => {
      if (
        excludeRuleId !== null &&
        excludeRuleId !== undefined &&
        String(rule.id) === String(excludeRuleId)
      ) {
        return false;
      }

      return String(rule.rule_name ?? "").trim().toLowerCase() === normalizedRuleName;
    });
  }, [existingRules, excludeRuleId, isDisabled, normalizedRuleName]);

  const isFormValid = ruleName.trim() !== "" && !isDuplicateRuleName;
  const hasFieldValues = ruleName.trim() !== "" || description.trim() !== "";
  const ruleNameErrorMessage = isDuplicateRuleName
    ? t("inventorysmart.dcTransferRule.createRule.ruleNameAlreadyUsed")
    : "";

  const handleClearAllFields = () => {
    if (isDisabled) {
      return;
    }
    setRuleName("");
    setDescription("");
  };

  const handleNext = () => {
    onNext &&
      onNext({
        ruleName: ruleName.trim(),
        description: description.trim(),
      });
  };

  return (
    <div className={classes.pageWrapper}>
      <div
        className={classes.mainContainer}
        ref={mainContainerRef}
        style={containerHeight ? { height: containerHeight } : undefined}
      >
        <div className={classes.contentGrid}>
          <div className={classes.divider}></div>

          <div className={classes.leftSection}>
            <div className="inv-content">
              <h2 className={classes.leftTitle}>
                {t("inventorysmart.dcTransferRule.createRule.title")}
              </h2>
              <div className={classes.descriptionBox}>
                {t("inventorysmart.dcTransferRule.createRule.description")}
              </div>
            </div>

            <div className={classes.imageWrapper}>
              <img
                src={createRule}
                alt={t("inventorysmart.dcTransferRule.createRule.imageAlt")}
                className={classes.image}
                width="279"
                height="166"
              />
            </div>
          </div>

          <div className={classes.rightSection}>
            <div>
              <div className={classes.fieldBlock}>
                <Input
                  label={t("inventorysmart.dcTransferRule.createRule.ruleName")}
                  placeholder={t(
                    "inventorysmart.dcTransferRule.createRule.enterHere"
                  )}
                  value={ruleName}
                  onChange={(e) => {
                    if (!isDisabled) {
                      setRuleName(e.target.value);
                    }
                  }}
                  isClearable={!isDisabled}
                  isRequired
                  isDisabled={isDisabled}
                  disabled={isDisabled}
                  isError={isDuplicateRuleName}
                  helperText={ruleNameErrorMessage}
                  isHelperText={isDuplicateRuleName}
                />
              </div>

              <div
                className={`${classes.fieldBlock} ${classes.descriptionField}`}
              >
                <TextArea
                  label={t(
                    "inventorysmart.dcTransferRule.createRule.descriptionLabel"
                  )}
                  placeholder={t("filters.enterText")}
                  value={description}
                  onChange={(e) => {
                    if (isDisabled) {
                      return;
                    }
                    if (e.target.value.length <= 300) {
                      setDescription(e.target.value);
                    }
                  }}
                  characterLimit={300}
                  width="20.75rem"
                  height="6.25rem"
                  isDisabled={isDisabled}
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className={classes.formFooter}>
              <div className={classes.footerActions}>
                <Button variant="text" onClick={onCancel}>
                  {t("inventorysmart.cancel")}
                </Button>
                <Button
                  variant="tertiary"
                  onClick={handleClearAllFields}
                  disabled={isDisabled || !hasFieldValues}
                >
                  {t("inventorysmart.dcTransferRule.createRule.clearAllFields")}
                </Button>
              </div>
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!isFormValid}
              >
                {t("inventorysmart.dcTransferRule.createRule.next")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleNameDescription;
