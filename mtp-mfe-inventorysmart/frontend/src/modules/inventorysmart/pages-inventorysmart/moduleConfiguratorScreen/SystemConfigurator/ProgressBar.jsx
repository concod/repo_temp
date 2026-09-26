import { styled } from "@mui/material/styles";
import LinearProgress, {
  linearProgressClasses,
} from "@mui/material/LinearProgress";
import { Box } from "@mui/material";

const BorderLinearProgress = styled(LinearProgress)(({ theme, value, gradientBackground }) => ({
  height: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: "transparent",
  },
  [`& .${linearProgressClasses.bar}`]: {
    background: gradientBackground || (value === 2.5 ? "#FAA0A0" : "#98FB98"),
  },
}));

const ProgressBar = ({ percentage, gradientBackground, style }) => {
  const numPercentage = Number(percentage) || 0;
  return (
    <Box sx={{ width: "100%", ...style }}>
      {numPercentage > 0 ? (
        <BorderLinearProgress 
          variant="determinate" 
          value={numPercentage} 
          gradientBackground={gradientBackground}
        />
      ) : (
        <BorderLinearProgress 
          variant="determinate" 
          value={2.5} 
          gradientBackground={gradientBackground}
        />
      )}
    </Box>
  );
};

export default ProgressBar;
