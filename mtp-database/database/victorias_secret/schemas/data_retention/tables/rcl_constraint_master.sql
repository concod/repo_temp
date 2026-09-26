--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:rcl_constraint_master_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for rcl_constraint_master backup
CREATE TABLE IF NOT EXISTS data_retention.rcl_constraint_master (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	psa_name varchar NULL,
	validity daterange NOT NULL,
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
	rcl_constraint_code serial4 NOT NULL,
	is_deleted bool DEFAULT false NULL,
	snapshot_date date NOT null,
	CONSTRAINT unique_ps_rcl_bkp UNIQUE (rcl_code, rule_code, psa_code, validity,snapshot_date)
)
PARTITION BY LIST (snapshot_date);

