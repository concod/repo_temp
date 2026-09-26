--liquibase formatted sql
--changeset mayank.mukundam:rules_for_allocation stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rules_for_allocation

CREATE TABLE source_smart.rules_for_allocation (
	alloction_name varchar NOT NULL,
	rule_id int4 NOT NULL,
	rule_name varchar NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	s0_name varchar NULL,
	s1_name varchar NULL,
	s2_name varchar NULL,
	season_name varchar NULL,
	season_id varchar NULL,
	dc json NULL,
	facility_ids json NULL,
	number_of_style_colors int4 NULL,
	number_of_allocated_style_colors int4 NULL,
	number_of_facilities_allocated int4 NULL,
	aggregated_demand int4 NULL,
	total_allocated_units int4 NULL,
	allocated_units_smv int4 NULL,
	average_units_allocated_per_facility int4 NULL,
	allocation_filter_id varchar NULL,
	filter_name varchar NULL,
	allocation_strategy_id varchar NULL,
	strategy_name varchar NULL,
	factory_groups json NULL,
	status varchar NULL,
	created_by varchar NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_by varchar NULL,
	updated_at timestamp NULL,
	allocation_id uuid NOT NULL,
	operation_id uuid NULL,
	CONSTRAINT rules_alloc_uniq UNIQUE (rule_id, allocation_id, operation_id, status)
);

--changeset naveenkumar.t:rules_for_allocation stripComments:false splitStatements:false context:Release_1_1 labels:added_uniqie_index
--comment: added rules_alloc_uniq_idx
CREATE UNIQUE INDEX IF NOT EXISTS rules_alloc_uniq_idx ON source_smart.rules_for_allocation USING btree (allocation_id, rule_id, COALESCE(operation_id, '00000000-0000-0000-0000-000000000000'::uuid), status);

--changeset naveenkumar.t:rules_for_allocation_pkey stripComments:false splitStatements:false context:Release_1_2 labels:added_primary_key
--comment: added rules_for_allocation_pkey
ALTER TABLE source_smart.rules_for_allocation
ADD CONSTRAINT rules_for_allocation_pkey
PRIMARY KEY (allocation_id, rule_id, operation_id);

--changeset genuine.basil@impactanalytics.co:rules_for_allocation_update_timestamp_columns stripComments:false splitStatements:false context:Release_1_2 labels:update_timestamp_columns
--comment: updated created_at and updated_at columns to timestamptz
ALTER TABLE source_smart.rules_for_allocation
ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;

ALTER TABLE source_smart.rules_for_allocation
ALTER COLUMN updated_at TYPE timestamptz USING updated_at::timestamptz;