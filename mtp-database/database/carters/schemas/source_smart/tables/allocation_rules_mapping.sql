--liquibase formatted sql
--changeset liquibase:allocation_rules_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_rules_mapping
CREATE TABLE source_smart.allocation_rules_mapping (
	style_color_id varchar(255) NULL,
	dc_code varchar(255) NULL,
	priority int4 NULL,
	rcl_id serial4 NOT NULL,
	rule_id serial4 NOT NULL,
	CONSTRAINT alloc_rule_map_unique UNIQUE (style_color_id, dc_code),
	CONSTRAINT fk_alloc_rcl FOREIGN KEY (rcl_id) REFERENCES source_smart.allocation_rcl(rcl_id) ON DELETE CASCADE,
	CONSTRAINT fk_alloc_rule FOREIGN KEY (rule_id) REFERENCES source_smart.allocation_rule(rule_id) ON DELETE CASCADE
);
--changeset liquibase:allocation_rules_mapping_change_unique_constraint stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start --comment: change in unique constraint
ALTER TABLE source_smart.allocation_rules_mapping DROP CONSTRAINT IF EXISTS alloc_rule_map_unique;
ALTER TABLE source_smart.allocation_rules_mapping
ADD CONSTRAINT alloc_rule_map_unique UNIQUE(rcl_id, style_color_id, dc_code);
--changeset liquibase:allocation_rules_mapping_change_unique_constraint_v2 stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start --comment: change in unique constraint
ALTER TABLE source_smart.allocation_rules_mapping DROP CONSTRAINT IF EXISTS alloc_rule_map_unique;
ALTER TABLE source_smart.allocation_rules_mapping
ADD CONSTRAINT alloc_rule_map_unique UNIQUE(rcl_id, rule_id, style_color_id, dc_code);
--changeset genuine.basil@impactanalytics.co:allocation_rules_mapping_add_foreign_key stripComments:false splitStatements:false context:Release_1_3 labels:add_foreign_key --comment: add foreign key constraint for rule_id
ALTER TABLE source_smart.allocation_rules_mapping
DROP CONSTRAINT IF EXISTS fk_alloc_rule; 
ALTER TABLE source_smart.allocation_rules_mapping 
ADD CONSTRAINT fk_alloc_rule FOREIGN KEY (rule_id) REFERENCES source_smart.allocation_rule(rule_id) ON DELETE CASCADE;