import { useEffect, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import styles from "../../moduleConfiguratorScreen/designSystem.module.css"
import { useStyles } from "./styles";
import ProgressBar from "./ProgressBar";

import {
  Typography,
  Tooltip,
} from "@mui/material";
import { convertAPIDataToDummyDataFormat } from "./dummyData";
import CustomTooltip from "./CustomTooltip";
import {
  createReducerState,
  getModulesForConfigurator,
} from "core/actions/configuratorActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { Tag } from "impact-ui-v3";
import { connect, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { pxToRem } from "core/Utils/functions/utils";
import DOMPurify from "dompurify";
import { Input, Breadcrumbs, useTranslation } from "impact-ui-v3";
import SearchIcon from "@mui/icons-material/Search";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HomeIcon from "@mui/icons-material/Home";
import { cloneDeep } from "lodash";

// Level Icon SVG Component
const LevelIconSVG = ({ fillColor }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    style={{
      filter: "drop-shadow(-0.586px 0.879px 2.198px rgba(163, 163, 163, 0.98))",
    }}
  >
    <g id="Frame 1707489176">
      <g id="Icon 3d">
        <path
          id="3D"
          d="M16.2417 5.41789C18.1187 3.79365 20.9034 3.79365 22.7804 5.41789L26.2972 8.46118C26.7766 8.87598 27.3305 9.19577 27.9294 9.40349L32.3234 10.9275C33.5235 11.3438 34.4741 12.1786 35.0536 13.2213L35.6808 12.5941V15.498C35.6914 15.8579 35.6631 16.2238 35.5927 16.5902L34.7156 21.1575C34.596 21.78 34.596 22.4196 34.7156 23.0421L35.3152 26.1645L35.6808 25.7989V28.408C35.6837 28.5062 35.6837 28.6042 35.6808 28.7017V28.8877L35.6721 28.8831C35.5423 30.845 34.2565 32.6016 32.3234 33.2721L27.9294 34.7962C27.3305 35.0039 26.7766 35.3237 26.2972 35.7385L22.7804 38.7818C20.9034 40.406 18.1187 40.406 16.2417 38.7818L12.7249 35.7385C12.2455 35.3237 11.6916 35.0039 11.0927 34.7962L6.69876 33.2721C4.7661 32.6018 3.4805 30.846 3.35011 28.8847L3.34436 28.8877V28.7823C3.33746 28.6316 3.33738 28.4798 3.34436 28.3273V25.7989L3.7074 26.1619L4.30656 23.0421C4.42611 22.4196 4.42611 21.78 4.30656 21.1575L3.4294 16.5902C3.34312 16.1409 3.32003 15.6925 3.35447 15.2548V12.5941L3.97327 13.2129C4.55314 12.1741 5.50186 11.3426 6.69876 10.9275L11.0927 9.40349C11.6916 9.19577 12.2455 8.87598 12.7249 8.46118L16.2417 5.41789Z"
          fill="#0C3855"
        />
        <g id="3D Matiz" style={{ mixBlendMode: "color" }}>
          <path
            d="M16.2417 5.41789C18.1187 3.79365 20.9034 3.79365 22.7804 5.41789L26.2972 8.46118C26.7766 8.87598 27.3305 9.19577 27.9294 9.40349L32.3234 10.9275C33.5235 11.3438 34.4741 12.1786 35.0536 13.2213L35.6808 12.5941V15.498C35.6914 15.8579 35.6631 16.2238 35.5927 16.5902L34.7156 21.1575C34.596 21.78 34.596 22.4196 34.7156 23.0421L35.3152 26.1645L35.6808 25.7989V28.408C35.6837 28.5062 35.6837 28.6042 35.6808 28.7017V28.8877L35.6721 28.8831C35.5423 30.845 34.2565 32.6016 32.3234 33.2721L27.9294 34.7962C27.3305 35.0039 26.7766 35.3237 26.2972 35.7385L22.7804 38.7818C20.9034 40.406 18.1187 40.406 16.2417 38.7818L12.7249 35.7385C12.2455 35.3237 11.6916 35.0039 11.0927 34.7962L6.69876 33.2721C4.7661 32.6018 3.4805 30.846 3.35011 28.8847L3.34436 28.8877V28.7823C3.33746 28.6316 3.33738 28.4798 3.34436 28.3273V25.7989L3.7074 26.1619L4.30656 23.0421C4.42611 22.4196 4.42611 21.78 4.30656 21.1575L3.4294 16.5902C3.34312 16.1409 3.32003 15.6925 3.35447 15.2548V12.5941L3.97327 13.2129C4.55314 12.1741 5.50186 11.3426 6.69876 10.9275L11.0927 9.40349C11.6916 9.19577 12.2455 8.87598 12.7249 8.46118L16.2417 5.41789Z"
            fill={fillColor}
          />
        </g>
        <g id="Borda">
          <path
            d="M16.2417 2.82915C18.1187 1.20491 20.9035 1.2049 22.7804 2.82914L26.2973 5.87244C26.7766 6.28724 27.3305 6.60703 27.9294 6.81475L32.3234 8.33877C34.6685 9.15215 36.0609 11.5638 35.5927 14.0015L34.7156 18.5688C34.596 19.1913 34.596 19.8309 34.7156 20.4534L35.5927 25.0207C36.0609 27.4583 34.6685 29.87 32.3234 30.6834L27.9294 32.2074C27.3305 32.4151 26.7766 32.7349 26.2973 33.1497L22.7804 36.193C20.9035 37.8173 18.1187 37.8173 16.2417 36.193L12.7249 33.1497C12.2455 32.7349 11.6916 32.4151 11.0927 32.2074L6.69877 30.6834C4.35365 29.87 2.96126 27.4583 3.42941 25.0207L4.30656 20.4534C4.42612 19.8309 4.42612 19.1913 4.30656 18.5688L3.42941 14.0015C2.96126 11.5638 4.35364 9.15215 6.69876 8.33877L11.0927 6.81475C11.6916 6.60703 12.2455 6.28724 12.7249 5.87244L16.2417 2.82915Z"
            fill="url(#paint0_radial_2001_89)"
          />
          <path
            d="M16.2417 2.82915C18.1187 1.20491 20.9035 1.2049 22.7804 2.82914L26.2973 5.87244C26.7766 6.28724 27.3305 6.60703 27.9294 6.81475L32.3234 8.33877C34.6685 9.15215 36.0609 11.5638 35.5927 14.0015L34.7156 18.5688C34.596 19.1913 34.596 19.8309 34.7156 20.4534L35.5927 25.0207C36.0609 27.4583 34.6685 29.87 32.3234 30.6834L27.9294 32.2074C27.3305 32.4151 26.7766 32.7349 26.2973 33.1497L22.7804 36.193C20.9035 37.8173 18.1187 37.8173 16.2417 36.193L12.7249 33.1497C12.2455 32.7349 11.6916 32.4151 11.0927 32.2074L6.69877 30.6834C4.35365 29.87 2.96126 27.4583 3.42941 25.0207L4.30656 20.4534C4.42612 19.8309 4.42612 19.1913 4.30656 18.5688L3.42941 14.0015C2.96126 11.5638 4.35364 9.15215 6.69876 8.33877L11.0927 6.81475C11.6916 6.60703 12.2455 6.28724 12.7249 5.87244L16.2417 2.82915Z"
            fill="white"
            fillOpacity="0.1"
            style={{ mixBlendMode: "color-dodge" }}
          />
        </g>
        <g id="Meio">
          <path
            d="M17.1391 5.55227C18.5008 4.37397 20.521 4.37397 21.8826 5.55227L25.1487 8.3786C25.4965 8.67952 25.8983 8.91151 26.3328 9.0622L30.4135 10.4776C32.1147 11.0676 33.1248 12.8172 32.7852 14.5855L31.9706 18.8272C31.8839 19.2788 31.8839 19.7428 31.9706 20.1944L32.7852 24.4361C33.1248 26.2045 32.1147 27.954 30.4135 28.5441L26.3328 29.9595C25.8983 30.1102 25.4965 30.3422 25.1487 30.6431L21.8826 33.4694C20.521 34.6477 18.5008 34.6477 17.1391 33.4694L13.873 30.6431C13.5253 30.3422 13.1235 30.1102 12.689 29.9595L8.60828 28.5441C6.90702 27.954 5.89692 26.2045 6.23654 24.4361L7.05116 20.1944C7.13789 19.7428 7.13789 19.2788 7.05116 18.8272L6.23654 14.5855C5.89692 12.8172 6.90702 11.0676 8.60828 10.4776L12.689 9.0622C13.1235 8.91151 13.5253 8.67952 13.873 8.3786L17.1391 5.55227Z"
            fill="white"
            fillOpacity="0.2"
            style={{ mixBlendMode: "screen" }}
          />
        </g>
        <g id="Luz" style={{ mixBlendMode: "soft-light" }}>
          <path
            d="M19.337 4.82322C20.3302 4.79637 21.3311 5.12909 22.1311 5.82136L25.017 8.31871C25.4104 8.6591 25.8649 8.92153 26.3564 9.09198L29.9621 10.3426C31.1094 10.7405 31.9788 11.6046 32.4125 12.6615L35.5214 12.0693C35.1797 10.3812 33.9747 8.93288 32.2607 8.3384L27.8667 6.81438C27.2678 6.60666 26.7139 6.28687 26.2346 5.87207L22.7177 2.82878C21.7494 1.99078 20.5393 1.58513 19.337 1.61183V4.82322Z"
            fill="white"
          />
        </g>
        <g id="Matiz" style={{ mixBlendMode: "color" }}>
          <path
            d="M16.2417 2.82915C18.1187 1.20491 20.9035 1.2049 22.7804 2.82914L26.2973 5.87244C26.7766 6.28724 27.3305 6.60703 27.9294 6.81475L32.3234 8.33877C34.6685 9.15215 36.0609 11.5638 35.5927 14.0015L34.7156 18.5688C34.596 19.1913 34.596 19.8309 34.7156 20.4534L35.5927 25.0207C36.0609 27.4583 34.6685 29.87 32.3234 30.6834L27.9294 32.2074C27.3305 32.4151 26.7766 32.7349 26.2973 33.1497L22.7804 36.193C20.9035 37.8173 18.1187 37.8173 16.2417 36.193L12.7249 33.1497C12.2455 32.7349 11.6916 32.4151 11.0927 32.2074L6.69877 30.6834C4.35365 29.87 2.96126 27.4583 3.42941 25.0207L4.30656 20.4534C4.42612 19.8309 4.42612 19.1913 4.30656 18.5688L3.42941 14.0015C2.96126 11.5638 4.35364 9.15215 6.69876 8.33877L11.0927 6.81475C11.6916 6.60703 12.2455 6.28724 12.7249 5.87244L16.2417 2.82915Z"
            fill={fillColor}
          />
        </g>
        <g id="Brilho V2">
          <path
            id="Star 2"
            d="M10.7584 4.44354C10.8798 4.1155 11.3438 4.1155 11.4652 4.44354L11.8937 5.60174C11.9319 5.70488 12.0132 5.78619 12.1164 5.82436L13.2746 6.25293C13.6026 6.37432 13.6026 6.8383 13.2746 6.95969L12.1164 7.38826C12.0132 7.42642 11.9319 7.50774 11.8937 7.61087L11.4652 8.76907C11.3438 9.09712 10.8798 9.09712 10.7584 8.76907L10.3298 7.61087C10.2917 7.50774 10.2104 7.42642 10.1072 7.38826L8.94902 6.95969C8.62098 6.8383 8.62098 6.37432 8.94902 6.25293L10.1072 5.82436C10.2104 5.78619 10.2917 5.70488 10.3298 5.60174L10.7584 4.44354Z"
            fill="white"
          />
          <path
            id="Star 3"
            d="M27.9631 27.7869C28.0417 27.5744 28.3423 27.5744 28.4209 27.7869L28.6985 28.5372C28.7233 28.6041 28.7759 28.6567 28.8428 28.6815L29.593 28.9591C29.8056 29.0377 29.8056 29.3383 29.593 29.4169L28.8428 29.6946C28.7759 29.7193 28.7233 29.772 28.6985 29.8388L28.4209 30.5891C28.3423 30.8016 28.0417 30.8016 27.9631 30.5891L27.6854 29.8388C27.6607 29.772 27.608 29.7193 27.5412 29.6946L26.7909 29.4169C26.5784 29.3383 26.5784 29.0377 26.7909 28.9591L27.5412 28.6815C27.608 28.6567 27.6607 28.6041 27.6854 28.5372L27.9631 27.7869Z"
            fill="white"
          />
        </g>
      </g>
    </g>
    <defs>
      <radialGradient
        id="paint0_radial_2001_89"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(19.5111) rotate(90) scale(39.0222)"
      >
        <stop stopColor="#95CCEA" />
        <stop offset="1" stopColor="#104D7D" />
      </radialGradient>
    </defs>
  </svg>
);

const SystemConfigurator = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  let location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [modulesData, setModulesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredModule, setFilteredModule] = useState({});
  const [allocationTypes, setAllocationTypes] = useState(null);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const shouldHideModule = (moduleName) => {
    if (!allocationTypes || !moduleName) return false;
    
    const lowerModuleName = moduleName.toLowerCase();
    const poValidFlow = allocationTypes.po?.valid_flow ?? false;
    const asnValidFlow = allocationTypes.asn?.valid_flow ?? false;
    
    // Hide PO to Allocate alert if PO is not a valid flow
    if (lowerModuleName?.includes('po to allocate alert') && !poValidFlow) {
      return true;
    }
    
    // Hide ASN to Allocate alert if ASN is not a valid flow
    if (lowerModuleName?.includes('asn to allocate alert') && !asnValidFlow) {
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        //call the modules API
        const urlPath = window.location.pathname;
        const urlPathSplit = urlPath.split("/");
        let app = urlPathSplit[urlPathSplit.length - 2];
        
        // Fetch tenant config to check allocation types
        try {
          const configResp = await getTenantConfigApplicationLevel(1, {
            attribute_name: "inventory_specific_tenant_configs",
          })();
          const tenantConfig = configResp?.data?.data?.[0]?.attribute_value;
          const configValue = tenantConfig?.value || tenantConfig;
          setAllocationTypes(configValue?.allocation_types || null);
        } catch (configErr) {
          console.error("Failed to fetch tenant config:", configErr);
        }
        
        let modulesDataResp = await getModulesForConfigurator(app)();
        const transformedData = convertAPIDataToDummyDataFormat(
          modulesDataResp?.data?.data, t
        );
        setModulesData(transformedData);
        setFilteredModule(transformedData);
        setLoading(false);
      } catch (err) {
        displaySnackMessages(err?.message || t("moduleConfigurator.system.somethingWentWrong"), "error");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleModuleClick = (title, moduleCode, screenCode) => {
    // Validate inputs
    if (
      !title ||
      typeof title !== "string" ||
      !moduleCode ||
      typeof moduleCode !== "number"
    ) {
      return;
    }

    // Sanitize inputs
    const sanitizedTitle = DOMPurify.sanitize(title);
    const sanitizedModuleCode = Number(DOMPurify.sanitize(moduleCode));
    const sanitizedScreenCode = Number(DOMPurify.sanitize(screenCode));

    //setting the module code to the configurator reducer state
    dispatch(createReducerState("moduleCode", sanitizedModuleCode));
    dispatch(createReducerState("moduleName", sanitizedTitle));
    dispatch(createReducerState("screenCode", sanitizedScreenCode));

    localStorage.setItem("moduleCode", sanitizedModuleCode);
    localStorage.setItem("moduleName", sanitizedTitle);
    localStorage.setItem("screenCode", sanitizedScreenCode);

    const newString = encodeURIComponent(sanitizedTitle);
    // Get the current location from props
    const currentLocation = location;

    // Append the new string to the existing pathname
    const newPathname = currentLocation.pathname + "/" + newString;

    // Use navigate to update the URL with the new pathname
    navigate(newPathname);
  };

  if (loading || !modulesData) {
    return <Loader loader={loading}></Loader>;
  }
  const handleSearch = (e) => {
    const value = e.target.value || "";
    setSearchTerm(value);

    const lower = value.toLowerCase();
    const data = cloneDeep(modulesData);
    data.details = data?.details?.map((level) => ({
      ...level,
      rowData: level?.rowData?.filter((row) =>
        row?.cardHeader?.toLowerCase().includes(lower)
      ),
    }));
    setFilteredModule(data);
  };
  return (
    <div className={`${styles.tokens} ${styles.pt12} ${styles.pl24} ${styles.pr24} ${styles.pb24}`}>
      <div className={`${globalClasses.flexAlignBetweenCenter} ${styles.mb12}`}>
        <Breadcrumbs
          aria-label="breadcrumb"
          list={[
            {
              label: t("moduleConfigurator.breadcrumb.home"),
              icon: <HomeIcon />,
            },
            {
              label: modulesData?.componentTitle || t("moduleConfigurator.card.moduleConfigurator.title"),
            },
          ]}
        />
        <div className={classes.searchInputWrapper}>
        <Input
            rightIcon={<SearchIcon className={classes.searchIcon} />}
          onChange={handleSearch}
          placeholder={t("moduleConfigurator.system.searchPlaceholder")}
          type="text"
          value={searchTerm}
        />
        </div>
      </div>
      <div className={`${styles.flex} ${styles.flexCol} ${styles.gap24}`}>
        {filteredModule?.details?.map((rowItem, index) => {
          return (
            <div
              key={index}
              className={`${styles.flex} ${styles.flexCol} ${styles.itemsStart} ${styles.gap24} ${styles.selfStretch} ${styles.rounded16} ${styles.p16} ${styles.pb24} ${classes.levelContainer}`}
            >
              {/* Level Header */}
              <div className={`${styles.flex} ${styles.itemsCenter} ${styles.justifyBetween} ${styles.wFull}`}>
                <div className={`${styles.flex} ${styles.itemsCenter} ${styles.gap12}`}>
                  {/* Level Icon - Gem/Hexagonal shape SVG */}
                  <div className={classes.iconContainer}>
                    <LevelIconSVG fillColor={index % 2 === 0 ? "#6BBEC2" : "#BE77EE"} />
                    <div className={classes.iconNumberOverlay}>
                      {index + 1}
                    </div>
                  </div>
                  {/* Level Text */}
                  <Typography className={classes.levelText}>
                    {rowItem?.rowTitle}
                  </Typography>
                  {/* Badge with percentage */}
                  {(() => {
                    const levelPercentage = Math.round(
                      rowItem?.rowData?.reduce((sum, card) => sum + (card?.percentage || 0), 0) / (rowItem?.rowData?.length || 1)
                    );
                    const isLevelCompleted = levelPercentage >= 65;
                    return (
                      <div
                        className={`${classes.levelBadgeContainer} ${isLevelCompleted ? classes.levelBadgeSuccess : classes.levelBadgeInfo}`}
                      >
                        {isLevelCompleted ? (
                          <CheckCircleIcon className={classes.levelBadgeIconSuccess} />
                        ) : (
                          <AccessTimeIcon className={classes.levelBadgeIconInfo} />
                        )}
                        <Typography
                          className={`${styles.text14} ${styles.fontMedium} ${isLevelCompleted ? classes.levelBadgeTextSuccess : classes.levelBadgeTextInfo}`}
                        >
                          {levelPercentage}%
                        </Typography>
                      </div>
                    );
                  })()}
                </div>
                {/* Modules completed count */}
                <Typography className={classes.modulesCompletedText}>
                  {t("moduleConfigurator.system.modulesCompleted")}{" "}
                  <span className={classes.completedNumberSpan}>
                    {rowItem?.rowData?.filter(card => (card?.percentage || 0) >= 80).length || 0}
                  </span>
                  /{rowItem?.rowData?.length || 0}
                </Typography>
                </div>
              {/* Cards Grid */}
              <div className={`${styles.wFull} ${classes.cardsGridPadding}`}>
                <div className={classes.cardsGridContainer}>
                  {rowItem?.rowData?.map((card, cardIndex) => {
                    const cardPercentage = card?.percentage != null ? Number(card.percentage) : 0;
                    const isCompleted = cardPercentage >= 65;
                    
                    // Hide card if module should be hidden based on tenant config
                    if (shouldHideModule(card?.cardHeader)) {
                      return null;
                    }
                  
                    return (
                      <div key={cardIndex} className={classes.cardWrapper}>
                        <div
                          onClick={(e) => {
                            handleModuleClick(
                              card?.cardHeader,
                              card?.moduleCode,
                              card?.screenCode,                     
                            );
                            e.stopPropagation();
                          }}
                          className={`${globalClasses.cursorPointer} ${styles.flex} ${styles.flexCol} ${styles.itemsStart} ${styles.gap10} ${styles.rounded12} ${classes.systemCard}`}
                        >
                          {/* Progress Bar at top */}
                          {cardPercentage > 0 && (
                            <div className={`${styles.wFull} ${classes.progressBarWrapper}`}>
                              <ProgressBar
                                style={{ height: "0.375rem" }}
                                percentage={cardPercentage}
                                gradientBackground={
                                  isCompleted
                                    ? "linear-gradient(270deg, #3BB273 0%, #C4E8D5 100%)"
                                    : "linear-gradient(270deg, #4259EE -10.68%, #ECEEFD 99.87%)"
                                }
                              />
                            </div>
                          )}
                          {/* Card Content */}
                          <div className={`${styles.flex} ${styles.flexCol} ${styles.itemsStart} ${styles.wFull} ${classes.cardContentPadding}`}>
                            {/* Status Icon, Percentage and Tags */}
                            <div className={`${styles.flex} ${styles.itemsCenter} ${styles.gap8} ${styles.wFull}`} style={{ flexWrap: "wrap" }}>
                              <div
                                className={`${classes.cardBadgeContainer} ${isCompleted ? classes.cardBadgeSuccess : classes.cardBadgeInfo}`}
                              >
                                {isCompleted ? (
                                  <CheckCircleIcon className={classes.cardBadgeIconSuccess} />
                                ) : (
                                  <AccessTimeIcon className={classes.cardBadgeIconInfo} />
                                )}
                                <Typography
                                  className={`${styles.text14} ${styles.fontMedium} ${isCompleted ? classes.cardBadgeTextSuccess : classes.cardBadgeTextInfo}`}
                                >
                                  {cardPercentage}%
                                </Typography>
                              </div>
                              {/* Tags */}
                              {card?.tags && card.tags.length > 0 && (
                                <>
                                  {card.tags
                                    .filter((tag) => tag && typeof tag === "string" && tag.trim().length > 0)
                                    .map((tag, idx) => (
                                      <Tag key={idx} label={tag} variant="solid" size="small">
                                        {tag}
                                      </Tag>
                                    ))}
                                </>
                              )}
                            </div>
                            {/* Title */}
                            <Tooltip
                              placement="bottom-start"
                              arrow
                            >
                              <Typography
                                className={`${styles.wFull} ${styles.truncate} ${styles.m0} ${styles.p0} ${styles.mt16} ${classes.cardTitle}`}
                              >
                                {card.cardHeader}
                              </Typography>
                            </Tooltip>
                            {/* Description */}
                            <Tooltip
                              placement="bottom-start"
                              arrow
                              title={card?.description}
                            >
                              <Typography
                                className={`${styles.truncate2Lines} ${styles.m0} ${classes.cardDescription}`}
                              >
                                {card?.description || t("moduleConfigurator.system.descriptionNotAvailable")}
                              </Typography>
                            </Tooltip>
                            {/* View dependency link for Level 2+ */}
                            {rowItem?.rowTitle !== "Level 1" && (
                              <div className={`${styles.flex} ${styles.justifyStart} ${styles.itemsStart} ${styles.pl0} ${styles.ml0} ${classes.viewDependencyContainer}`}>
                                <CustomTooltip
                                  cardSubHeader={card.cardSubHeader}
                                  tooltipData={card.tooltipData}
                            />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});
export default connect(null, mapDispatchToProps)(SystemConfigurator);
