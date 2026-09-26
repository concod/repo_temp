
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_budget_master stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for plan_budget_master 

CREATE TABLE IF not exists assort_smart.plan_budget_master (
	plan_budget_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_budget_master_pkey PRIMARY KEY (plan_budget_id)
);