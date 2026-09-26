--liquibase formatted sql
--changeset liquibase:plan_cluster_store_final stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_store_final
CREATE TABLE assort.plan_cluster_store_final (
    cluster_code_id integer NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying NOT NULL
);
CREATE INDEX plan_cluster_store_final_attribute_name_idx ON assort.plan_cluster_store_final USING btree (attribute_name);
CREATE INDEX plan_cluster_store_final_cluster_code_id_idx ON assort.plan_cluster_store_final USING btree (cluster_code_id);
ALTER TABLE assort.plan_cluster_store_final
    ADD CONSTRAINT plan_cluster_store_final_fk FOREIGN KEY (cluster_code_id) REFERENCES assort.plan_cluster_final(cluster_code_id) ON DELETE CASCADE;
