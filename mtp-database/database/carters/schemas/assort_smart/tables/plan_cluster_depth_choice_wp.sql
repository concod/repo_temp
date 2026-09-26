--liquibase formatted sql
--changeset pramodgowda.kl@impactanalytics.co :assort_smart.plan_cluster_depth_choice_wp stripComments:false splitStatements:false context:MTP-60789 labels:update_tables
--comment: table_update




CREATE TABLE IF not exists assort_smart.plan_cluster_depth_choice_wp (
	plan_cls_depth_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	max_cc float8 DEFAULT 0.0 NULL,
	qty_ty float8 DEFAULT 0.0 NULL,
	depth_ly float8 DEFAULT 0.0 NULL,
	depth_ty float8 DEFAULT 0.0 NULL,
	choice_ly float8 DEFAULT 0.0 NULL,
	choice_ty float8 DEFAULT 0.0 NULL,
	store_cnt float8 DEFAULT 0.0 NULL,
	cc_threshold float8 DEFAULT 0.0 NULL,
	total_choice_count_ly float8 DEFAULT 0.0 NULL,
	total_choice_count_ty float8 DEFAULT 0.0 NULL,
	aur_ly float8 DEFAULT 0.0 NULL,
	aur_ty float8 DEFAULT 0.0 NULL,
	qty_ly float8 DEFAULT 0.0 NULL,
	quarter float8 DEFAULT 0.0 NULL,
	"prod$_ly" float8 DEFAULT 0.0 NULL,
	"prod$_ty" float8 DEFAULT 0.0 NULL,
	st_clust_ly float8 DEFAULT 0.0 NULL,
	st_clust_ty float8 DEFAULT 0.0 NULL,
	cc_min_limit float8 DEFAULT 0.0 NULL,
	avg_wk_cnt_ly float8 DEFAULT 0.0 NULL,
	avg_wk_cnt_ty float8 DEFAULT 0.0 NULL,
	CONSTRAINT plan_cluster_depth_choice_wp_pkey PRIMARY KEY (plan_cls_depth_id)
);
CREATE INDEX plan_cluster_depth_choice__wp_plan_code_idx ON assort_smart.plan_cluster_depth_choice_wp USING btree (plan_code);


ALTER TABLE assort_smart.plan_cluster_depth_choice_wp 
DROP COLUMN IF EXISTS aur_ly,
DROP COLUMN IF EXISTS aur_ty,
DROP COLUMN IF EXISTS qty_ly,
DROP COLUMN IF EXISTS quarter,
DROP COLUMN IF EXISTS prod$_ly,
DROP COLUMN IF EXISTS prod$_ty,
DROP COLUMN IF EXISTS st_clust_ly,
DROP COLUMN IF EXISTS st_clust_ty,
DROP COLUMN IF EXISTS cc_min_limit,
DROP COLUMN IF EXISTS avg_wk_cnt_ly,
DROP COLUMN IF EXISTS avg_wk_cnt_ty,
ADD COLUMN compare_type int,
ADD COLUMN total_depth_ly float,
ADD COLUMN total_depth_ty float;

--changeset abhilash.kirtikumar@impactanalytics.co:plan_cluster_depth_choice_wp stripComments:false splitStatements:false context:MTP-48672 labels:new_column_added_to_wp
--comment: added column to plan_cluster_depth_choice_wp
ALTER TABLE IF exists assort_smart.plan_cluster_depth_choice_wp
ADD COLUMN IF NOT exists min_cc NUMERIC NULL;

--changeset pulimallika.teja@impactanalytics.co:plan_cluster_opt_attribute_wp_updated stripComments:false splitStatements:false context:MTP-60085 labels:liquibase_project_start
--comment: Cascading updated
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND constraint_name = 'fk_plan_cluster_opt_master_wp'
    ) THEN
        ALTER TABLE IF EXISTS assort_smart.plan_cluster_opt_attribute_wp
        ADD CONSTRAINT fk_plan_cluster_opt_master_wp
        FOREIGN KEY (plan_clu_opt_id)
        REFERENCES assort_smart.plan_cluster_opt_master_wp(plan_clu_opt_id)
        ON DELETE CASCADE;
    END IF;
END $$;