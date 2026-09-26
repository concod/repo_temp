--liquibase formatted sql
--changeset linu.nazil:rcl_dc_store_policy_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_dc_store_policy_rule
CREATE TABLE "inventory_smart".rcl_dc_store_policy_rule (
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT dc_store_policy_rule_pk PRIMARY KEY (rcl_code, rule_code),
	CONSTRAINT rcl_dc_store_policy_rule_fk FOREIGN KEY (rcl_code) REFERENCES "global".rcl_master(rcl_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);

--changeset linu.nazil:rcl_dc_store_policy_rule_v1 stripComments:false splitStatements:false context:Release_1_0 labels:modification
--comment: new changeset for rcl_dc_store_policy_rule to add rule name column
alter table inventory_smart.rcl_dc_store_policy_rule add column if not exists rule_name varchar null;

--changeset linu.nazil:rcl_dc_store_policy_rule_v2 stripComments:false splitStatements:false context:Release_1_0 labels:modification
--comment: new changeset for rcl_dc_store_policy_rule to add constraint on rcl-code, rcl-dim
alter table inventory_smart.rcl_dc_store_policy_rule add CONSTRAINT rcl_dc_store_rule_rcl_dim_uk UNIQUE (rcl_code, rcl_dimension);