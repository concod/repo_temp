import React from "react";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Breadcrumbs } from "impact-ui-v3";
import HomeIcon from "@mui/icons-material/Home";
import infoCircleIcon from "core/coreAssets/configurator/info-circle.svg?url";
import vendorIcon from "core/coreAssets/configurator/3d-vendor.png";
import lockIcon from "core/coreAssets/configurator/3d-lock.png";
import delayIcon from "core/coreAssets/configurator/3d-delay.png";
import handInventoryIcon from "core/coreAssets/configurator/3d-hand-inventory.png";
import accessMgmtIcon from "core/coreAssets/configurator/3d-access-mgmt.png";
import iconShadow from "core/coreAssets/configurator/icon-shadow.svg?url";
import styles from "../designSystem.module.css";
import { useStyles } from "./styles";

const CARD_DATA = [
  {
    id: "tenant-config",
    title: "Tenant Configurator",
    subtitle: "Set up core settings that define how tenant operates",
    tags: ["Localization", "Master Data"],
    enabled: true,
    buttonLabel: "Set up tenant configuration",
    disabledMessage: "Finish tenant configurator to enable tenant configuration",
    navigateTo: "tenant-configuration",
    enabledIcon: vendorIcon,
    disabledIcon: lockIcon,
  },
  {
    id: "module-config",
    title: "Module Configurator",
    subtitle: "Configure & manage individual modules as required",
    tags: ["Dc Store Policy Strategy Rules", "Product Status", "Dashboard"],
    enabled: true,
    buttonLabel: "Set up module configurator",
    disabledMessage: "Finish tenant configurator to enable module configurator",
    navigateTo: "module-configurator",
    enabledIcon: accessMgmtIcon,
    disabledIcon: lockIcon,
  },
  {
    id: "access-mgmt",
    title: "Application Access Management",
    subtitle: "Manage users and access permissions",
    tags: ["UAM"],
    enabled: false,
    buttonLabel: "Set up access management",
    disabledMessage: "Finish tenant configurator to enable UAM",
    navigateTo: "access-management",
    enabledIcon: handInventoryIcon,
    disabledIcon: lockIcon,
  },
  {
    id: "optimizer-config",
    title: "Optimizer Configurator",
    subtitle: "Configure optimization parameters, rules, and algorithms",
    tags: [
      "Pack Handling",
      "Store Constraints",
      "Allocation Parameters",
      "Fixed Push Allocation Settings",
    ],
    enabled: false,
    buttonLabel: "Set up optimizer configurator",
    disabledMessage: "Finish tenant configurator to enable optimizer configurator",
    navigateTo: "optimizer-configurator",
    enabledIcon: delayIcon,
    disabledIcon: lockIcon,
  },
];

const ApplicationConfigurator = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCardAction = (card) => {
    if (!card.enabled) return;
    if (card.navigateTo) {
      const newPath = location.pathname.replace(
        /\/application-configurator$/,
        `/${card.navigateTo}`
      );
      navigate(newPath);
    }
  };

  return (
    <div
      className={`${styles.tokens} ${styles.pt12} ${styles.pl24} ${styles.pr24} ${styles.pb24} ${classes.pageContainer}`}
    >
      <div className={styles.mb12}>
        <Breadcrumbs
          aria-label="breadcrumb"
          list={[
            {
              label: "Home",
              icon: <HomeIcon />,
            },
            {
              label: "Application Configurator",
            },
          ]}
        />
      </div>

      <div className={classes.cardsGrid}>
        {CARD_DATA.map((card) => (
          <div
            key={card.id}
            className={`${classes.card} ${
              card.enabled ? classes.cardEnabled : classes.cardDisabled
            }`}
          >
            {/* Inner white content area */}
            <div className={classes.cardInner}>
              {/* Card Header: Icon + Title/Subtitle */}
              <div className={classes.cardHeader}>
                <div className={classes.cardIconWrapper}>
                  <img
                    src={iconShadow}
                    alt=""
                    className={classes.cardIconShadow}
                  />
                  <img
                    src={card.enabled ? card.enabledIcon : card.disabledIcon}
                    alt={card.title}
                    className={classes.cardIcon}
                  />
                </div>
                <div className={classes.cardTitleGroup}>
                  <p className={classes.cardTitle}>{card.title}</p>
                  <p className={classes.cardSubtitle}>{card.subtitle}</p>
                </div>
              </div>

              {/* Divider */}
              <div className={classes.divider} />

              {/* What you'll configure */}
              <div className={classes.configSection}>
                <p className={classes.configLabel}>What you'll configure :</p>
                <ul className={classes.tagList}>
                  {card.tags.map((tag, idx) => (
                    <li key={idx} className={classes.tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer: Button or Disabled Message */}
            <div className={classes.cardFooter}>
              {card.enabled ? (
                <button
                  className={classes.actionButton}
                  onClick={() => handleCardAction(card)}
                >
                  {card.buttonLabel}
                </button>
              ) : (
                <div className={classes.disabledMessage}>
                  <img
                    src={infoCircleIcon}
                    alt="info"
                    className={classes.infoIcon}
                  />
                  <span>{card.disabledMessage}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationConfigurator;
