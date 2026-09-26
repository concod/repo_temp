import React from "react";
import { Badge, Button, EmptyState,useTranslation } from "impact-ui-v3";
import { LOGISTICS_EMPTY_STATE } from "../logisticsConfigConstants";
import { LOGISTICS_SECTION_ICONS } from "../logisticsConfigIcons";
import { useLogisticsConfigurationStyles } from "../logisticsConfigurationStyles";
import { parseSectionRules } from "../logisticsConfigUtils";
import { LogisticsConfigRuleRow } from "./LogisticsConfigRuleRow";

export const LogisticsConfigSection = ({
  section,
  sectionData,
  isActionsEnabled = true,
  onConfigure,
  onEdit,
}) => {
  const { t } = useTranslation();
  const classes = useLogisticsConfigurationStyles();
  const parsed = parseSectionRules(sectionData, section.id);
  const SectionIcon = LOGISTICS_SECTION_ICONS[section.iconType];

  return (
    <div
      className={`${classes.sectionCard} ${
        parsed.isEmpty ? classes.sectionCardEmpty : ""
      }`}
    >
      <div className={classes.sectionHeader}>
        <div className={classes.sectionHeaderLeft}>
          {SectionIcon && <SectionIcon className={classes.sectionIcon} />}
          <p className={classes.sectionTitle}>{section.title}</p>
          {parsed.activeMethodLabel && (
            <span className={classes.sectionBadge}>
              <Badge
                color="info"
                label={parsed.activeMethodLabel}
                size="small"
                variant="filled"
              />
            </span>
          )}
        </div>
        {!parsed.isEmpty && (
          <span className={classes.sectionEdit}>
            <Button
              variant="tertiary"
              onClick={onEdit}
              disabled={!isActionsEnabled}
            >
              {t("inventorysmart.edit")}
            </Button>
          </span>
        )}
      </div>

      <hr className={classes.sectionDivider} />

      <div className={classes.sectionContent}>
        {parsed.isEmpty ? (
          <div className={classes.sectionEmpty}>
            <EmptyState
              heading={LOGISTICS_EMPTY_STATE.heading}
              description={LOGISTICS_EMPTY_STATE.description}
              primaryButtonLabel={LOGISTICS_EMPTY_STATE.primaryButtonLabel}
              onPrimaryButtonClick={onConfigure}
              primaryButtonProps={{
                variant: "secondary",
                disabled: !isActionsEnabled,
              }}
            />
          </div>
        ) : (
          <div className={classes.sectionRules}>
            {parsed.rules.map((rule) => (
              <LogisticsConfigRuleRow
                key={rule.id}
                label={rule.label}
                subLabel={rule.subLabel}
                value={rule.value}
              />
            ))}
            {parsed.default && (
              <>
                <hr className={classes.sectionDivider} />
                <LogisticsConfigRuleRow
                  label={parsed.default.label}
                  value={parsed.default.value}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
