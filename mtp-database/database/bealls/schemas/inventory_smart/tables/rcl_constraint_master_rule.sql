--liquibase formatted sql
--changeset linu_nazil:rcl_constraint_master_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_constraint_master_rule
create table if not exists inventory_smart.rcl_constraint_master_rule(
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT constraint_rule_pk PRIMARY KEY (rcl_code, rule_code),
	CONSTRAINT rcl_constraint_master_rule_fk FOREIGN KEY (rcl_code) REFERENCES "global".rcl_master(rcl_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);

--changeset linu_nazil:rcl_constraint_master_rule_v1 stripComments:false splitStatements:false context:Release_1_0 labels:modification
--comment: new changeset for rcl_constraint_master_rule to add rule name column
alter table inventory_smart.rcl_constraint_master_rule add column if not exists rule_name varchar null;

--changeset Shaik.Azmathull:rcl_constraint_master_rule_v2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-67111
--comment: new changeset for rcl_constraint_master_rcl_dimension_uk to add new index

CREATE UNIQUE INDEX IF NOT EXISTS rcl_constraint_master_rcl_dimension_uk
ON  inventory_smart.rcl_constraint_master_rule USING btree
(rcl_code, rcl_dimension);