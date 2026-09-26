--liquibase formatted sql
--changeset shashwat.yadav@impactanalytics.co:rcl_network_rule_modified stripComments:false splitStatements:false context:Release_1_0 labels:MTP-74818
--comment: initial changeset for rcl_network_rule

CREATE TABLE IF NOT EXISTS inventory_smart.rcl_network_rule (
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	rule_name varchar NULL,
	CONSTRAINT rcl_network_rule_pk PRIMARY KEY (rcl_code, rule_code),
	CONSTRAINT rcl_network_rule_dim_uk UNIQUE (rcl_code, rcl_dimension),
	CONSTRAINT rcl_network_rule_fk FOREIGN KEY (rcl_code) REFERENCES "global".rcl_master(rcl_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);