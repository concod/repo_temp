--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_cluster_opt_attribute_1 stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_cluster_opt_attribute

CREATE TABLE IF not exists assort_smart.plan_cluster_opt_master (
	plan_clu_opt_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NULL,
	CONSTRAINT plan_cluster_opt_master_pkey PRIMARY KEY (plan_clu_opt_id)
);
CREATE INDEX IF NOT EXISTS plan_cluster_opt_master_plan_code_idx ON assort_smart.plan_cluster_opt_master USING btree (plan_code);