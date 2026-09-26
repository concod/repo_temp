import globalStyles from "core/Styles/globalStyles";
import CloseMenuIcon from "assets/close_menu.svg";
import DoneIcon from "assets/done_icon.svg";
import NotDoneIcon from "assets/not_done_icon.svg";
import OpenMenuIcon from "assets/open_menu.svg";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  ActionButton,
  PanelMenuItem,
  SubMenu,
  useStyles,
} from "./styles-workflow-panel";
import { isEmpty } from "lodash";

const WorkflowPanel = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [menuItems, setMenuItems] = useState([]);
  const [panelTitle, setPanelTitle] = useState("");
  const {
    workflowPanelData,
    actionsButtons,
    children,
    filterConfigProps,
    setFilterConfigProps,
    setMenuIndex,
    setSubMenuIndex,
  } = props;

  /**
   * getMenuItems will set the data for
   * side panel
   */
  const getMenuItems = async () => {
    try {
      let menuData = [...workflowPanelData];
      menuData?.forEach((section, index) => {
        section.isCompleted = false;
        section.isOpen = false;
        section?.sub_sections?.forEach((sub_section, subItemIndex) => {
          sub_section.isCompleted = false;
          sub_section.isOpen = false;
        });
      });
      menuData[0].isOpen = true;
      if (!isEmpty(menuData[0].sub_sections)) {
        menuData[0].sub_sections[0].isOpen = true;
      }
      setMenuIndex(0);
      setSubMenuIndex(0);
      setMenuItems(menuData);
    } catch (error) {
      console.error("setMenuItems error", error);
    }
  };

  /**
   * onChangeMenu will be called whenever
   * the menu is clicked in the side panel
   * @param {object} e is click event
   * @param {number} index is the index of the menu
   */
  const onChangeMenu = (e, index) => {
    try {
      let menuData = [...menuItems];
      if (menuData[index].isOpen === true) {
        menuData[index].isOpen = false;
      } else {
        menuData.forEach((item) => {
          item.isOpen = false;
          item?.sub_sections?.forEach((subItem) => (subItem.isOpen = false));
        });
        menuData[index].isOpen = true;
        if (!isEmpty(menuData[index].sub_sections)) {
          menuData[index].sub_sections[0].isOpen = true;
          setFilterConfigProps(menuData[index].sub_sections[0]);
          setSubMenuIndex(0);
        } else {
          setFilterConfigProps(menuData[index]);
        }
        setMenuIndex(index);
      }
      setMenuItems(menuData);
    } catch (error) {
      console.error("onChangeMenu error", error);
    }
  };

  /**
   * onChangeSubMenu will be called whenever
   * the submenu is clicked in the side panel
   * @param {object} event is click event
   * @param {object} subSectionData is the subMenu Data which will be set
   * to filterConfigProps
   * @param {number} index is the index of menu item
   * @param {number} subSectionIndex is the index of the submenu item
   */
  const onChangeSubMenu = (event, subSectionData, index, subSectionIndex) => {
    try {
      let menuData = [...menuItems];
      menuData.forEach((item) => {
        item?.sub_sections?.forEach((subItem) => (subItem.isOpen = false));
      });
      menuData[index].sub_sections[subSectionIndex].isOpen = true;
      setMenuItems(menuData);
      setPanelTitle(subSectionData?.title);
      setFilterConfigProps(subSectionData);
      setMenuIndex(index);
      setSubMenuIndex(subSectionIndex);
      event.stopPropagation();
    } catch (error) {
      console.error("onChangeSubMenu error", error);
    }
  };

  /**
   * In the below useEffect we call
   * getMenuItems() initially only
   * when menuItems are empty or else
   * we just modify the existing menuItems
   */
  useEffect(() => {
    if (isEmpty(menuItems) && !isEmpty(workflowPanelData)) {
      getMenuItems();
    } else {
      let menuData = [...workflowPanelData];
      setMenuItems(menuData);
    }
  }, [workflowPanelData]);

  useEffect(() => {
    if (!isEmpty(filterConfigProps)) {
      setPanelTitle(filterConfigProps?.title);
    }
  }, [filterConfigProps]);

  return (
    <div className={classes.workflowContainer}>
      <div className={classes.workflowInnerContainer}>
        <div className={classes.containerHeader}>
          <p className={classes.containerHeaderText}>Workflows</p>
        </div>
        <div className={classes.containerBody}>
          {menuItems?.map((item, index) => (
            <div>
              <PanelMenuItem
                className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
                onClick={(e) => onChangeMenu(e, index)}
                id="menu"
                marginBottom={
                  item.isOpen
                    ? item?.sub_sections?.length * 27 + 27 + "px"
                    : "27px"
                }
              >
                <div className={classes.menuOpenCloseIcon}>
                  {item.isOpen ? <CloseMenuIcon /> : <OpenMenuIcon />}
                </div>
                <p
                  className={`${
                    item.isOpen
                      ? classes.menuNameText
                      : classes.menuNameTextWhenClosed
                  }`}
                >
                  {item.title}
                </p>
                <div className={classes.doneIcon}>
                  {item.isCompleted ? <DoneIcon /> : <NotDoneIcon />}
                </div>
                {(index !== menuItems?.length - 1 ||
                  (item?.isOpen && item?.sub_sections?.length > 0)) && (
                  <div
                    className={`${classes.verticalLines} verticalLine`}
                  ></div>
                )}
                {item.isOpen && (
                  <div className={classes.subMenuContainer}>
                    {item?.sub_sections?.map((subSection, subSectionIndex) => (
                      <SubMenu
                        itemName={subSection?.title}
                        id="subMenu"
                        onClick={(e) =>
                          onChangeSubMenu(e, subSection, index, subSectionIndex)
                        }
                        isOpen={subSection.isOpen}
                        lastChildBorderLeftNone={
                          index === menuItems?.length - 1 &&
                          subSectionIndex === item?.sub_sections?.length - 1
                        }
                      ></SubMenu>
                    ))}
                  </div>
                )}
              </PanelMenuItem>
            </div>
          ))}
        </div>
      </div>
      <div
        className={`${classes.workflowInnerContainer} ${globalClasses.flexRow} ${globalClasses.flexColumn}`}
      >
        <div className={classes.rightContainerHeader}>
          <p className={classes.containerHeaderText}>{panelTitle}</p>
        </div>
        {children}
        <div
          className={`${classes.rightContainerFooter} ${classes.workflowActionContainer} ${globalClasses.layoutAlignEnd}`}
        >
          <div className={`${globalClasses.flexRow} ${classes.gap20}`}>
            {actionsButtons.map((button) => (
              <ActionButton
                onClick={button.onClick}
                variant={button.variant}
                display={filterConfigProps?.buttonsToBeRendered?.includes(
                  button.name
                )}
              >
                {button.name}
              </ActionButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({});
const mapActionsToProps = {};

export default connect(mapStateToProps, mapActionsToProps)(WorkflowPanel);
