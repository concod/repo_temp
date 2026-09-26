
--liquibase formatted sql
--changeset genuine.basil@impactanalytics.co:allocation_plan_rules stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_plan_rules
CREATE TABLE source_smart.allocation_plan_rules (
	allocation_id uuid NOT NULL,
	operation_id uuid NOT NULL,
	rule_id int4 NOT NULL,
	rule_name varchar(255) NULL,
	rcl_id int4 NOT NULL,
	season_name varchar(255) NULL,
	category varchar(255) NULL,
	sub_region varchar(255) NULL,
	sourcing_class_name varchar(255) NULL,
	forecast_version varchar(255) NULL,
	sourcing_mode varchar(50) NULL,
	threshold int4 NULL,
	strategy_id uuid NULL,
	strategy_name varchar(255) NULL,
	subcategory varchar(255) NULL,
	calender varchar(255) NULL,
	expected_toolset varchar(255) NULL,
	client_rule_key text NULL,
	is_deletable bool DEFAULT true NOT NULL,
	is_saved bool DEFAULT true NOT NULL,
	is_selected bool DEFAULT false NOT NULL,
	created_by varchar(255) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	last_updated_at timestamptz NULL,
	CONSTRAINT allocation_plan_rules_pkey PRIMARY KEY (allocation_id, operation_id, rule_id),
	CONSTRAINT fk_allocation_plan_rules_plan FOREIGN KEY (allocation_id,operation_id) REFERENCES source_smart.allocation_plans(allocation_id,operation_id) ON DELETE CASCADE
);

CREATE INDEX idx_allocation_plan_rules_allocation_operation ON source_smart.allocation_plan_rules USING btree (allocation_id, operation_id);
CREATE INDEX idx_allocation_plan_rules_rcl_id ON source_smart.allocation_plan_rules USING btree (rcl_id);
CREATE INDEX idx_allocation_plan_rules_sort ON source_smart.allocation_plan_rules USING btree (allocation_id, operation_id, rcl_id, rule_name);