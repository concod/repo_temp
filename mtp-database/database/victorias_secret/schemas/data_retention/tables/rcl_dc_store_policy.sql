--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:rcl_dc_store_policy_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for rcl_dc_store_policy backup
CREATE TABLE IF NOT EXISTS data_retention.rcl_dc_store_policy (
	rcl_dc_store_policy_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	default_store_groups _int4 DEFAULT ARRAY[]::integer[] NULL,
	default_product_profile int4 NULL,
	dc_store_rule int4 NULL,
	auto_allocation_rule int4 NULL,
	auto_allocation_schedular int4 NULL,
	validity daterange NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	is_deleted bool DEFAULT false NULL,
	snapshot_date date NOT NULL,
	CONSTRAINT unique_dsp_rcl_bkp UNIQUE (rcl_code, rule_code, validity,snapshot_date)
)
PARTITION BY LIST (snapshot_date);

