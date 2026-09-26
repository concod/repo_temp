--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:rcl_constraint_master_rule_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for rcl_constraint_master_rule backup
CREATE TABLE IF NOT EXISTS data_retention.rcl_constraint_master_rule (
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	rule_name varchar NULL,
	snapshot_date date NOT NULL,
	CONSTRAINT constraint_rule_pk_bkp PRIMARY KEY (rcl_code, rule_code, snapshot_date)
)
PARTITION BY LIST (snapshot_date);

