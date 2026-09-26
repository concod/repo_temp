--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:dc_store_policy_user_rule_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for dc_store_policy_user_rule backup
CREATE TABLE IF NOT EXISTS data_retention.dc_store_policy_user_rule (
	rule_code serial4 NOT NULL,
	rule_name varchar NOT NULL,
	"values" jsonb NOT NULL,
	rule_type varchar NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deletable bool DEFAULT false NOT NULL,
	snapshot_date date NOT null,
	CONSTRAINT unique_rule_name_rule_type UNIQUE (rule_name, rule_type,snapshot_date)
)PARTITION BY LIST (snapshot_date);

