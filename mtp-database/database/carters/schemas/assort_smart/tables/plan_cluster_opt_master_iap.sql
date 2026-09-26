--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co:plan_cluster_opt_master_iap stripComments:false splitStatements:false context:MTP-60085 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_opt_master_iap
CREATE TABLE assort_smart.plan_cluster_opt_master_iap (
	plan_clu_opt_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	l3_budget_ty float8 DEFAULT 0.0 NULL,
	sell_through float8 DEFAULT 0.0 NULL,
	penetration_ly float8 DEFAULT 0.0 NULL,
	penetration_ty float8 DEFAULT 0.0 NULL,
	l3_penetration_ly float8 DEFAULT 0.0 NULL,
	l3_penetration_ty float8 DEFAULT 0.0 NULL,
	margin_percentage float8 DEFAULT 0.0 NULL,
	receipts_quantity_ty float8 DEFAULT 0.0 NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	optimization_level varchar NULL,
	carryover_flag varchar NULL,
	compare_type int4 NULL,
	new_l3_flag varchar NULL,
	is_active bool NULL,
	CONSTRAINT plan_cluster_opt_master_iap_pkey PRIMARY KEY (plan_clu_opt_id)
);

--changeset mayank.bhardwaj@impactanalytics.co:dropping_launch_id_column stripComments:false splitStatements:false context:MTP-87729 labels:column_dropped
--comment: Dropping column launch_id
ALTER TABLE IF EXISTS assort_smart.plan_cluster_opt_master_iap
DROP COLUMN IF EXISTS launch_id;