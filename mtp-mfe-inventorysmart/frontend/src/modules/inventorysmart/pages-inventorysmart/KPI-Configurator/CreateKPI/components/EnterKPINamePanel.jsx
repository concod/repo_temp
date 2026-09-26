import { Panel, Input } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";

const EnterKPINamePanel = (props) => {
    const { showPanel, onSave, closePanel, kpiName, setKpiName, loading } = props;
    return (
        <Panel
            title="Enter KPI Name"
            size="small"
            anchor="right"
            onClose={closePanel}
            aria-labelledby="customized-dialog-title"
            open={showPanel}
            primaryButtonLabel={"Save KPI"}
            onPrimaryButtonClick={onSave}
        >
            <Loader
                loader={loading}
            >
                <Input
                    label="KPI name"
                    name="kpiName"
                    placeholder="Enter KPI Name..."
                    isRequired
                    value={kpiName}
                    onChange={(e) => setKpiName(e.target.value)}
                />
            </Loader>
        </Panel >
    );
};

export default EnterKPINamePanel;