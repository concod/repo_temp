
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_budget_master_drop_1 stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for plan_budget_master_drop 


CREATE TABLE IF not exists assort_smart.plan_carryover_styles (
	plan_carryover_style_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	is_active bool NULL,
	attribute_value jsonb NULL,
	CONSTRAINT plan_carryover_style_id_pkey PRIMARY KEY (plan_carryover_style_id)
);
CREATE INDEX IF NOT EXISTS plan_carryover_styles_plan_carryover_style_id_idx ON assort_smart.plan_carryover_styles USING btree (plan_carryover_style_id, plan_code);
CREATE INDEX IF NOT EXISTS plan_carryover_styles_plan_code_idx ON assort_smart.plan_carryover_styles USING btree (plan_code, levels);