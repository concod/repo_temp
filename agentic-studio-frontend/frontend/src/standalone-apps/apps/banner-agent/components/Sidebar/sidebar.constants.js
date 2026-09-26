import homeIcon from "../../assets/sidebar-icons/home.svg";
import homeSelectedIcon from "../../assets/sidebar-icons/home-selected.svg";
import brandIcon from "../../assets/sidebar-icons/brand.svg";
import brandSelectedIcon from "../../assets/sidebar-icons/brand-selected.svg";
import assetsIcon from "../../assets/sidebar-icons/assets.svg";
import assetsSelectedIcon from "../../assets/sidebar-icons/assets-selected.svg";
import projectsIcon from "../../assets/sidebar-icons/projects.svg";
import projectsSelectedIcon from "../../assets/sidebar-icons/projects-selected.svg";

export const SIDEBAR_NAV_ITEMS = [
    {
        key: "home",
        label: "Home",
        route: "../home",
        icon: homeIcon,
        iconSelected: homeSelectedIcon,
    },
    {
        key: "brand",
        label: "Brand",
        route: null,
        icon: brandIcon,
        iconSelected: brandSelectedIcon,
    },
    {
        key: "assets",
        label: "Assets",
        route: "../assets",
        icon: assetsIcon,
        iconSelected: assetsSelectedIcon,
    },
    {
        key: "projects",
        label: "Projects",
        route: null,
        icon: projectsIcon,
        iconSelected: projectsSelectedIcon,
    },
];
