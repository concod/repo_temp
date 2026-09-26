--liquibase formatted sql
--changeset liquibase:rcl_network_versions_latest runOnChange:true stripComments:false splitStatements:false context:MTP-20089-3 labels:liquibase_project_start
--comment:rcl_network_versions_latest
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.rcl_network_versions_latest;
CREATE OR REPLACE VIEW inventory_smart.rcl_network_versions_latest
AS
SELECT 
    article,
    version_code,
    l0_name,
    rule_code,
    rcl_code,
    supply_network,
    route_id,
    route_type_id,
    supply_route_name,
    source_node_id,
    source_type,
    source_name,
    source_code,
    destination_node_id,
    destination_type,
    destination_name,
    destination_code,
    shipping_mode,
    is_terminal,
    is_primary,
    lead_time,
    priority
FROM 
    inventory_smart.rcl_network_versions
WHERE 
    -- version_code = global.table_version('inventory_smart.rcl_network_versions'::text);
    version_code = (
        SELECT MAX(version_code) 
        FROM global.rcl_versioning 
        WHERE tbl_name = 'inventory_smart.rcl_network_versions' AND updated_at IS NOT NULL
    );
