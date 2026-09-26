--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_cluster_store_final_1 stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_cluster_store_final



CREATE TABLE IF not exists assort_smart.plan_cluster_store_final (
	cluster_code_id int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL
);
CREATE INDEX IF NOT EXISTS plan_cluster_store_final_attribute_name_idx ON assort_smart.plan_cluster_store_final USING btree (attribute_name);
CREATE INDEX IF NOT EXISTS plan_cluster_store_final_cluster_code_id_idx ON assort_smart.plan_cluster_store_final USING btree (cluster_code_id);