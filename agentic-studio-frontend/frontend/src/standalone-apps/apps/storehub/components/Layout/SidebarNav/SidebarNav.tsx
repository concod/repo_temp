import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useChatStore, useNavigationStore } from "../../../store";
import "./SidebarNav.scss";
import logo from "../../../assets/ia-icon.svg";
import logoFull from "../../../../../../assets/images/ia-logo.svg";
import { useChatHistoryListStore } from "../../../store/chatHistoryListStore";
import { InfiniteScroll } from "../../../../../../components/InfiniteScroll/InfiniteScroll";
import { pspService } from "../../../services/PspStoreHubService";
import type {
  ChatHistoryGroup,
  ChatHistorySession,
} from "../../../types/chat.types";

// interface NavItem {
//   id: string;
//   label: string;
//   icon: string;
//   path: string;
// }

// const navigationItems: NavItem[] = [
//   {
//     id: "dashboard",
//     label: "Overview",
//     icon: "home",
//     path: "/apps/store-data-analyst/dashboard",
//   },
//   // {
//   //   id: "store-deep-dive",
//   //   label: "Store Deepdive",
//   //   icon: "store",
//   //   path: "/apps/store-data-analyst/store-deep-dive",
//   // },
//   {
//     id: "copilot",
//     label: "New Chat",
//     icon: "chart",
//     path: "/apps/store-data-analyst/chat",
//   },
// ];

/**
 * Determines the group label based on the date difference from today
 */
const getDateRangeLabel = (date: Date): string => {
  const now = new Date();

  // Normalize to midnight for accurate calendar day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffInMs = today.getTime() - targetDate.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays <= 7) return "Last 7 days";
  return "Older";
};

const groupChatSessions = (
  sessions: ChatHistorySession[]
): ChatHistoryGroup[] => {
  const groups: Record<string, ChatHistorySession[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  sessions.forEach((session) => {
    // Assuming last_request is an ISO string or valid date string
    const date = new Date(session.last_request);
    const label = getDateRangeLabel(date);
    groups[label].push(session);
  });

  // Explicit order for the UI
  const order = ["Today", "Yesterday", "Last 7 days", "Older"];

  return order
    .filter((label) => groups[label].length > 0)
    .map((label) => ({
      dateRange: label,
      // Sort sessions within each group by most recent first
      history: groups[label].sort(
        (a, b) =>
          new Date(b.last_request).getTime() -
          new Date(a.last_request).getTime()
      ),
    }));
};

const IconComponent: React.FC<{ iconType: string; isActive: boolean }> = ({
  iconType,
  isActive,
}) => {
  const getIconPath = () => {
    switch (iconType) {
      case "home":
        return !isActive ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M12.75 11.9881V5.5119C12.75 5.39362 12.7229 5.27697 12.6708 5.17117C12.6187 5.06538 12.5431 4.97335 12.45 4.90238L7.2 0.902381C7.07018 0.803469 6.91228 0.75 6.75 0.75C6.58772 0.75 6.42982 0.803469 6.3 0.902381L1.05 4.90238C0.956853 4.97335 0.88125 5.06538 0.82918 5.17117C0.777109 5.27697 0.75 5.39362 0.75 5.5119V11.9881C0.75 12.1902 0.829018 12.384 0.96967 12.5268C1.11032 12.6697 1.30109 12.75 1.5 12.75H4.5C4.69891 12.75 4.88968 12.6697 5.03033 12.5268C5.17098 12.384 5.25 12.1902 5.25 11.9881V9.70238C5.25 9.50031 5.32902 9.30652 5.46967 9.16363C5.61032 9.02075 5.80109 8.94048 6 8.94048H7.5C7.69891 8.94048 7.88968 9.02075 8.03033 9.16363C8.17098 9.30652 8.25 9.50031 8.25 9.70238V11.9881C8.25 12.1902 8.32902 12.384 8.46967 12.5268C8.61032 12.6697 8.80109 12.75 9 12.75H12C12.1989 12.75 12.3897 12.6697 12.5303 12.5268C12.671 12.384 12.75 12.1902 12.75 11.9881Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M12 11.2381V4.7619C12 4.64362 11.9729 4.52697 11.9208 4.42117C11.8687 4.31538 11.7931 4.22335 11.7 4.15238L6.45 0.152381C6.32018 0.0534687 6.16228 0 6 0C5.83772 0 5.67982 0.0534687 5.55 0.152381L0.3 4.15238C0.206853 4.22335 0.13125 4.31538 0.0791795 4.42117C0.0271087 4.52697 0 4.64362 0 4.7619V11.2381C0 11.4402 0.0790178 11.634 0.21967 11.7768C0.360322 11.9197 0.551088 12 0.75 12H3.75C3.94891 12 4.13968 11.9197 4.28033 11.7768C4.42098 11.634 4.5 11.4402 4.5 11.2381V8.95238C4.5 8.75031 4.57902 8.55652 4.71967 8.41363C4.86032 8.27075 5.05109 8.19048 5.25 8.19048H6.75C6.94891 8.19048 7.13968 8.27075 7.28033 8.41363C7.42098 8.55652 7.5 8.75031 7.5 8.95238V11.2381C7.5 11.4402 7.57902 11.634 7.71967 11.7768C7.86032 11.9197 8.05109 12 8.25 12H11.25C11.4489 12 11.6397 11.9197 11.7803 11.7768C11.921 11.634 12 11.4402 12 11.2381Z"
              fill="#4259EE"
            />
          </svg>
        );

      case "chart":
        return !isActive ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V8"
              stroke="#4259EE"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12.25 1.74991C12.5152 1.48469 12.8749 1.33569 13.25 1.33569C13.6251 1.33569 13.9848 1.48469 14.25 1.74991C14.5152 2.01512 14.6642 2.37483 14.6642 2.74991C14.6642 3.12498 14.5152 3.48469 14.25 3.74991L8.24132 9.75924C8.08302 9.9174 7.88746 10.0332 7.67266 10.0959L5.75732 10.6559C5.69996 10.6726 5.63915 10.6736 5.58126 10.6588C5.52338 10.644 5.47054 10.6139 5.42829 10.5716C5.38604 10.5294 5.35592 10.4765 5.34109 10.4186C5.32626 10.3607 5.32726 10.2999 5.34399 10.2426L5.90399 8.32724C5.96701 8.11261 6.08301 7.91728 6.24132 7.75924L12.25 1.74991Z"
              stroke="#4259EE"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V8"
              stroke="#4259EE"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12.25 1.74991C12.5152 1.48469 12.8749 1.33569 13.25 1.33569C13.6251 1.33569 13.9848 1.48469 14.25 1.74991C14.5152 2.01512 14.6642 2.37483 14.6642 2.74991C14.6642 3.12498 14.5152 3.48469 14.25 3.74991L8.24136 9.75924C8.08305 9.9174 7.88749 10.0332 7.67269 10.0959L5.75735 10.6559C5.69999 10.6726 5.63918 10.6736 5.58129 10.6588C5.52341 10.644 5.47057 10.6139 5.42832 10.5716C5.38607 10.5294 5.35595 10.4765 5.34112 10.4186C5.32629 10.3607 5.32729 10.2999 5.34402 10.2426L5.90402 8.32724C5.96704 8.11261 6.08304 7.91728 6.24136 7.75924L12.25 1.74991Z"
              fill="#4259EE"
              stroke="#4259EE"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        );
      case "store":
        return !isActive ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M10.6719 7.67969C10.3598 7.99176 9.95147 8.16699 9.53223 8.16699C9.0702 8.16696 8.65953 7.98294 8.35352 7.6875L8.00293 7.34863L7.65527 7.69043C7.35346 7.98696 6.9557 8.16699 6.51855 8.16699C6.04711 8.16687 5.64077 7.98737 5.33301 7.67969L4.97559 7.32324L4.62207 7.68262C4.32372 7.98607 3.9233 8.16699 3.48535 8.16699C3.49975 8.16699 3.50682 8.16862 3.49121 8.16602C3.4875 8.1654 3.4834 8.16412 3.47754 8.16309C3.47213 8.16213 3.46373 8.16148 3.45605 8.16016C3.44026 8.15744 3.41887 8.15344 3.39453 8.15039L2.83203 8.08008V13.167H13.1719V8.08008L12.6104 8.15039C12.586 8.15343 12.5646 8.15744 12.5488 8.16016C12.5412 8.16148 12.5328 8.16213 12.5273 8.16309C12.5215 8.16412 12.5174 8.1654 12.5137 8.16602C12.4982 8.16859 12.5045 8.16703 12.5186 8.16699C12.0807 8.16686 11.6801 7.98602 11.3818 7.68262L11.0283 7.32324L10.6719 7.67969ZM2.87891 3.2207L2.20605 6.12402C2.10873 6.53279 2.18883 6.97074 2.45996 7.31152V7.3125C2.46705 7.32232 2.47536 7.33242 2.4834 7.34277V7.3418C2.63872 7.54205 2.971 7.83288 3.48535 7.83301C4.17195 7.83301 4.70824 7.2903 4.78906 6.63477V6.63281L5.17578 3.39258L5.24219 2.83301H2.96875L2.87891 3.2207ZM5.5293 3.27246L5.16309 6.28613L5.16211 6.2959C5.12189 6.68852 5.24094 7.0862 5.5 7.38672L5.50586 7.39258L5.51172 7.39941C5.75422 7.66203 6.08959 7.83301 6.47266 7.83301C7.25698 7.83285 7.83203 7.20077 7.83203 6.45996V2.83301H5.58301L5.5293 3.27246ZM8.16602 6.45996C8.16602 7.18214 8.7239 7.83301 9.47949 7.83301C9.88548 7.83289 10.2437 7.67873 10.4941 7.38281L10.4932 7.38184C10.7572 7.08105 10.8778 6.68315 10.8281 6.28711H10.8291L10.4688 3.27441L10.416 2.83301H8.16602V6.45996ZM12.6035 2.82715L11.3164 2.83301L10.7559 2.83594L10.8223 3.39258L11.209 6.63184C11.2831 7.29789 11.8337 7.83301 12.5127 7.83301C13.0637 7.83288 13.3926 7.50698 13.5332 7.32617C13.8022 6.98305 13.8927 6.54708 13.792 6.12402V6.12305L13.0918 3.20996L12.999 2.82422L12.6035 2.82715ZM2.49902 7.84766L2.37109 7.70508C2.34492 7.676 2.31921 7.65144 2.29883 7.63184C2.28288 7.6165 2.25517 7.5907 2.24707 7.58301C2.22622 7.56322 2.21868 7.55487 2.2168 7.55273L2.21191 7.5459L2.20605 7.53906L2.09277 7.375C1.85027 6.98037 1.77537 6.51009 1.88574 6.04102L1.88477 6.04004L2.58496 3.12988L2.58594 3.12793C2.67367 2.75667 3.00144 2.50022 3.36523 2.5H12.626C12.9966 2.50013 13.3198 2.75054 13.4131 3.13184L14.1133 6.04395V6.0459C14.2427 6.57431 14.1252 7.11504 13.7949 7.54102C13.7902 7.5469 13.7791 7.56023 13.751 7.58691C13.7324 7.6045 13.6808 7.65127 13.6455 7.68652L13.499 7.83301V12.667C13.4988 13.1239 13.123 13.4998 12.666 13.5H3.33203C2.8751 13.4998 2.4992 13.1239 2.49902 12.667V7.84766Z"
              stroke="currentColor"
              fill="none"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M2.88672 3.18945L2.21387 5.42969L2.20605 5.45703C2.12041 5.81567 2.19025 6.22475 2.39062 6.5498C2.60134 6.89141 2.97632 7.16682 3.48535 7.16699C4.16727 7.16699 4.7007 6.63097 4.78711 5.98145L5.17383 3.40723L5.25977 2.83301H2.99414L2.88672 3.18945ZM5.53223 3.25586L5.16504 5.60254L5.16309 5.61621L5.16211 5.62891C5.08398 6.39069 5.62553 7.16699 6.47266 7.16699C7.25705 7.1669 7.83203 6.53381 7.83203 5.79297V2.83301H5.59766L5.53223 3.25586ZM8.16602 5.79297C8.16602 6.51514 8.7239 7.16699 9.47949 7.16699C10.4311 7.16679 10.9193 6.32907 10.8291 5.61719L10.8271 5.60449L10.4668 3.25781L10.4014 2.83301H8.16602V5.79297ZM12.6035 2.82715L11.3164 2.83301L10.7393 2.83594L10.8242 3.40723L11.2109 5.98145L11.2119 5.98047C11.2928 6.63935 11.8389 7.16699 12.5127 7.16699C13.0238 7.16692 13.3994 6.8929 13.6104 6.54883C13.8106 6.22224 13.8771 5.81346 13.792 5.45703L13.7881 5.44043L13.7832 5.4248L13.083 3.17773L12.9736 2.8252L12.6035 2.82715ZM2.49902 7.19238L2.38281 7.05371C2.3087 6.96478 1.65286 6.4091 1.88281 5.38965L2.57617 3.16211L2.58203 3.14551L2.58594 3.12793C2.6737 2.7565 3.00223 2.5 3.36621 2.5H12.626C12.9966 2.50007 13.3197 2.75051 13.4131 3.13184L13.417 3.14746L13.4219 3.16211L14.1152 5.38965C14.2128 5.78823 14.2248 6.44015 13.6455 7.01953L13.499 7.16602V12.667C13.4988 13.124 13.123 13.4999 12.666 13.5H3.33203C2.87515 13.4997 2.4992 13.1239 2.49902 12.667V7.19238Z"
              fill="#4259EE"
              stroke="#4259EE"
            />
          </svg>
        );
      case "help":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M6 10.6667H7.33333V9.33333H6V10.6667ZM6.66667 0C2.98667 0 0 2.98667 0 6.66667C0 10.3467 2.98667 13.3333 6.66667 13.3333C10.3467 13.3333 13.3333 10.3467 13.3333 6.66667C13.3333 2.98667 10.3467 0 6.66667 0ZM6.66667 12C3.72667 12 1.33333 9.60667 1.33333 6.66667C1.33333 3.72667 3.72667 1.33333 6.66667 1.33333C9.60667 1.33333 12 3.72667 12 6.66667C12 9.60667 9.60667 12 6.66667 12ZM6.66667 2.66667C5.19333 2.66667 4 3.86 4 5.33333H5.33333C5.33333 4.6 5.93333 4 6.66667 4C7.4 4 8 4.6 8 5.33333C8 6.66667 6 6.5 6 8.66667H7.33333C7.33333 7.16667 9.33333 7 9.33333 5.33333C9.33333 3.86 8.14 2.66667 6.66667 2.66667Z"
              fill="currentColor"
            />
          </svg>
        );
      case "left-arrow":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <rect width="16" height="16" rx="8" fill="#F5F6FA" />
            <path
              d="M5.72292 11.8419C5.61207 11.7365 5.55664 11.6117 5.55664 11.4675C5.55664 11.3236 5.61207 11.1989 5.72292 11.0935L8.97096 8.00527L5.71184 4.90646C5.60837 4.80808 5.55664 4.68511 5.55664 4.53755C5.55664 4.38999 5.61207 4.2635 5.72292 4.1581C5.83378 4.0527 5.96503 4 6.11668 4C6.26803 4 6.39913 4.0527 6.50999 4.1581L10.2347 7.71015C10.279 7.75231 10.3105 7.79798 10.3291 7.84717C10.3475 7.89635 10.3566 7.94906 10.3566 8.00527C10.3566 8.06148 10.3475 8.11419 10.3291 8.16337C10.3105 8.21256 10.279 8.25823 10.2347 8.30039L6.4989 11.8524C6.39544 11.9508 6.26803 12 6.11668 12C5.96503 12 5.83378 11.9473 5.72292 11.8419Z"
              fill="currentColor"
            />
          </svg>
        );
      case "right-arrow":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <rect
              x="16"
              y="16"
              width="16"
              height="16"
              rx="8"
              transform="rotate(-180 16 16)"
              fill="#F5F6FA"
            />
            <path
              d="M10.2771 4.1581C10.3879 4.26351 10.4434 4.3883 10.4434 4.53249C10.4434 4.6764 10.3879 4.80106 10.2771 4.90646L7.02904 7.99473L10.2882 11.0935C10.3916 11.1919 10.4434 11.3149 10.4434 11.4625C10.4434 11.61 10.3879 11.7365 10.2771 11.8419C10.1662 11.9473 10.035 12 9.88332 12C9.73197 12 9.60087 11.9473 9.49001 11.8419L5.7653 8.28985C5.72096 8.24769 5.68948 8.20202 5.67085 8.15283C5.65252 8.10365 5.64336 8.05094 5.64336 7.99473C5.64336 7.93852 5.65252 7.88581 5.67085 7.83663C5.68948 7.78744 5.72096 7.74177 5.7653 7.69961L9.5011 4.14756C9.60456 4.04919 9.73197 4 9.88332 4C10.035 4 10.1662 4.0527 10.2771 4.1581Z"
              fill="currentColor"
            />
          </svg>
        );

      case "logout":
        return !isActive ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="12"
            viewBox="0 0 14 12"
            fill="none"
          >
            <path
              d="M10 2.66667L9.06 3.60667L10.78 5.33333H4V6.66667H10.78L9.06 8.38667L10 9.33333L13.3333 6L10 2.66667ZM1.33333 1.33333H6.66667V0H1.33333C0.6 0 0 0.6 0 1.33333V10.6667C0 11.4 0.6 12 1.33333 12H6.66667V10.6667H1.33333V1.33333Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="12"
            viewBox="0 0 14 12"
            fill="none"
          >
            <path
              d="M10 2.66667L9.06 3.60667L10.78 5.33333H4V6.66667H10.78L9.06 8.38667L10 9.33333L13.3333 6L10 2.66667ZM1.33333 1.33333H6.66667V0H1.33333C0.6 0 0 0.6 0 1.33333V10.6667C0 11.4 0.6 12 1.33333 12H6.66667V10.6667H1.33333V1.33333Z"
              fill="#1C5436"
            />
          </svg>
        );
    }
  };

  return getIconPath();
};

export const SidebarNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActivePage } = useNavigationStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const { clearMessages } = useChatStore();

  const {
    data: historyList,
    fetchNext: fetchHistoryList,
    isLoading,
    isFetchingNext,
    error,
    refetch: refetchHistory,
  } = useChatHistoryListStore();

  const historyListGrouped = groupChatSessions(historyList);

  useEffect(() => {
    fetchHistoryList();
  }, [fetchHistoryList]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const handleResetChat = () => {
    clearMessages();
    pspService.clearSessionId();
    refetchHistory();
  };

  return (
    <aside className="sidebar-container">
      <nav
        className={`sidebar-nav ${isExpanded ? "sidebar-nav--expanded" : ""}`}
      >
        {/* Logo Section */}
        <div className="sidebar-nav__logo">
          <img src={isExpanded ? logoFull : logo} alt="logo" />
          {isExpanded && <div>Store Data Analyst</div>}
        </div>

        {/* Navigation Items */}
        <div className="sidebar-nav__items">
          <div
            className={`sidebar-nav__item ${
              isActive("/apps/store-data-analyst/dashboard")
                ? "sidebar-nav__item--active"
                : ""
            }`}
            onClick={() => {
              navigate("/apps/store-data-analyst/dashboard");
              setActivePage("dashboard");
            }}
            title={"Overview"}
          >
            <IconComponent
              iconType={"home"}
              isActive={isActive("/apps/store-data-analyst/dashboard")}
            />

            {isExpanded && (
              <span className="sidebar-nav__item-label">Overview</span>
            )}
          </div>
          <div
            className={`sidebar-nav__item ${
              isActive("/apps/store-data-analyst/chat")
                ? "sidebar-nav__item--active"
                : ""
            }`}
            onClick={() => {
              navigate("/apps/store-data-analyst/chat");
              setActivePage("copilot");
              handleResetChat();
            }}
            title={"New Chat"}
          >
            <IconComponent
              iconType={"chart"}
              isActive={isActive("/apps/store-data-analyst/chat")}
            />

            {isExpanded && (
              <span className="sidebar-nav__item-label">New Chat</span>
            )}
          </div>
        </div>
        <div className="history">
          {!isLoading && !error && historyList && historyList.length > 0 && (
            <>
              <p className="title">History</p>
              <div className="list">
                <ul className="list__menu">
                  <InfiniteScroll
                    isLoading={isFetchingNext}
                    onPageEnd={fetchHistoryList}
                    list={historyListGrouped.map((group) => (
                      <React.Fragment key={group.dateRange}>
                        <div className="menu-group">{group.dateRange}</div>
                        {group.history.map((history) => (
                          <li key={history.session_id}>
                            <NavLink
                              to={`/apps/store-data-analyst/chat/${history.session_id}/${history.session_title}`}
                              // onClick={closeSidebar}
                            >
                              <span className="menu-text">
                                {history.session_title}
                              </span>
                            </NavLink>
                          </li>
                        ))}
                      </React.Fragment>
                    ))}
                  />
                </ul>
              </div>
            </>
          )}
        </div>
        {/* Toggle Button */}
        <div className="sidebar-nav__toggle" onClick={toggleSidebar}>
          <IconComponent
            iconType={isExpanded ? "right-arrow" : "left-arrow"}
            isActive={false}
          />
        </div>
      </nav>
    </aside>
  );
};

export const SidebarNavMobile = ({
  isSidebarOpen,
  closeSidebar,
}: {
  isSidebarOpen: boolean;
  closeSidebar: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActivePage } = useNavigationStore();
  const {
    data: historyList,
    fetchNext: fetchHistoryList,
    isLoading,
    isFetchingNext,
    error,
    refetch: refetchHistory,
  } = useChatHistoryListStore();
  const { clearMessages } = useChatStore();

  const historyListGrouped = groupChatSessions(historyList);

  useEffect(() => {
    fetchHistoryList();
  }, [fetchHistoryList]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleResetChat = () => {
    clearMessages();
    pspService.clearSessionId();
    refetchHistory();
  };

  return (
    <>
      {/* Sidebar Overlay */}
      <div
        className={`mobile-sidebar-overlay ${isSidebarOpen ? "show" : ""}`}
        onClick={closeSidebar}
      />
      {/* Mobile sidebar */}
      <aside className={`mobile-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <nav className={`sidebar-nav sidebar-nav--expanded"}`}>
          {/* Logo Section */}
          <div className="sidebar-nav__logo">
            <img src={logoFull} alt="logo" />
            <div>Store Data Analyst</div>
          </div>

          {/* Navigation Items */}
          <div className="sidebar-nav__items">
            <div
              className={`sidebar-nav__item ${
                isActive("/apps/store-data-analyst/dashboard")
                  ? "sidebar-nav__item--active"
                  : ""
              }`}
              onClick={() => {
                navigate("/apps/store-data-analyst/dashboard");
                setActivePage("dashboard");
                closeSidebar();
              }}
              title={"Overview"}
            >
              <IconComponent
                iconType={"home"}
                isActive={isActive("/apps/store-data-analyst/dashboard")}
              />

              <span className="sidebar-nav__item-label">Overview</span>
            </div>
            <div
              className={`sidebar-nav__item ${
                isActive("/apps/store-data-analyst/chat")
                  ? "sidebar-nav__item--active"
                  : ""
              }`}
              onClick={() => {
                navigate("/apps/store-data-analyst/chat");
                setActivePage("copilot");
                closeSidebar();
                handleResetChat();
              }}
              title={"New Chat"}
            >
              <IconComponent
                iconType={"chart"}
                isActive={isActive("/apps/store-data-analyst/chat")}
              />

              <span className="sidebar-nav__item-label">New Chat</span>
            </div>
          </div>
          <div className="history">
            {!isLoading && !error && historyList && historyList.length > 0 && (
              <>
                <p className="title">History</p>
                <div className="list">
                  <ul className="list__menu">
                    <InfiniteScroll
                      isLoading={isFetchingNext}
                      onPageEnd={fetchHistoryList}
                      list={historyListGrouped.map((group) => (
                        <React.Fragment key={group.dateRange}>
                          <div className="menu-group">{group.dateRange}</div>
                          {group.history.map((history) => (
                            <li key={history.session_id}>
                              <NavLink
                                to={`/apps/store-data-analyst/chat/${history.session_id}/${history.session_title}`}
                                onClick={closeSidebar}
                              >
                                <span className="menu-text">
                                  {history.session_title}
                                </span>
                              </NavLink>
                            </li>
                          ))}
                        </React.Fragment>
                      ))}
                    />
                  </ul>
                </div>
              </>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
};
