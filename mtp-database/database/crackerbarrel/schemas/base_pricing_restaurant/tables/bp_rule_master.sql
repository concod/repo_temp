--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_rule_master_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_rule_master_1

CREATE TABLE base_pricing_restaurant.bp_rule_master (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	description text NULL,
	rule_type_id int4 NOT NULL,
	rule_scope_id int4 NOT NULL,
	parent_rule_id int4 NULL,
	product_grouping_type int4 DEFAULT 0 NOT NULL,
	store_grouping_type int4 DEFAULT 0 NOT NULL,
	product_hierarchy_level varchar(255) NULL,
	store_hierarchy_level varchar(255) NULL,
	is_active bool DEFAULT true NULL,
	created_by int4 NOT NULL,
	created_at timestamp NULL,
	updated_by int4 NOT NULL,
	updated_at timestamp NULL,
	CONSTRAINT bp_rule_master_pkey PRIMARY KEY (id),
	CONSTRAINT unique_name UNIQUE (name)
);
CREATE INDEX idx_bp_rule_master ON base_pricing_restaurant.bp_rule_master USING btree (id, parent_rule_id, rule_type_id, rule_scope_id);