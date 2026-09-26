export const ACCESS_LEVELS = [
  { value: "full", label: "Full Access" },
  { value: "view", label: "View Only" },
  { value: "none", label: "No Access" },
];

export const ROLE_COLORS = {
  superuser: { bg: "#FEF9C3", color: "#A16207", icon: "S", gradient: "linear-gradient(90deg, #FFFBF4 0%, #FFF 100%)" },
  allocator: { bg: "#EDE9FE", color: "#7C3AED", icon: "A", gradient: "linear-gradient(90deg, #F5F3FF 0%, #FFF 100%)" },
  admin:     { bg: "#DBEAFE", color: "#1D4ED8", icon: "Ad", gradient: "linear-gradient(90deg, #EFF6FF 0%, #FFF 100%)" },
  viewonly:  { bg: "#DCFCE7", color: "#15803D", icon: "V", gradient: "linear-gradient(90deg, #F0FDF4 0%, #FFF 100%)" },
  limited:   { bg: "#F0ABFC", color: "#86198F", icon: "L", gradient: "linear-gradient(90deg, #FDF4FF 0%, #FFF 100%)" },
  default:   { bg: "#E0E7FF", color: "#4338CA", icon: "R", gradient: "linear-gradient(90deg, #EEF2FF 0%, #FFF 100%)" },
};

