--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:rcl_constraint_master_exceptions_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for rcl_constraint_master_exceptions backup
CREATE TABLE IF NOT EXISTS data_retention.rcl_constraint_master_exceptions (
	rcl_code int4 NOT NULL,
	rule_code int4 NULL,
	validity daterange NOT NULL,
	store_code varchar NOT NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 DEFAULT 0 NOT NULL,
	max_stock float4 DEFAULT 0 NOT NULL,
	aps float4 NULL,
	ros float4 NULL,
	st float4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	exception_rule_name varchar null,
	snapshot_date date NOT NULL
)
PARTITION BY LIST (snapshot_date);

