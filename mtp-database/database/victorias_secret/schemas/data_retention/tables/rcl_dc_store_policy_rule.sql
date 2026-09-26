--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:rcl_dc_store_policy_rule_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for rcl_dc_store_policy_rule backup
CREATE TABLE IF NOT EXISTS data_retention.rcl_dc_store_policy_rule (
    rule_code serial4 NOT NULL,
    rcl_code int4 NOT NULL,
    rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
    rule_name varchar NULL,
    snapshot_date date NOT NULL,
    CONSTRAINT bkp_dc_store_policy_rule_backup_unq UNIQUE  (rcl_code, rule_code, snapshot_date)
)
PARTITION BY LIST (snapshot_date);

