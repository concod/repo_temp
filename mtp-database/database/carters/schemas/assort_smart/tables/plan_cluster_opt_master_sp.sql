--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_cluster_opt_master_sp stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details
CREATE TABLE IF not exists assort_smart.plan_cluster_opt_master_sp (
	plan_code int4 NOT NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	carryover_flag varchar NULL,
	optimization_level varchar NULL,
	compare_type int4 NOT NULL,
	new_l3_flag bool DEFAULT false NOT NULL,
	penetration_ly float8 DEFAULT 0.0 NULL,
	penetration_ty float8 DEFAULT 0.0 NULL,
	margin_percentage float8 DEFAULT 0.0 NULL,
	sell_through float8 DEFAULT 0.0 NULL,
	l3_penetration_ly float8 DEFAULT 0.0 NULL,
	l3_penetration_ty float8 DEFAULT 0.0 NULL,
	receipts_quantity_ty float8 DEFAULT 0.0 NULL,
	hierarchy_code text NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	season_code int4 NOT NULL
);

--changeset mayank.bhardwaj@impactanalytics.co:plan_cluster_opt_master_sp stripComments:false splitStatements:false context:MTP-60085 labels:liquibase_project_start
--comment: add and drop cols and constraints
ALTER TABLE assort_smart.plan_cluster_opt_master_sp
ADD COLUMN IF NOT EXISTS plan_clu_opt_id SERIAL NOT NULL,
ADD COLUMN IF NOT EXISTS is_active bool NULL,
ADD COLUMN IF NOT EXISTS l3_budget_ty float8 DEFAULT 0.0 NULL;

ALTER TABLE assort_smart.plan_cluster_opt_master_sp
ALTER COLUMN compare_type TYPE int4,
ALTER COLUMN compare_type DROP NOT NULL,
ALTER COLUMN new_l3_flag TYPE varchar,
ALTER COLUMN new_l3_flag DROP NOT NULL;

ALTER TABLE assort_smart.plan_cluster_opt_master_sp
ADD CONSTRAINT plan_cluster_opt_master_sp_pkey PRIMARY KEY (plan_clu_opt_id);

--changeset mayank.bhardwaj@impactanalytics.co:dropping_launch_id_columns stripComments:false splitStatements:false context:MTP-87729 labels:column_dropped
--comment: Dropping column launch_id
ALTER TABLE IF EXISTS assort_smart.plan_cluster_opt_master_sp
DROP COLUMN IF EXISTS launch_id;