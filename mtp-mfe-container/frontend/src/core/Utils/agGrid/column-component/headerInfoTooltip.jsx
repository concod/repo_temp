import InfoIcon from 'coreAssets/info.svg';
import { Tooltip } from 'impact-ui-v3';

const HeaderInfoTooltip = ({ text, iconSize = 20, orientation = "bottom" }) => {
  return (
    <>
      <Tooltip
        orientation={orientation}
        title={text}
        variant="tertiary"
      >
        <div style={{ height: `${iconSize}px`, display: "flex", alignItems: "center" }}>
          <InfoIcon style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />
        </div>
      </Tooltip >
    </>
  );
}

export default HeaderInfoTooltip;