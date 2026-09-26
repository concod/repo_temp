--liquibase formatted sql
--changeset mayank.mukundam:allocation_rule_style_dc_map stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_rule_style_dc_map

CREATE TABLE source_smart.allocation_rule_style_dc_map (
	rule_id int4 NOT NULL,
	style_color_id varchar NOT NULL,
	dc_code varchar NOT NULL,
	dc_name varchar NOT NULL,
	demand int4 NULL,
	allocated_demand int4 NULL,
	facility_ids json NULL,
	allocated_units_smv int4 NULL,
	allocation_id uuid NOT NULL,
	status varchar NULL,
	created_by varchar NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_by varchar NULL,
	updated_at timestamp NULL,
	operation_id uuid NULL,
	facility_allocation json NULL,
	CONSTRAINT style_dc_uniq UNIQUE (rule_id, style_color_id, dc_code, allocation_id, operation_id, status)
);
CREATE INDEX idx_ars_style_rule_alloc ON source_smart.allocation_rule_style_dc_map USING btree (style_color_id, rule_id, allocation_id);

--changeset naveenkumar.t:allocation_rule_style_dc_map stripComments:false splitStatements:false context:Release_1_1 labels:added_unique_index
--comment: added allocation_rule_style_dc_uniq_idx
CREATE UNIQUE INDEX IF NOT EXISTS allocation_rule_style_dc_uniq_idx ON source_smart.allocation_rule_style_dc_map USING btree (rule_id, style_color_id, dc_code, allocation_id, COALESCE(operation_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(status, 'UNKNOWN'::character varying));