import React from "react";
import ChristmasIcon from "assets/oms/eventICons/Christmas.svg";
import ColumbusDayIcon from "assets/oms/eventICons/US_ColumbusDay.svg";
import DaylightSavingStartIcon from "assets/oms/eventICons/US_DaylightSavingStart.svg";
import DaylightSavingEndIcon from "assets/oms/eventICons/US_DaylightSavingEnd.svg";
import EasterMondayIcon from "assets/oms/eventICons/EasterMonday.svg";
import ElectionDayIcon from "assets/oms/eventICons/US_ElectionDay.svg";
import HalloweenIcon from "assets/oms/eventICons/Halloween.svg";
import IndependenceDayIcon from "assets/oms/eventICons/US_IndependenceDay.svg";
import JuneteenthIcon from "assets/oms/eventICons/US_Juneteenth.svg";
import LaborDayIcon from "assets/oms/eventICons/US_LaborDay.svg";
import MardiGrasIcon from "assets/oms/eventICons/MardiGras.svg";
import MLKDayIcon from "assets/oms/eventICons/US_MLKDay.svg";
import MemorialDayIcon from "assets/oms/eventICons/US_MemorialDay.svg";
import MothersDayIcon from "assets/oms/eventICons/MothersDay.svg";
import NewYearIcon from "assets/oms/eventICons/NewYear.svg";
import PresidentsDayIcon from "assets/oms/eventICons/US_PresidentDay.svg";
import StPatrickDayIcon from "assets/oms/eventICons/StPatrickDay.svg";
import SuperBowlIcon from "assets/oms/eventICons/US_Superbowl.svg";
import ThanksgivingIcon from "assets/oms/eventICons/US_Thanksgiving.svg";
import ValentineIcon from "assets/oms/eventICons/Valentine.svg";
import VeteranDayIcon from "assets/oms/eventICons/VeteranDay.svg";


export const DEFAULT_EVENT_ICON_ID = "NewYear";


export const EVENT_ICON_COMPONENTS = {
  Christmas: ChristmasIcon,
  US_ColumbusDay: ColumbusDayIcon,
  US_DaylightSavingStart: DaylightSavingStartIcon,
  US_DaylightSavingEnd: DaylightSavingEndIcon,
  EasterMonday: EasterMondayIcon,
  US_ElectionDay: ElectionDayIcon,
  Halloween: HalloweenIcon,
  US_IndependenceDay: IndependenceDayIcon,
  US_Juneteenth: JuneteenthIcon,
  US_LaborDay: LaborDayIcon,
  MardiGras: MardiGrasIcon,
  US_MLKDay: MLKDayIcon,
  US_MemorialDay: MemorialDayIcon,
  MothersDay: MothersDayIcon,
  NewYear: NewYearIcon,
  US_PresidentDay: PresidentsDayIcon,
  StPatrickDay: StPatrickDayIcon,
  US_Superbowl: SuperBowlIcon,
  US_Thanksgiving: ThanksgivingIcon,
  Valentine: ValentineIcon,
  VeteranDay: VeteranDayIcon,
};

export const EVENT_ICON_VIEWBOX = {
  Christmas: "0 0 17 20",
  US_ColumbusDay: "0 0 24 24",
  US_DaylightSavingStart: "0 0 18 21",
  US_DaylightSavingEnd: "0 0 18 21",
  EasterMonday: "0 0 14 18",
  US_ElectionDay: "0 0 18 20",
  Halloween: "0 0 24 24",
  US_IndependenceDay: "0 0 16 19",
  US_Juneteenth: "0 0 21 19",
  US_LaborDay: "0 0 18 18",
  MardiGras: "0 0 24 24",
  US_MLKDay: "0 0 20 19",
  US_MemorialDay: "0 0 10 20",
  MothersDay: "0 0 22 22",
  NewYear: "0 0 20 19",
  US_PresidentDay: "0 0 20 20",
  StPatrickDay: "0 0 24 24",
  US_Superbowl: "0 0 18 18",
  US_Thanksgiving: "0 0 24 24",
  Valentine: "0 0 20 17",
  VeteranDay: "0 0 16 20",
};

export const DEFAULT_EVENT_ICON_MAP = {
  "Christmas Day": "Christmas",
  "Columbus Day": "US_ColumbusDay",
  "Daylight Saving Time Begins": "US_DaylightSavingStart",
  "Daylight Saving Time Ends": "US_DaylightSavingEnd",
  "Easter Monday": "EasterMonday",
  "Election Day": "US_ElectionDay",
  Halloween: "Halloween",
  "Independence Day": "US_IndependenceDay",
  Juneteenth: "US_Juneteenth",
  "Labor Day": "US_LaborDay",
  "Mardi Gras": "MardiGras",
  "Martin Luther King Jr. Day": "US_MLKDay",
  "Memorial Day": "US_MemorialDay",
  "Mother's Day": "MothersDay",
  "New Year's Day": "NewYear",
  "Presidents' Day": "US_PresidentDay",
  "Saint Patrick's Day": "StPatrickDay",
  "Super Bowl": "US_Superbowl",
  Thanksgiving: "US_Thanksgiving",
  "Valentine's Day": "Valentine",
  "Veterans Day": "VeteranDay",
};

export const getEventIcon = (eventName, size = 16, configMap) => {
  const iconId =
    (configMap && configMap[eventName]) ||
    DEFAULT_EVENT_ICON_MAP[eventName] ||
    DEFAULT_EVENT_ICON_ID;

  const IconComponent =
    EVENT_ICON_COMPONENTS[iconId] ||
    EVENT_ICON_COMPONENTS[DEFAULT_EVENT_ICON_ID];
  if (!IconComponent) return null;

  const viewBox =
    EVENT_ICON_VIEWBOX[iconId] || EVENT_ICON_VIEWBOX[DEFAULT_EVENT_ICON_ID];

  return <IconComponent viewBox={viewBox} width={size} height={size} />;
};
