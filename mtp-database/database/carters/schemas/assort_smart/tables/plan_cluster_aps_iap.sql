--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:plan_cluster_aps_ia stripComments:false splitStatements:false context:MTP-41876   labels:liquibase_project_start
--comment: initial changeset for plan_cluster_aps_iap, add more missing_cols
  CREATE TABLE assort_smart.plan_cluster_aps_iap (
    plan_clu_aps_id serial4 NOT NULL,
    plan_code int4 NOT NULL,
    hierarchy_code text NOT NULL,
    channel int4 NOT NULL,
    launch_id int4 NOT NULL,
    sub_channel int4 NOT NULL,
    cluster_code VARCHAR NULL ,
    cluster_display_name VARCHAR NULL,
    is_final bool NOT NULL DEFAULT false,
    st_ly float8 NULL DEFAULT 0.0,
    st_ty float8 NULL DEFAULT 0.0,
    aps_ly float8 NULL DEFAULT 0.0,
    aps_ty float8 NULL DEFAULT 0.0,
    max_cc float8 NULL DEFAULT 0.0,
    min_cc float8 NULL DEFAULT 0.0,
    cc_threshold float8 NULL DEFAULT 0.0,
    avg_wk_cnt_ly float8 NULL DEFAULT 0.0,
    avg_wk_cnt_ty float8 NULL DEFAULT 0.0,
    aps_cluster_ratio float8 NULL DEFAULT 0.0,
    moq float8 NULL DEFAULT 0.0,
    qty_ly float8 NULL DEFAULT 0.0,
	  qty_ty float8 NULL DEFAULT 0.0,
    avg_wk_ty_changed bool NULL,
    st_clust_ty_changed bool NULL,
    constraint_aps_ty float8 NULL DEFAULT 0.0,
    aps_ty_changed bool NULL,
    CONSTRAINT plan_cluster_aps_iap_pkey PRIMARY KEY (plan_clu_aps_id),
    CONSTRAINT plan_cluster_aps_iap_fk FOREIGN KEY (plan_code) REFERENCES assort_smart.plan_master(plan_code) ON DELETE CASCADE
);

--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.plan_cluster_aps_iap_drop_launch_id stripComments:false splitStatements:false context:MTP-51802 labels:drop_launch_id
--comment: drop launch_id column from plan_cluster_aps_iap

ALTER TABLE assort_smart.plan_cluster_aps_iap
DROP COLUMN IF EXISTS launch_id;