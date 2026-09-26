import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ArrowCircleRightOutlinedIcon from '@mui/icons-material/ArrowCircleRightOutlined';
import { useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'white', 
    padding: theme.spacing(2),
  },
  configuratorBox: {
    padding: theme.spacing(4),
    backgroundColor: '#f8fbff',
    borderRadius: theme.spacing(1), 
    boxShadow: theme.shadows[3],
    width: '100%',
    maxWidth: '1200px', 
    margin: '0 auto', 
  },
  configuratorHeader: {
    marginBottom: theme.spacing(2),
    textAlign: 'center', 
  },
  descriptionContainer: {
    display: 'flex',
    justifyContent: 'center',
    textAlign: 'justify', 
    textAlignLast: 'center', 
    maxWidth: '1000px',
    width: "70%",
    margin: '0 auto',
  },
  paper: {
    padding: theme.spacing(3),
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    height: '100%',
    backgroundColor: '#fff', 
    borderRadius: theme.spacing(1), 
    position: 'relative',
    paddingTop: "0px"
  },
  icon: {
    fontSize: '3rem',
    marginRight: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  arrow: {
    fontSize: '2rem',
    color: theme.palette.primary.main,
    alignSelf: 'flex-end', 
    marginTop: '6rem',
  },
  contentBox: {
    flexGrow: 1,
  },
}));

const AssortLandingPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();

  return (
    <Box className={classes.root}>
      <Box className={classes.configuratorBox}>
        <Typography variant="h2" className={classes.configuratorHeader}>
          Configurator
        </Typography>
        <Box className={classes.descriptionContainer}>
          <Typography variant="body1">
            Simplify client implementation with our configurator, enabling seamless customization of modules, KPIs, and strategic parameters to achieve diverse financial planning goals.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: "#0055AF", marginTop: "3rem" }}>
          Click here to know more about how to use
        </Typography>
        <Grid container spacing={4} justifyContent="center" mt={3}>
          <Grid item xs={12} sm={6}>
            <Paper className={classes.paper} elevation={2}>
              <InfoOutlinedIcon className={classes.icon} />
              <Box className={classes.contentBox}>
                <Typography variant="h6">
                  Assort Smart Configurator
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Streamline the process of defining and managing modules, KPIs, roll-up strategies, distribution methodologies, and time specifications.
                </Typography>
              </Box>
              <ArrowCircleRightOutlinedIcon className={classes.arrow} onClick = {()=>navigate('/configurator/assortsmart/module-configurator')} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper className={classes.paper} elevation={2}>
              <PlaceOutlinedIcon className={classes.icon} />
              <Box className={classes.contentBox}>
                <Typography variant="h6">
                  Location Planning
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Configure product planning about a Country, its languages, states/provinces, and authorities.
                </Typography>
              </Box>
              <ArrowCircleRightOutlinedIcon className={classes.arrow} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AssortLandingPage;
