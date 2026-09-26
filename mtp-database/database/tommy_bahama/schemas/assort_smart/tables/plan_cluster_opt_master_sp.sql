--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_cluster_opt_master_sp stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_cluster_opt_master_sp

CREATE TABLE IF not exists assort_smart.plan_cluster_opt_master_sp (
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
	optimization_level varchar(255) NULL,
	carryover_flag varchar(255) NULL,
	compare_type int4 NULL,
	new_l3_flag varchar(255) NULL,
	is_active bool NULL,
	CONSTRAINT plan_cluster_opt_master_sp_pkey PRIMARY KEY (plan_clu_opt_id)
);

--changeset mayank.bhardwaj@impactanalytics.co liquibase:drop_launch_id_column stripComments:false splitStatements:false context:MTP-87729 labels:liquibase_project_start
--comment: Drop column launch_id
ALTER TABLE IF EXISTS assort_smart.plan_cluster_opt_master_sp
DROP COLUMN IF EXISTS launch_id;

--changeset ezhil.kannan@impactanalytics.co liquibase:bop_units_ly_default_set_sp_2 stripComments:false splitStatements:false context:add-index-for-join-optimize_2 labels:liquibase_project_start
--comment: Add index for join optimize
CREATE INDEX IF NOT EXISTS idx_plan_cluster_opt_master_sp_plan_compare_hier_cluster_1
ON assort_smart.plan_cluster_opt_master_sp (plan_code, compare_type, hierarchy_code, cluster_code);

--changeset ezhil.kannan@impactanalytics.co:assort_smart.plan_cluster_opt_master_sp_perf_idx_tommy stripComments:false splitStatements:false context:aps_st_v3_perf_indexes labels:performance_index
--comment: Composite index for rcvd_units queries in aps-st-v3
CREATE INDEX IF NOT EXISTS idx_pcom_sp_plan_compare_carryover ON assort_smart.plan_cluster_opt_master_sp (plan_code, compare_type, carryover_flag);