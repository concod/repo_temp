



--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_cluster_depth_choice_1 stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_cluster_depth_choice



CREATE TABLE IF not exists assort_smart.plan_cluster_depth_choice (
	plan_cls_depth_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_cluster_depth_choice_pkey PRIMARY KEY (plan_cls_depth_id)
);
CREATE INDEX IF NOT EXISTS plan_cluster_depth_choice_plan_code_idx ON assort_smart.plan_cluster_depth_choice USING btree (plan_code);