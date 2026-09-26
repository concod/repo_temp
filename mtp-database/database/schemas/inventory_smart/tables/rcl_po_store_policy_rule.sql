--liquibase formatted sql
--changeset rajesh.kumar:rcl_po_store_policy_rule_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_po_store_policy_rule_1
CREATE TABLE inventory_smart.rcl_po_store_policy_rule (
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	rule_name varchar NULL,
	CONSTRAINT po_store_policy_rule_pk PRIMARY KEY (rcl_code, rule_code),
	CONSTRAINT rcl_po_store_rule_rcl_dim_uk UNIQUE (rcl_code, rcl_dimension),
	CONSTRAINT rcl_po_store_policy_rule_fk FOREIGN KEY (rcl_code) REFERENCES "global".rcl_master(rcl_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);