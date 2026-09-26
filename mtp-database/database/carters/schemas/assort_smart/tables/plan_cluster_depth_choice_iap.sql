--liquibase formatted sql
--changeset pramodgowda.kl@impactanalytics.co:assort_smart.plan_cluster_depth_choice_iap stripComments:false splitStatements:false context:MTP-60789 labels:update_tables
--comment: table_update




CREATE TABLE IF not exists assort_smart.plan_cluster_depth_choice_iap (
	cluster_bucket_code serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code int4 NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	cluster_id int4 NOT NULL,
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
	CONSTRAINT plan_cluster_depth_choice_iap_pkey PRIMARY KEY (cluster_bucket_code)
);

ALTER TABLE assort_smart.plan_cluster_depth_choice_iap 
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
ADD COLUMN IF NOT EXISTS compare_type int,
ADD COLUMN IF NOT EXISTS total_depth_ly float,
ADD COLUMN IF NOT EXISTS total_depth_ty float;

--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co :assort_smart.plan_cluster_depth_choice_iap_alter_column_checksum_fix stripComments:false splitStatements:false context:MTP-66690-check-sum-fix labels:update_tables
--comment: Add auto-increment key check sum fix
ALTER TABLE assort_smart.plan_cluster_depth_choice_iap ADD COLUMN IF NOT EXISTS plan_cls_depth_id serial4 NOT NULL;

--changeset abhilash.kirtikumar@impactanalytics.co:plan_cluster_depth_choice_iap stripComments:false splitStatements:false context:MTP-48672 labels:new_column_added_to_iap
--comment: added column to plan_cluster_depth_choice_iap
ALTER TABLE IF exists assort_smart.plan_cluster_depth_choice_iap
ADD COLUMN IF NOT exists min_cc NUMERIC NULL;

--changeset pulimallika.teja@impactanalytics.co:plan_cluster_opt_attribute_iap_updated stripComments:false splitStatements:false context:MTP-60085 labels:liquibase_project_start
--comment: Cascading updated
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND constraint_name = 'fk_plan_cluster_opt_master_iap'
    ) THEN
        ALTER TABLE IF EXISTS assort_smart.plan_cluster_opt_attribute_iap
        ADD CONSTRAINT fk_plan_cluster_opt_master_iap
        FOREIGN KEY (plan_clu_opt_id)
        REFERENCES assort_smart.plan_cluster_opt_master_iap(plan_clu_opt_id)
        ON DELETE CASCADE;
    END IF;
END $$;

--changeset rishabh.kumar@impactanalytics.co:add_cluster_code_column stripComments:false splitStatements:false context:add_cluster_code_column labels:liquibase_project_start
--comment: Add cluster code column
ALTER TABLE IF exists assort_smart.plan_cluster_depth_choice_iap
ADD COLUMN IF NOT exists cluster_code varchar(255) NULL;

--changeset rishabh.kumar@impactanalytics.co:add_cluster_display_column stripComments:false splitStatements:false context:add_cluster_display_column labels:liquibase_project_start
--comment: Add cluster display name column
ALTER TABLE IF exists assort_smart.plan_cluster_depth_choice_iap
ADD COLUMN IF NOT exists cluster_display_name varchar(255) NULL;

--changeset abhilash.kirtikumar@impactanalytics.co:corrected_data_type stripComments:false splitStatements:false context:corrected_data_types_carters labels:liquibase_project_start
--comment: correcting_data_type_of_columns_carters
ALTER TABLE IF EXISTS assort_smart.plan_cluster_depth_choice_iap
ALTER COLUMN hierarchy_code TYPE text;