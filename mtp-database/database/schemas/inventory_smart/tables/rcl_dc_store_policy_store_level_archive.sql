--liquibase formatted sql
--changeset liquibase:rcl_dc_store_policy_store_level_archive_2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-82235
--comment: initial changeset for rcl_dc_store_policy_store_level_archive
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_dc_store_policy_store_level_archive (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	validity daterange NOT NULL,
	store_code varchar NOT NULL,
	store_name varchar NOT NULL,
	auto_allocation_schedular int4 NULL,
	deleted_at timestamptz DEFAULT now() NOT NULL,
	deleted_by int4 NULL
);