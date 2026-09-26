--liquibase formatted sql
--changeset linu.nazil@impactanalytics.co:rcl_dc_store_policy_results_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial commit for rcl_dc_store_policy_results
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_dc_store_policy_results (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	rcl_dc_store_policy_code int4 NULL,
	rcl_code int4 NULL,
	default_store_groups _int4 NULL,
	default_product_profile int4 NULL,
	dc_store_rule int4 NULL,
	auto_allocation_rule int4 NULL,
	auto_allocation_schedular int4 NULL
);

--changeset linu.nazil@impactanalytics.co:rcl_dc_store_policy_results_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Adding unique index on product_code
CREATE UNIQUE INDEX IF NOT EXISTS rcl_dc_store_policy_results_pkey ON inventory_smart.rcl_dc_store_policy_results USING btree (product_code);