import CustomPopover from "./CustomPopover";
import "./ButtonDropdown.css";

const ButtonDropdown = (props) => {
  const { dropdownButtons, setPopover } = props;
  return (
    <div className="button-dropdown-container">
      {dropdownButtons.map((button, index) => {
        return button.isMenuButton ? (
          <CustomPopover
            show={button.show}
            setShow={button.setShow}
            triggerRef={button.menuRef}
            triggerElement={<ButtonComponent button={button} key={index} />}
            positionStyle={button.menuPosition}
          >
            <ButtonDropdown
              dropdownButtons={button.menuButtons}
              setPopover={button.setShow}
            />
          </CustomPopover>
        ) : (
          <ButtonComponent
            button={button}
            key={index}
            setPopover={setPopover}
          />
        );
      })}
    </div>
  );
};

const ButtonComponent = ({ button, key, setPopover }) => {
  const handleClick = () => {
    if (button.action) {
      button.action();
    }
    setPopover(false);
  };
  return (
    <div
      ref={button.menuRef}
      className="button-wrapper"
      style={{ ...button.buttonStyle }}
    >
      {button.startComponent && (
        <div className="start-component">{button.startComponent}</div>
      )}
      <div key={key} className="button-container" onClick={handleClick}>
        {button.startIcon && (
          <p
            className="button-dropdown-icon-container"
            style={{ ...button.iconStyle }}
          >
            <IconComponent
              Icon={button.startIcon}
              iconStyle={button.startIconStyle}
            />
          </p>
        )}
        <p
          className="button-dropdown-name-container"
          style={{ ...button.buttonTextStyle }}
        >
          {button?.name}
        </p>
        {button.endIcon && (
          <p
            className="button-dropdown-icon-container"
            style={{ ...button.iconStyle }}
          >
            <IconComponent
              Icon={button.endIcon}
              iconStyle={button.endIconStyle}
            />
          </p>
        )}
      </div>
      {button.endComponent && (
        <div className="end-component">{button.endComponent}</div>
      )}
    </div>
  );
};

const IconComponent = ({ Icon, iconStyle }) => {
  return typeof Icon === "string" ? (
    <img style={iconStyle} src={Icon} alt="icon" />
  ) : (
    <Icon />
  );
};

export default ButtonDropdown;
