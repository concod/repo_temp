--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:plan_cluster_opt_master_wp stripComments:false splitStatements:false context:MTP-46527 labels:plan_cluster_opt_master_wp
--comment: initial changeset for plan_cluster_opt_master_wp
CREATE TABLE assort_smart.plan_cluster_opt_master_wp (
	plan_clu_opt_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	l3_budget_ty float8 NULL DEFAULT 0.0,
	sell_through float8 NULL DEFAULT 0.0,
	penetration_ly float8 NULL DEFAULT 0.0,
	penetration_ty float8 NULL DEFAULT 0.0,
	l3_penetration_ly float8 NULL DEFAULT 0.0,
	l3_penetration_ty float8 NULL DEFAULT 0.0,
	margin_percentage float8 NULL DEFAULT 0.0,
	receipts_quantity_ty float8 NULL DEFAULT 0.0,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	CONSTRAINT plan_cluster_opt_master_wp_pkey PRIMARY KEY (plan_clu_opt_id)
);

--changeset mayank.bhardwaj@impactanalytics.co:plan_cluster_opt_master_wp stripComments:false splitStatements:false context:MTP-60085 labels:liquibase_project_start
--comment: add and drop cols and constraints
ALTER TABLE assort_smart.plan_cluster_opt_master_wp
ADD COLUMN optimization_level varchar NULL,
ADD COLUMN carryover_flag varchar NULL,
ADD COLUMN compare_type int4 NULL,
ADD COLUMN new_l3_flag varchar NULL,
ADD COLUMN is_active bool NULL;

--changeset mayank.bhardwaj@impactanalytics.co:dropping_launch_id_columns stripComments:false splitStatements:false context:MTP-87729 labels:column_dropped
--comment: Dropping column launch_id
ALTER TABLE IF EXISTS assort_smart.plan_cluster_opt_master_wp
DROP COLUMN IF EXISTS launch_id;