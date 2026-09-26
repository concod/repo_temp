import {
  AttachMoneyOutlined,
  ShoppingCartOutlined,
  ListAltOutlined,
} from "@mui/icons-material";
import colours from "core/Styles/colours";

export const CARD_CONFIG = {
  status: {
    icon: ListAltOutlined,
    title: "Order Status",
    iconClass: "iconContainerStatus",
  },
  quantity: {
    icon: ShoppingCartOutlined,
    title: "Order Quantity",
    iconClass: "iconContainerQuantity",
  },
  cost: {
    icon: AttachMoneyOutlined,
    title: "Order Cost",
    iconClass: "iconContainerCost",
  },
};

export const LABEL_CONFIG = {
  approved: {
    borderColor: colours.oldLavender,
    gradient: {
      linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
      stops: [
        [0, "#F0EBEE"],
        [1, "#C4B1BF"],
      ],
    },
  },
  review: {
    borderColor: colours.skyBlue,
    gradient: {
      linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
      stops: [
        [0, "#E9F7FC"],
        [1, "#A2E1F1"],
      ],
    },
  },
  pending: {
    borderColor: colours.eastSide,
    gradient: {
      linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
      stops: [
        [0, "#F4F1F9"],
        [1, "#D6CBE6"],
      ],
    },
  },
};
