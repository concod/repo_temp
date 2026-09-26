--liquibase formatted sql
--changeset liquibase:plan_cluster_aps stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_aps
CREATE TABLE assort_smart.plan_cluster_aps (
	plan_clu_aps_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	is_final bool NOT NULL DEFAULT false,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_cluster_aps_pkey PRIMARY KEY (plan_clu_aps_id)
);
--changeset hemant.kumar@impactanalytics.co:assort_smart.plan_cluster_aps liquibase:plan_cluster_aps stripComments:false splitStatements:false context:plan_code_add_in_index labels:liquibase_project_start
--comment: initial changeset for plan_cluster_aps
CREATE INDEX plan_cluster_aps_plan_code_idx ON assort_smart.plan_cluster_aps (plan_code);
