--liquibase formatted sql
--changeset liquibase:plan_cluster_store_final stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_store_final
CREATE TABLE assort_smart.plan_cluster_store_final (
	cluster_code_id int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL
);
CREATE INDEX plan_cluster_store_final_attribute_name_idx ON assort_smart.plan_cluster_store_final USING btree (attribute_name);
CREATE INDEX plan_cluster_store_final_cluster_code_id_idx ON assort_smart.plan_cluster_store_final USING btree (cluster_code_id);