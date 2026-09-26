import { createTheme } from "@mui/material/styles";
import colours from "./colours";
import { pxToRem } from "core/Utils/functions/utils";

const theme = createTheme({
  palette: {
    common: {
      black: colours.black,
      white: colours.white,
    },
    primary: {
      lighter: colours.linkWater,
      light: colours.cerulean,
      lightest: colours.bubbles,
      main: colours.endavour,
      dark: colours.greenVogue,
      contrastText: colours.white,
    },
    error: {
      light: colours.wispPink,
      main: colours.errorRed,
      contrastText: colours.white,
    },
    warning: {
      lighter: colours.creamCan,
      lightest: colours.ginfizz,
      light: colours.seashellPeach,
      gold: colours.goldSand,
      main: colours.crusta,
      contrastText: colours.white,
    },
    success: {
      light: colours.panache,
      main: colours.eucalyptus,
      contrastText: colours.white,
    },
    tertiary: {
      main: colours.fuchsiaPink,
      light: colours.pinkLace,
    },
    text: {
      primary: colours.codGray,
      secondary: colours.fiord,
      disabled: colours.silverChalice,
      hint: colours.tiara,
      icon: "rgba(255, 255, 255, 0.7)",
      disabledText: colours.hoki,
      // new Color
      grey: colours.neutrals,
      black: colours.darkBlack,
      textDark: colours.textDark,
      boldHeadingBlue: colours.boldHeadingBlue,
    },
    background: {
      paper: colours.white,
      primary: colours.athensGray,
      default: colours.white,
      warningInfo: colours.princetonOrange,
      infoBg: colours.lightGrey,
      filterChips: colours.selago,
      chipBackground: colours.athensGrayLight,
      tagBackground: colours.linkWaterDark,
      separaterColor: colours.separaterColor,
      appBackground: colours.appBackground,
      disabled: colours.disabled,
      hummingBird: colours.hummingBird,
      whiteLilac: colours.whiteLilac,
      provincialPink: colours.provincialPink,
    },
    graphColours: [
      colours.endavour,
      colours.emerald,
      colours.selectiveYellow,
      colours.jaffa,
      colours.froly,
      colours.java,
      colours.cerulean,
      colours.pastelGreen,
      colours.dandelion,
      colours.atomicTangerine,
      colours.sweetPink,
      colours.spray,
      colours.periwinkle,
      colours.magicMint,
      colours.newOrleans,
      colours.apriocotPeach,
      colours.pink,
      colours.charlotte,
      colours.lightGray,
      colours.darkGreen,
      colours.darkYellow,
      colours.red,
      colours.cerulean,
      colours.green,
      colours.darkRed,
      colours.black,
      colours.lightRed,
      colours.lightOrange,
      colours.mercury,
      colours.gray,
    ],
    action: {
      active: "rgba(29, 29, 29, 0.7)",
      hover: "rgba(0, 0, 0, 0.04)",
      hoverOpacity: "0.04",
      selected: "rgba(0, 0, 0, 0.08)",
      selectedOpacity: "0.08",
      disabled: colours.darkSilverChalice,
      disabledBackground: colours.darkSilverChalice,
      disabledOpacity: "0.38",
      focus: "rgba(0, 0, 0, 0.12)",
      focusOpacity: "0.12",
      activatedOpacity: "0.12",
    },
    textColours: {
      codGray: colours.codGray,
      tiara: colours.tiara,
      slateGrayLight: colours.slateGrayLight,
      subHeader: colours.boulder,
      athensGrayLight: colours.athensGrayLight,
      botDateChipText: colours.raven,
      uploadBadgeText: colours.cobaltBlue,
      lightNeutrals: colours.lightNeutrals,
      neutralText: colours.neutralText,
      greyHelperText: colours.greyHelperText,
    },
    colours: {
      checboxBorder: colours.silverChalice,
      tableBorderColor: colours.botticelli,
      disabledBorder: colours.silverChalice,
      disabledBackground: colours.mercury,
      filterLabelColor: colours.lightslategray,
      labelColour: colours.slateGray,
      secondary: colours.froly,
      warning: colours.selectiveYellow,
      sliderRail: colours.periwinkle,
      silderDisabledRail: colours.concrete,
      accordionBorder: colours.tiara,
      disabledBadge: colours.alto,
      homeButtonBorder: colours.poloBlue,
      homeButtonShadow: colours.periwinkleGrey,
      disabledSelectBackground: colours.gallery,
      toolPanelLineBreak: colours.lightGray,
      tooltipColor: colours.trout,
      tooltipArrow: colours.darkSilver,
      botbuttonBackground: colours.royalViolet,
      miniButtonBGPrimary: colours.indigo,
      miniButtonBGSecondary: colours.mediumPurple,
      botDateChipBackground: colours.alabasterLight,
      botBlockBackgroud: colours.zirconLight,
      botLoaderBackgroud: colours.scorpion,
      boxShadowCard: colours.boxShadowCard,
      badgeBackground: colours.lavender,
      highlightBorder: colours.seagull,
      toggleBackground: colours.madison,
      dividerColor: colours.chambray,
      commentPopoverBorder: colours.neutralBorder,
      brightRoyalBlue: colours.brightRoyalBlue,
      softLightGrey: colours.softLightGrey,
      forestGreen: colours.forestGreen,
      neutralGrey: colours.neutralGrey,
      panelShadow: colours.panelShadow,
      menuBorder: colours.menuBorder,
      cardGradientRed: colours.cardGradientRed,
      cardGradientPink: colours.cardGradientPink,
      cardGradientOrange: colours.cardGradientOrange,
      aliceBlue: colours.aliceBlue,
      blue_01: colours.blue_01,
      darkBlack: colours.darkBlack,
      lightPeach: colours.lightPeach,
      linkWater1: colours.linkWater1,
      athensGray1: colours.athensGray1,
      backgroundChat: colours.backgroundChat,
      green500: colours.green500,
      mediumCarmine: colours.mediumCarmine,
      easternBlue: colours.easternBlue,
      studio: colours.studio,
      cinnabar: colours.cinnabar,
      oldLavender: colours.oldLavender,
      skyBlue: colours.skyBlue,
      eastSide: colours.eastSide,
      greyishBlue: colours.greyishBlue,
      agCellBorder: colours.agCellBorder
    },
  },
  typography: {
    fontFamily:
      '"Manrope", "Poppins","Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: "1.75rem",
      lineHeight: 2.625,
      letterSpacing: 0,
    },
    h2: {
      fontWeight: 600,
      fontSize: "1.5rem",
      lineHeight: 2.25,
      letterSpacing: 0,
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.25rem",
      lineHeight: 1.875,
      letterSpacing: 0,
    },
    h4: {
      fontWeight: 500,
      fontSize: "1rem",
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    h5: {
      fontWeight: 500,
      fontSize: "0.937rem",
      lineHeight: 1.4375,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 500,
      fontSize: "0.875rem",
      lineHeight: 1.3125,
      letterSpacing: 0,
    },
    text: {
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: "normal",
      fontSize: "0.75rem",
      lineHeight: "1.125rem",
      fontFamily: "Manrope",
      textTransform: "capitalize",
    },
    subtitle1: {
      fontWeight: 400,
      fontSize: "0.8125rem",
      lineHeight: 1.25,
      letterSpacing: 0,
    },
    body1: {
      fontWeight: 400,
      fontSize: "0.875rem",
      lineHeight: 1.235,
      letterSpacing: 0,
    },
    body2: {
      fontWeight: 500,
      fontSize: "0.8125rem",
      lineHeight: 1.25,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 500,
      fontSize: "0.875rem",
      lineHeight: 1.56,
      letterSpacing: 0,
      textTransform: "none",
    },
    breadcrumb: {
      font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1500,
    },
  },
  shape: {
    borderRadius: 3,
  },
  content: {
    overflow: {
      auto: "auto",
    },
  },
  components: {
    MuiTouchRipple: {
      styleOverrides: {
        child: {
          backgroundColor: colours.greenVogue,
          opacity: "0.14",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
          boxShadow: "none",
          color: colours.white,
          "&:disabled": {
            color: colours.white,
          },
        },
        textPrimary: {
          "&:hover": {
            backgroundColor: "transparent",
            color: colours.greenVogue,
          },
        },
        sizeSmall: {
          textTransform: "none",
          padding: "0.25rem 0.75rem",
          fontSize: "0.8125rem",
        },
        iconSizeSmall: {
          "& *:first-of-type, & *:last-child": {
            fontSize: "0.75rem",
          },
        },
        iconSizeMedium: {
          "& *:first-of-type, & *:last-child": {
            fontSize: "1rem",
          },
        },
        iconSizeLarge: {
          "& *:first-of-type, & *:last-child": {
            fontSize: "1.25rem",
          },
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        day: {
          color: colours.black,
        },
        dayDisabled: {
          color: colours.silverChalice,
        },
      },
    },
    MuiPickersCalendarHeader: {
      styleOverrides: {
        daysHeader: {
          color: colours.silverChalice,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        colorPrimary: {
          "&:not(.Mui-checked)": {
            color: colours.silverChalice,
          },
          "&.Mui-disabled": {
            color: colours.darkSilver,
          },
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          "&.MuiSvgIcon-fontSizeSmall": {
            fontSize: "1.334rem",
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        colorPrimary: {
          "&:not(.Mui-checked)": {
            color: colours.silverChalice,
          },
          "&.Mui-disabled": {
            color: colours.darkSilver,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        colorPrimary: {
          "&+.MuiSwitch-track": {
            backgroundColor: colours.catskillWhite,
            opacity: 1,
          },
          "& .MuiSwitch-thumb": {
            color: colours.darkSilver,
          },
          "&.Mui-checked": {
            "&+.MuiSwitch-track": {
              opacity: 0.5,
            },
            "& .MuiSwitch-thumb": {
              color: colours.endavour,
            },
          },
          "&.Mui-disabled": {
            "&+.MuiSwitch-track": {
              opacity: 0.5,
              background: colours.mystic,
            },
            "& .MuiSwitch-thumb": {
              opacity: 0.5,
            },
            "&.Mui-checked": {
              "&+.MuiSwitch-track": {
                opacity: 0.2,
                backgroundColor: colours.endavour,
              },
              "& .MuiSwitch-thumb": {
                opacity: 0.7,
              },
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: "unset",
          minWidth: "unset",
          textTransform: "none",

          "@media (min-width: 0px)": {},
        },
        textColorPrimary: {
          "&.MuiButtonBase-root": {
            padding: "0.1rem 0.625rem",
          },
          "&:not(.Mui-selected)": {
            color: colours.slateGrayLight,
            fontWeight: "normal",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: "unset",
          marginBottom: "1rem",
        },
        flexContainer: {
          borderBottom: `1px solid ${colours.silverChalice}`,
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          background: "transparent",
          padding: "1rem",
        },
        horizontal: {
          "& .MuiStepConnector-horizontal": {
            flex: "0 1 1.625rem",
          },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          fontSize: "2.5rem",
          color: colours.slateGrayLight,

          "&.Mui-active": {
            borderRadius: "50%",

            "& .MuiStepIcon-text": {
              fontWeight: 500,
            },
          },
        },
        text: {
          fontSize: "0.7rem",
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: 0,
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: colours.codGray,
          fontWeight: 400,

          "&.Mui-completed": {
            fontWeight: 400,
            color: colours.codGray,
          },
          "&.Mui-active": {
            fontWeight: 500,
            color: colours.codGray,
          },
        },
      },
    },
    MuiStepButton: {
      styleOverrides: {
        root: {
          padding: 0,
          margin: 0,
        },
      },
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        lineHorizontal: {
          borderTopWidth: "1",
        },
        line: {
          borderColor: colours.alto,
        },
        root: {
          top: "1.25rem",
          left: "calc(-50% + 30px)",
          right: "calc(50% + 30px)",
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        separator: {
          marginLeft: 0,
          marginRight: 0,
          fontSize: "0.875rem",
          color: colours.codGray,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          color: colours.silverChalice,
        },
        label: {
          color: colours.black,
          "&.Mui-disabled": {
            color: colours.silverChalice,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        root: {
          background: colours.greenVogue,
        },
        paper: {
          background: colours.greenVogue,
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          background: colours.white,
          border: `1px solid ${colours.endavour}`,
          borderRadius: "5px",
          flexWrap: "wrap",
        },
        groupedHorizontal: {
          "&:not(:first-of-type)": {
            borderRadius: 3,
            borderTopLeftRadius: 3,
            borderBottomLeftRadius: 3,
          },
          "&:not(:last-child)": {
            borderRadius: 3,
            borderTopRightRadius: 3,
            borderBottomRightRadius: 3,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          border: "none",
          color: colours.greenVogue,
          margin: 4,
          borderRadius: 3,

          "&.Mui-selected": {
            background: colours.endavour,
            color: colours.white,

            "&:hover": {
              backgroundColor: `${colours.greenVogue}!important`,
            },
          },
        },
        sizeSmall: {
          padding: "5px 10px",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: "12px",
          lineHeight: "20px",
          "&.Mui-disabled": {
            color: colours.darkSilverChalice,
            background: colours.gallery,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: colours.silverChalice,
          },
          "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
            borderColor: colours.gallery,
          },
          "&.Mui-error:not(.Mui-disabled)": {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: colours.alizarinCrimson,
            },
            "& .MuiOutlinedInput-input::placeholder": {
              color: colours.alizarinCrimson,
              opacity: 1,
            },
          },
        },
        input: {
          "&::placeholder": {
            color: colours.silver,
            opacity: 1,
          },
          "&.Mui-disabled": {
            zIndex: 1,
            color: colours.darkSilverChalice,
            webkitTextFillColor: colours.darkSilverChalice,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          display: "inline-flex",
          minHeight: "auto",
          border: `1px solid ${colours.fiord}`,

          "&.Mui-expanded": {
            minHeight: "auto",
            borderBottom: 0,
          },
          "&:before": {
            "min-height": "auto",
            "border-bottom": " 0",
            content: "''",
            position: "absolute",
            left: "18px",
            height: "calc(100% - 1rem)",
            width: "2px",
            background: colours.endavour,
          },
        },
        content: {
          margin: "auto 0",
          "&.Mui-expanded": {},
        },
        expandIconWrapper: {
          padding: "0.5rem 0",
          marginRight: "0.5rem",
          zIndex: 1,
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          border: `1px solid ${colours.fiord}`,
          padding: "1rem 1rem 1rem 1rem",
          "&:before": {
            "min-height": "auto",
            "border-bottom": " 0",
            content: "''",
            position: "absolute",
            left: "18px",
            height: "calc(100% - 2rem)",
            width: "2px",
            background: colours.endavour,
            top: "1.5rem",
          },
        },
      },
    },
    MuiCalendarPicker: {
      styleOverrides: {
        root: {
          "& .PrivatePickersSlideTransition-root": {
            minHeight: 220,
          },
        },
      },
    },
    MuiChip: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          padding: "1rem",
        },
        paperWidthSm: {
          borderRadius: 0,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: 0,
          marginBottom: "1rem",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: 0,
          marginBottom: "1rem",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
  },
  customVariables: {
    closedNavWidth: "4rem",
    navWidth: "20.75rem",
    headerHeight: "3.5rem",
    transparentDropdownHeaderHeight: "4rem",
    chatDrawerWidth: "52.5rem",
    chatDrawerWidthWithEvents: "73.3125rem",
  },
});

export default theme;
