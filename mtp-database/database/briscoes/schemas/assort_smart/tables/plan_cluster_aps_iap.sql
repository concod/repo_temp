--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_cluster_aps_iap stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_cluster_aps_iap

CREATE TABLE IF not exists assort_smart.plan_cluster_aps_iap (
	plan_clu_aps_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	sub_channel int4 NOT NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	is_final bool DEFAULT false NOT NULL,
	st_ly float8 DEFAULT 0.0 NULL,
	st_ty float8 DEFAULT 0.0 NULL,
	aps_ly float8 DEFAULT 0.0 NULL,
	aps_ty float8 DEFAULT 0.0 NULL,
	max_cc float8 DEFAULT 0.0 NULL,
	min_cc float8 DEFAULT 0.0 NULL,
	cc_threshold float8 DEFAULT 0.0 NULL,
	avg_wk_cnt_ly float8 DEFAULT 0.0 NULL,
	avg_wk_cnt_ty float8 DEFAULT 0.0 NULL,
	aps_cluster_ratio float8 DEFAULT 0.0 NULL,
	moq float8 DEFAULT 0.0 NULL,
	qty_ly float8 DEFAULT 0.0 NULL,
	qty_ty float8 DEFAULT 0.0 NULL,
	avg_wk_ty_changed bool NULL,
	st_clust_ty_changed bool NULL,
	constraint_aps_ty float8 DEFAULT 0.0 NULL,
	aps_ty_changed bool NULL,
	compare_type int4 NULL,
	season_code int4 NULL,
	CONSTRAINT plan_cluster_aps_iap_pkey PRIMARY KEY (plan_clu_aps_id),
	CONSTRAINT plan_cluster_aps_iap_fk FOREIGN KEY (plan_code) REFERENCES assort_smart.plan_master(plan_code) ON DELETE CASCADE
);

--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.plan_cluster_aps_iap_drop_launch_id stripComments:false splitStatements:false context:MTP-51802 labels:drop_launch_id
--comment: drop launch_id column from plan_cluster_aps_iap

ALTER TABLE assort_smart.plan_cluster_aps_iap
DROP COLUMN IF EXISTS launch_id;

--changeset ezhil.kannan@impactanalytics.co:assort_smart.plan_cluster_aps_iap_plan_code_idx stripComments:false splitStatements:false context:aps_st_v3_perf_indexes labels:performance_index
--comment: Add plan_code index for DELETE/SELECT performance in aps-st-v3
CREATE INDEX IF NOT EXISTS idx_plan_cluster_aps_iap_plan_code ON assort_smart.plan_cluster_aps_iap (plan_code);

--changeset ezhil.kannan@impactanalytics.co:assort_smart.plan_cluster_aps_iap_plan_compare_idx stripComments:false splitStatements:false context:aps_st_v3_perf_indexes labels:performance_index
--comment: Add (plan_code, compare_type) index to speed APS-ST compare_type reads
CREATE INDEX IF NOT EXISTS idx_plan_cluster_aps_iap_plan_compare ON assort_smart.plan_cluster_aps_iap (plan_code, compare_type);

--changeset ezhil.kannan@impactanalytics.co:assort_smart.plan_cluster_aps_iap_plan_season_hier_cluster_idx stripComments:false splitStatements:false context:aps_st_v3_perf_indexes labels:performance_index
--comment: Add update-path index for APS-ST cluster updates on plan/season/hierarchy/cluster
CREATE INDEX IF NOT EXISTS idx_plan_cluster_aps_iap_plan_season_hier_cluster ON assort_smart.plan_cluster_aps_iap (plan_code, season_code, hierarchy_code, cluster_code);