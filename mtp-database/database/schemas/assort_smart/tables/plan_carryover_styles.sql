--liquibase formatted sql
--changeset liquibase:plan_carryover_styles stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_carryover_styles
CREATE TABLE assort_smart.plan_carryover_styles (
	plan_carryover_style_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	is_active bool NULL,
	attribute_value jsonb NULL,
	CONSTRAINT plan_carryover_style_id_pkey PRIMARY KEY (plan_carryover_style_id)
);
CREATE INDEX plan_carryover_styles_plan_carryover_style_id_idx ON assort_smart.plan_carryover_styles USING btree (plan_carryover_style_id, plan_code);
CREATE INDEX plan_carryover_styles_plan_code_idx ON assort_smart.plan_carryover_styles USING btree (plan_code, levels);