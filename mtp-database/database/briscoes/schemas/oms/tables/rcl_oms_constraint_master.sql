--liquibase formatted sql
--changeset pradeep.kumar:moving_table_to_schemas_oms_table_test stripComments:false splitStatements:false context:Release_1_0 labels:moving_tables_to_oms
--comment: moving table from IS to oms in schemas
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

--changeset samarjit.mazumder@impactanalytics.co:drop_not_null_constraint stripComments:false splitStatements:false context:Release_1_0 labels:drop_not_null_constraint
--comment: drop_not_null_constraint
ALTER TABLE inventory_smart.rcl_oms_constraint_master ALTER COLUMN moq_tolerance DROP NOT NULL;