--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:rcl_dc_store_policy_store_level_archive stripComments:false splitStatements:false context:VS_inv_smart labels:inner_packs_v1
--comment: initial changeset for rcl_dc_store_policy_store_level_archive VS intl

CREATE TABLE IF NOT EXISTS inventory_smart.rcl_dc_store_policy_store_level_archive (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	validity daterange NOT NULL,
	store_code int4 NULL,
	store_name text NOT NULL,
	auto_allocation_schedular int4 NULL,
	deleted_at timestamptz DEFAULT now() NOT NULL,
	deleted_by int4 NULL
);


--changeset kanishka.parashar:changing_data_type stripComments:false splitStatements:false context:Release_1_0 labels:adding_dc_oh_oo_column
--comment: changing data type
ALTER TABLE inventory_smart.rcl_dc_store_policy_store_level_archive ALTER COLUMN store_code TYPE varchar USING store_code::varchar;