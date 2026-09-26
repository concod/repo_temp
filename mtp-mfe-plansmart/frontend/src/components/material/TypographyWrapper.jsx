import { Typography } from "@mui/material";

const TypographyWrapper = (props) => {
  const { variant, component, content, ...otherProps } = props;
  return (
    <Typography variant={variant} component={component} {...otherProps}>
      {content}
    </Typography>
  );
};

export default TypographyWrapper;
