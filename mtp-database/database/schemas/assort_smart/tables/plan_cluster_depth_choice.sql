--liquibase formatted sql
--changeset liquibase:plan_cluster_depth_choice stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_depth_choice
CREATE TABLE assort_smart.plan_cluster_depth_choice (
	plan_cls_depth_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_cluster_depth_choice_pkey PRIMARY KEY (plan_cls_depth_id)
);
--changeset hemant.kumar@impactanalytics.co:assort_smart.plan_cluster_depth_choice liquibase:plan_cluster_depth_choice stripComments:false splitStatements:false context:plan_code_add_in_index labels:liquibase_project_start
--comment: initial changeset for plan_cluster_depth_choice
CREATE INDEX plan_cluster_depth_choice_plan_code_idx ON assort_smart.plan_cluster_depth_choice (plan_code);
