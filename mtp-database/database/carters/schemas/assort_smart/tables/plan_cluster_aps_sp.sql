--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_cluster_aps_sp stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details


CREATE TABLE IF not exists assort_smart.plan_cluster_aps_sp (
	plan_clu_aps_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code int4 NOT NULL,
	channel int4 NOT NULL,
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
	launch_id int4 NOT NULL,
	CONSTRAINT plan_cluster_aps_sp_pkey PRIMARY KEY (plan_clu_aps_id),
	CONSTRAINT plan_cluster_aps_sp_fk FOREIGN KEY (plan_code) REFERENCES assort_smart.plan_master(plan_code) ON DELETE CASCADE
);

--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.plan_cluster_aps_sp_drop_launch_id stripComments:false splitStatements:false context:MTP-51802 labels:drop_launch_id
--comment: drop launch_id column from plan_cluster_aps_sp

ALTER TABLE assort_smart.plan_cluster_aps_sp
DROP COLUMN IF EXISTS launch_id;