

--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_cluster_aps_1 stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for plan_cluster_aps 


CREATE TABLE IF not exists assort_smart.plan_cluster_aps (
	plan_clu_aps_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	is_final bool DEFAULT false NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_cluster_aps_pkey PRIMARY KEY (plan_clu_aps_id)
);
CREATE INDEX IF NOT EXISTS plan_cluster_aps_plan_code_idx ON assort_smart.plan_cluster_aps USING btree (plan_code);