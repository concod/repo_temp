--liquibase formatted sql
--changeset liquibase:plan_cluster_opt_attribute stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_opt_attribute
CREATE TABLE assort_smart.plan_cluster_opt_attribute (
	plan_clu_opt_id int4 NULL,
	attribute_name varchar NOT NULL,
	attribute_value jsonb NOT NULL
);