--liquibase formatted sql
--changeset liquibase:store_unit_capacity_v1 runOnChange:true stripComments:false splitStatements:false context:packs_update labels:MTP-17777
--comment: initial changeset for store_unit_capacity_v1
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.store_unit_capacity;
CREATE OR REPLACE VIEW inventory_smart.store_unit_capacity AS
    SELECT
	store_unit_capacity_version.version_code,
	store_unit_capacity_version.l0_name,
	store_unit_capacity_version.store_code,
	store_unit_capacity_version.range_name,
	store_unit_capacity_version.fixture,
	store_unit_capacity_version.l1_name,
	store_unit_capacity_version.unit_capacity
	FROM inventory_smart.store_unit_capacity_version
	WHERE store_unit_capacity_version.version_code = global.get_table_version('inventory_smart.store_unit_capacity_version'::text);
