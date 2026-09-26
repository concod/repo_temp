--liquibase formatted sql
--changeset raj.mohan@impactanalytics.co:rcl_dc_store_policy_archive stripComments:false splitStatements:false context:Release_1_0 labels:MTP-66909
--comment: added-if-exists changeset for rcl_dc_store_policy_archive
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_dc_store_policy_archive (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	rule_name varchar NULL,
	validity daterange NOT NULL,
	default_store_groups _int4 NULL,
	default_product_profile int4 NULL,
	dc_store_rule int4 NULL,
	auto_allocation_rule int4 NULL,
	auto_allocation_schedular int4 NULL,
	deleted_at timestamptz DEFAULT now() NOT NULL,
	deleted_by int4 NULL
);