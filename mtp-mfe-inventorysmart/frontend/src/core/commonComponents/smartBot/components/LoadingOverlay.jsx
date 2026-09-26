import { CircularProgress, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles((theme) => ({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1300,
  },
  loadingContainer: {
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    padding: theme.spacing(3),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  progress: {
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(2)
  },
  message: {
    color: theme.palette.text.primary,
    fontFamily: 'Manrope',
    fontSize: '16px',
    fontWeight: 500
  }
}));

const LoadingOverlay = () => {
  const classes = useStyles();

  return (
    <div className={classes.overlay}>
      <div className={classes.loadingContainer}>
        <CircularProgress className={classes.progress} size={40} />
        <Typography className={classes.message}>
          Saving Chat...
        </Typography>
      </div>
    </div>
  );
};

export default LoadingOverlay; 