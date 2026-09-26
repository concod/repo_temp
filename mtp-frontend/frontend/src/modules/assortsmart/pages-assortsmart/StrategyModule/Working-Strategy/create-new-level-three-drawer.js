import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { Close } from "@mui/icons-material";
import clsx from "clsx";
import CreateNewLevelThreeComponent from "../../Plan/Plan-Initial/create-new-level-three-component";

const useStyles = makeStyles((theme) => ({
    drawer: {
        width: theme.customVariables.commentDrawerWidth,
        flexShrink: 0,
        whiteSpace: "nowrap",
        backgroundColor: theme.palette.common.white,
        transition: "width 300ms ease-out",
    },
    drawerOpen: {
        width: "800px",
        zIndex: "10000"
    },
    drawerClose: {
        width: theme.customVariables.commentDrawerWidth,
    },
    closeIcon: {
        padding: "0.6rem",
        cursor: "pointer",
        display: "flex",
        justifyContent: "flex-end"
    },
    wrapper: {
        padding: "0 0.6rem",
    },
}));

const CreateNewLevelThreeDrawer = (props) => {
    const classes = useStyles();
    const globalClasses = globalStyles();
    return (
        <div className={globalClasses.flexRow}>
            <Drawer
                variant="permanent"
                anchor="right"
                className={clsx(classes.drawer, {
                    [classes.drawerOpen]: props.isActive,
                    [classes.drawerClose]: !props.isActive,
                })}
                classes={{
                    paper: clsx(
                        {
                            [classes.drawerOpen]: props.isActive,
                            [classes.drawerClose]: !props.isActive,
                        },
                        classes.drawer
                    ),
                }}
            >
                <div
                    className={classes.closeIcon}
                    onClick={() => props.setIsActive(false)}
                >
                    <Close />
                </div>
                <div className={classes.wrapper}>
                    {props.isActive && <CreateNewLevelThreeComponent {...props} />}
                </div>
            </Drawer>
        </div>
    );
};

const mapStateToProps = (store) => {
    return {
    };
};

const mapDispatchToProps = (dispatch) => ({
});
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withRouter(CreateNewLevelThreeDrawer));
