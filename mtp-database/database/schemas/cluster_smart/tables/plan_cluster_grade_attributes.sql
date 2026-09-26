--liquibase formatted sql
--changeset liquibase:plan_cluster_grade_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_grade_attributes
CREATE TABLE cluster_smart.plan_cluster_grade_attributes (
	cluster_plan_code int4 NOT NULL,
	store_code varchar NOT NULL,
	special_classification varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL
);
CREATE INDEX index_cluster_plan_code ON cluster_smart.plan_cluster_grade_attributes USING btree (cluster_plan_code);
CREATE INDEX index_special_classification ON cluster_smart.plan_cluster_grade_attributes USING btree (special_classification);
ALTER TABLE cluster_smart.plan_cluster_grade_attributes ADD CONSTRAINT plan_cluster_grade_attributes_plan_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE;
ALTER TABLE cluster_smart.plan_cluster_grade_attributes ADD CONSTRAINT plan_cluster_grade_attributes_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset mohammed.ayaz@impactanalytics.co:plan_cluster_grade_attributes_v1 stripComments:false splitStatements:false context:MTP-40248 labels:remove cluster_grade_attr store constraint
--comment: initial changeset for plan_cluster_grade_attributes - remove cluster_grade_attr store constraint
ALTER TABLE cluster_smart.plan_cluster_grade_attributes DROP CONSTRAINT plan_cluster_grade_attributes_store_fk;
