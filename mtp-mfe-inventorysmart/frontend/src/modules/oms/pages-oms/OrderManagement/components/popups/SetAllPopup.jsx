import React, { useEffect, useState } from "react";
import { Modal } from "impact-ui-v3";
import Select from "modules/oms/shared/components/ImpactSelect/Select.jsx";

const formStyle = {
  display: "flex",
  flexDirection: "row",
  gap: 16,
  paddingTop: 8,
  paddingBottom: 24,
};

const fieldStyle = {
  flex: 1,
  minWidth: 0,
};

/**
 * Set All — applies a distribution method + one target timeline bucket to
 * every editable leaf under the selected rows. `onApply` hands the selection
 * (including the bucket's fiscal members) back to the caller, which builds
 * the BE /set-all payload.
 */
function SetAllPopup({
  isOpen,
  distributionOptions = [],
  timelineOptions = [],
  timelinePlaceholder = "Select Month",
  onCancel,
  onApply,
}) {
  const [distribution, setDistribution] = useState({});
  const [timeline, setTimeline] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setDistribution({});
      setTimeline({});
    }
  }, [isOpen]);

  const isValid = Boolean(distribution?.value) && Boolean(timeline?.value);

  return (
    <Modal
      open={isOpen}
      size="small"
      title="Set All"
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={() => {
        if (!isValid) return;
        onApply({
          distributionMethod: distribution.value,
          timelinePeriodId: timeline.value,
          timelineLabel: timeline.label,
          timelineMembers: timeline.members || null,
        });
      }}
      onSecondaryButtonClick={onCancel}
      onClose={onCancel}
      primaryButtonProps={{ disabled: !isValid }}
    >
      <div style={formStyle}>
        <div style={fieldStyle}>
          <Select
            label="Distribution"
            labelOrientation="top"
            isMulti={false}
            isClearable={false}
            isWithSearch={false}
            options={distributionOptions}
            value={distribution}
            onChange={setDistribution}
            placeholder="Select distribution"
          />
        </div>
        <div style={fieldStyle}>
          <Select
            label="Timeline"
            labelOrientation="top"
            isMulti={false}
            isClearable={false}
            isWithSearch={false}
            options={timelineOptions}
            value={timeline}
            onChange={setTimeline}
            placeholder={timelinePlaceholder}
          />
        </div>
      </div>
    </Modal>
  );
}

export default SetAllPopup;
