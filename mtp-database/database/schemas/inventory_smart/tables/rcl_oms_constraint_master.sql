--liquibase formatted sql
--changeset liquibase:rcl_oms_constraint_master_update1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update1
--comment: intial changeset for rcl_oms_constraint_master_update1
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_oms_constraint_master (
    rcl_oms_constraint_code serial4 NOT NULL,
	rcl_code int NOT NULL,
	rule_code int NOT NULL,
    min_replenishment_quantity int not NULL default 1,
	max_replenishment_quantity int not NULL default 99999,
	moq_tolerance float not NULL default 0.5,
    moq_interval varchar NULL,
	moq_start_month varchar NULL,
	order_multiple int not null default 1,
	level_of_application varchar NOT NULL,
	validity daterange NOT NULL default '[2000-01-01,2050-01-01)',
	created_at timestamptz NOT NULL,
	created_by INT NULL,
	updated_at timestamptz NULL,
	updated_by INT NULL,
    column_modified VARCHAR NULL,
	CONSTRAINT oms_unique_ps_rcl UNIQUE (rcl_code, rule_code, validity),
	CONSTRAINT rcl_oms_constraint_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_oms_constraint_master_rcl_oms_constraint_master_rule_fk FOREIGN KEY (rcl_code,rule_code) REFERENCES inventory_smart.rcl_oms_constraint_master_rule(rcl_code,rule_code) ON DELETE CASCADE,
	CONSTRAINT rcl_oms_constraint_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE restrict
)
PARTITION BY LIST (rcl_code);

--changeset vishal.kumar@impactanalytics.co:Updated_alter_comment stripComments:false splitStatements:false context:Release_1_1 labels:add_rule_name_column
--comment: add_rule_name_column MTP-90048_5
ALTER TABLE inventory_smart.rcl_oms_constraint_master ADD COLUMN IF NOT EXISTS rule_name varchar NULL;