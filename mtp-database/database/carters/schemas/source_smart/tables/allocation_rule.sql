--liquibase formatted sql
--changeset liquibase:allocation_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_rule
CREATE TABLE source_smart.allocation_rule (
	rule_id serial4 NOT NULL,
	rcl_id serial4 NOT NULL,
	rule_name varchar(255) NULL,
	l0_name varchar(255) NULL,
	l1_name varchar(255) NULL,
	l2_name varchar(255) NULL,
	l3_name varchar(255) NULL,
	l4_name varchar(255) NULL,
	l5_name varchar(255) NULL,
	s0_name varchar(255) NULL,
	s1_name varchar(255) NULL,
	s2_name varchar(255) NULL,
	season_name varchar(255) NULL,
	style_color_id varchar(255) NULL,
	dc_stores varchar(255) NULL,
	allocation_filter_id uuid NULL,
	allocation_strategy_id uuid NULL,
	updated_by varchar(255) NULL,
	last_modified timestamp NULL,
	placeholder_id serial4 NOT NULL,
	CONSTRAINT alloc_rid_pk PRIMARY KEY (rule_id),
	CONSTRAINT allocation_rule_attributes_unique UNIQUE (style_color_id, dc_stores),
	CONSTRAINT fk_alloc_filter_id FOREIGN KEY (allocation_filter_id) REFERENCES source_smart.allocation_filters(filter_id) ON DELETE CASCADE,
	CONSTRAINT fk_alloc_rcl FOREIGN KEY (rcl_id) REFERENCES source_smart.allocation_rcl(rcl_id) ON DELETE CASCADE,
	CONSTRAINT fk_alloc_strategy_id FOREIGN KEY (allocation_strategy_id) REFERENCES source_smart.allocation_strategy(strategy_id) ON DELETE CASCADE
);
--changeset liquibase:allocation_rule_add_foreign_keys_and_unique_constraint stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: new requirements for allocation rule

-- Add season id
ALTER TABLE source_smart.allocation_rule
ADD IF NOT EXISTS season_id varchar(255);

-- Add s0_id for sourcing class
ALTER TABLE source_smart.allocation_rule
ADD IF NOT EXISTS s0_id varchar(255);

-- Add foreign key constraint for season and sourcing class
ALTER TABLE source_smart.allocation_rule
DROP CONSTRAINT IF EXISTS fk_sm_id;

ALTER TABLE source_smart.allocation_rule
DROP CONSTRAINT IF EXISTS fk_s0_id;

ALTER TABLE source_smart.allocation_rule
ADD CONSTRAINT fk_sm_id FOREIGN KEY(season_id) REFERENCES source_smart.season_master(season_id) ON DELETE CASCADE;

ALTER TABLE source_smart.allocation_rule
ADD CONSTRAINT fk_s0_id FOREIGN KEY(s0_id) REFERENCES source_smart.sourcing_class_master(sourcing_class_id) ON DELETE CASCADE;
-- Drop existing unique constraint and add it with rcl_id
ALTER TABLE source_smart.allocation_rule 
DROP CONSTRAINT IF EXISTS allocation_rule_attributes_unique;

ALTER TABLE source_smart.allocation_rule
ADD CONSTRAINT allocation_rule_attributes_unique UNIQUE(rcl_id, style_color_id, dc_stores);

--changeset liquibase:allocation_rule_add_new_columns stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: new requirements for allocation rule

-- adding vendor_mode column
ALTER TABLE source_smart.allocation_rule
ADD IF NOT EXISTS vendor_mode varchar(255);

--adding vendor_count column
ALTER TABLE source_smart.allocation_rule
ADD IF NOT EXISTS vendor_count int4;