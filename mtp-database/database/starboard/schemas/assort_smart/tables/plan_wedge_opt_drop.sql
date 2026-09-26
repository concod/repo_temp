
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_wedge_opt_drop stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_wedge_opt_drop  



CREATE TABLE IF not exists assort_smart.plan_wedge_opt_drop (
	plan_wedge_opt_drop_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	drop_split bool NULL,
	choice_flow bool NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_wedge_opt_drop_pkey PRIMARY KEY (plan_wedge_opt_drop_id)
);