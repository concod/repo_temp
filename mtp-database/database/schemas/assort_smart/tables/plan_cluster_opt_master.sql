--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:plan_cluster_opt_master liquibase:plan_cluster_opt_master stripComments:false splitStatements:false context:plan_code_index_add labels:liquibase_project_start
--comment: initial changeset for plan_cluster_opt_master
CREATE TABLE assort_smart.plan_cluster_opt_master (
	plan_clu_opt_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NULL,
	CONSTRAINT plan_cluster_opt_master_pkey PRIMARY KEY (plan_clu_opt_id)
);

--changeset hemant.kumar@impactanalytics.co:assort_smart.plan_cluster_opt_master liquibase:plan_cluster_opt_master stripComments:false splitStatements:false context:plan_cluster_opt_master_plan_code_idx labels:liquibase_project_start
--comment: initial changeset for plan_cluster_opt_master
CREATE INDEX if not exists plan_cluster_opt_master_plan_code_idx ON assort_smart.plan_cluster_opt_master (plan_code);