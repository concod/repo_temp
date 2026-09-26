--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_cluster_opt_master_iap stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_cluster_opt_master_iap

CREATE TABLE assort_smart.plan_cluster_opt_master_iap (
	plan_clu_opt_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
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
	CONSTRAINT plan_cluster_opt_master_iap_pkey PRIMARY KEY (plan_clu_opt_id)
);

--changeset ezhil.kannan@impactanalytics.co:assort_smart.plan_cluster_opt_master_iap_sync_idx_starboard stripComments:false splitStatements:false context:aps_st_v3_perf_indexes labels:performance_index
--comment: Align with briscoes performance indexes for aps-st-v3
CREATE INDEX IF NOT EXISTS idx_plan_cluster_opt_master_iap_plan_compare_hier_cluster_1
ON assort_smart.plan_cluster_opt_master_iap (plan_code, compare_type, hierarchy_code, cluster_code);

CREATE INDEX IF NOT EXISTS idx_pcom_iap_plan_compare_carryover ON assort_smart.plan_cluster_opt_master_iap (plan_code, compare_type, carryover_flag);
