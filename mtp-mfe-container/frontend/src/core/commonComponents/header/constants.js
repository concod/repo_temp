import lsco from "../../coreAssets/lsco_logo_red.jpg"
import { TENANT_MAPPING } from "config/constants"

export const headerLogoPaths = {
    [TENANT_MAPPING.LEVIS_US]: lsco,
    [TENANT_MAPPING.LEVIS_EU]: lsco,
    [TENANT_MAPPING.LEVIS_AMA]: lsco,
}

export const INITIAL_DELAY_MS = 1000;
export const MAX_DELAY_MS = 60000;
export const MAX_RETRIES = 10;
export const CONNECTION_TIMEOUT_MS = 10000;
export const JITTER_MS = 1000;
export const HEARTBEAT_INTERVAL_MS = 3000;
export const SLAVE_MONITOR_INTERVAL_MS = 5000;
export const HEARTBEAT_STALE_THRESHOLD_MS = 15000;
export const SLAVE_MONITOR_JITTER_MS = 2000;
export const CLAIM_VERIFICATION_DELAY_MS = 3000;

export const KEY_SYMBOL_MAP = {
    Meta: "⌘",
    Alt: "⌥",
    " ": "Space",
};