

--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.assort_master_plan stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for assort_master_plan

CREATE TABLE IF not exists assort_smart.assort_master_plan (
	plan_master_id serial4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	channel varchar NULL,
	start_date date NULL
)
PARTITION BY LIST (l0_name);