--liquibase formatted sql
--changeset liquibase:rcl_oms_constraint_master_rule_update1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update1
--comment: intial changeset for rcl_oms_constraint_master_rule_update1
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_oms_constraint_master_rule (
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	rule_name varchar NULL,
	CONSTRAINT oms_constraint_rule_pk PRIMARY KEY (rcl_code, rule_code),
	CONSTRAINT rcl_osm_constraint_master_rcl_dimension_uk UNIQUE (rcl_code, rcl_dimension),
	CONSTRAINT rcl_oms_constraint_master_rule_fk FOREIGN KEY (rcl_code) REFERENCES "global".rcl_master(rcl_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);