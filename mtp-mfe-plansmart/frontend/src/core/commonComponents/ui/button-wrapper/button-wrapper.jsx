import { Button } from "@mui/material";
import { ButtonWrapperContainer } from "./style";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";

const ButtonWrapper = (props) => {
  const { id, variant, className, content, type, color, style } = props;
  const { buttonWrapperStyle, buttonStyle } = style;
  const allReducerStates = useSelector((state) => state);
  const navigate = useNavigate();

  const handleClick = (e) => {
    try {
      if (Array.isArray(props.onClick)) {
        props.onClick?.map(async (eachAction) => {
          if (typeof eachAction === "function") {
            const onCompleteActions = await eachAction(e, allReducerStates);
            if (!_.isEmpty(onCompleteActions)) {
              // Execute the onComplete actions
              onCompleteActions?.map((action) => {
                if (action.type === "redirect") {
                  navigate(`/${action.link}`);
                }
              });
            }
          } else if (typeof eachAction === "object") {
            navigate(`/${eachAction.link}`);
          }
        });
      }
    } catch (error) {
      console.error("handleClick error", error);
    }
  };
  return (
    <ButtonWrapperContainer
      {...buttonWrapperStyle}
      {...buttonStyle}
      onClick={handleClick}
    >
      <Button
        id={id}
        variant={variant}
        className={className}
        type={type}
        color={color}
      >
        {content}
      </Button>
    </ButtonWrapperContainer>
  );
};

export default ButtonWrapper;
