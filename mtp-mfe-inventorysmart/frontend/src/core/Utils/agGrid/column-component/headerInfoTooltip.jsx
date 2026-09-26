import InfoIcon from 'coreAssets/info.svg';
import { Tooltip } from 'impact-ui-v3';

const HeaderInfoTooltip = ({ text }) => {
  return (
    <>
      <Tooltip
        orientation="bottom"
        title={text}
        variant="tertiary"
      >
        <div style={{height: "20px"}}>
          <InfoIcon style={{ width: "20px", AspectRatio: "1/1"}} />
        </div>
      </Tooltip >
    </>
  );
}

export default HeaderInfoTooltip;