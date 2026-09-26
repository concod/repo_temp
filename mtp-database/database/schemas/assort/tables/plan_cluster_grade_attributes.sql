--liquibase formatted sql
--changeset liquibase:plan_cluster_grade_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_grade_attributes
CREATE TABLE assort.plan_cluster_grade_attributes (
    plan_code integer NOT NULL,
    store_code character varying NOT NULL,
    special_classification character varying NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying NOT NULL
);
COMMENT ON COLUMN assort.plan_cluster_grade_attributes.attribute_value IS 'performance / attribute';
ALTER TABLE assort.plan_cluster_grade_attributes
    ADD CONSTRAINT plan_cluster_grade_attributes_plan_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
ALTER TABLE assort.plan_cluster_grade_attributes
    ADD CONSTRAINT plan_cluster_grade_attributes_store_fk FOREIGN KEY (store_code) REFERENCES global.store_master(store_code) ON DELETE CASCADE;
