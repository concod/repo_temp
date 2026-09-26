--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co:line_plan_choice_image_upload table  liquibase:line_plan_choice_launch stripComments:false splitStatements:false context:line_plan_choice_image_upload table labels:liquibase_project_start
--comment: initial changeset for line_plan_choice_image_upload

CREATE TABLE IF NOT EXISTS assort_smart.line_plan_image_upload (
	id serial4 NOT NULL,
	hierarchy_code varchar(255) NOT NULL,
	style_id varchar(255) NULL,
	color_id varchar(255) NULL,
	placeholder_id varchar(255) NULL,
	image varchar(255) NULL,
	"attributes" jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by varchar(255) NULL,
	style_name varchar(255) NULL,
	article varchar(255) NULL,
	tableau_image_link varchar(255) NULL,
	choice_id varchar(255) NULL,
	CONSTRAINT line_plan_image_upload_pkey PRIMARY KEY (id),
	CONSTRAINT unique_style_link_attributes UNIQUE (style_id, hierarchy_code)
);

--changeset rishabh.bhkumarardwaj@impactanalytics.co:rename_tables_name stripComments:false splitStatements:false context:rename_tables_name labels:new_column_added_for_tb
--comment: Add new required columns
ALTER TABLE assort_smart.line_plan_image_upload
    ADD COLUMN IF NOT EXISTS min_per_order VARCHAR,
    ADD COLUMN IF NOT EXISTS marketing VARCHAR,
	ADD COLUMN IF NOT EXISTS size_range_type VARCHAR,
	ADD COLUMN IF NOT EXISTS relevant_size text,
	ADD COLUMN IF NOT EXISTS channel text;


--changeset rishabh.bhkumarardwaj@impactanalytics.co:rename_column_name stripComments:false splitStatements:false context:rename_column_name labels:new_column_added_for_tb
--comment: Rename column name
ALTER TABLE assort_smart.line_plan_image_upload 
RENAME COLUMN relevant_size TO relevant_sizes;

ALTER TABLE assort_smart.line_plan_image_upload 
DROP CONSTRAINT unique_style_link_attributes;

ALTER TABLE assort_smart.line_plan_image_upload 
ADD CONSTRAINT unique_article_hierarchy UNIQUE (article, hierarchy_code);

--changeset rishabh.kumar@impactanalytics.co:add_air_auc_column stripComments:false splitStatements:false context:add_air_auc_column labels:new_column_added_for_tb
--comment: Add AIR and AUC 
ALTER TABLE assort_smart.line_plan_image_upload 
ADD COLUMN air float8 NULL,
ADD COLUMN auc float8 NULL;


--changeset rishabh.kumar@impactanalytics.co:add_color_name stripComments:false splitStatements:false context:add_color_name labels:new_column_added_for_tb
--comment: Add Color name
ALTER TABLE assort_smart.line_plan_image_upload 
ADD COLUMN color_name varchar NULL;

--changeset rishabh.kumar@impactanalytics.co:add_color_id stripComments:false splitStatements:false context:add_color_id labels:new_column_added_for_tb
--comment: Add Color Id as constrainst
ALTER TABLE assort_smart.line_plan_image_upload 
DROP CONSTRAINT unique_article_hierarchy;

ALTER TABLE assort_smart.line_plan_image_upload 
ADD CONSTRAINT unique_color_hierarchy UNIQUE (color_id, hierarchy_code);

--changeset rishabh.kumar@impactanalytics.co:add_style_color stripComments:false splitStatements:false context:add_style_color labels:new_column_added_for_tb
--comment: Add Style color
ALTER TABLE assort_smart.line_plan_image_upload 
ADD COLUMN style_color varchar NULL;

ALTER TABLE assort_smart.line_plan_image_upload 
DROP CONSTRAINT unique_color_hierarchy;

ALTER TABLE assort_smart.line_plan_image_upload 
ADD CONSTRAINT unique_style_hierarchy UNIQUE (style_color, hierarchy_code);

--changeset rishabh.bhkumarardwaj@impactanalytics.co:add_new_columns_flex_fix_table_name stripComments:false splitStatements:false context:add_new_columns_flex_fix_table_name labels:new_column_added_for_tb
--comment: Add new required flex columns
ALTER TABLE assort_smart.line_plan_image_upload
    ADD COLUMN IF NOT EXISTS flex_subclass_code VARCHAR,
    ADD COLUMN IF NOT EXISTS flex_subclass VARCHAR,
    ADD COLUMN IF NOT EXISTS flex_size_range VARCHAR;

--changeset ezhil.kannan@impactanalytics.co:add_new_columns_flex_fix_table_name stripComments:false splitStatements:false context:add_new_columns_flex_fix_table_name labels:new_column_added_for_tb
--comment: Add is_image_mapped column
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN is_image_mapped BOOLEAN DEFAULT FALSE;


--changeset rishabh.kumar@impactanalytics.co:add_hierarchy_code_columns stripComments:false splitStatements:false context:add_hierarchy_code_columns labels:new_column_added_for_tb
--comment: Add hierarchy code columns
ALTER TABLE assort_smart.line_plan_image_upload
    ADD COLUMN l1_code VARCHAR,
    ADD COLUMN l2_code VARCHAR,
    ADD COLUMN l3_code VARCHAR;


--changeset rishabh.kumar@impactanalytics.co:add_min_per_order stripComments:false splitStatements:false context:add_min_per_order labels:new_column_added_for_tb
--comment: Add hierarchy code columns
ALTER TABLE assort_smart.line_plan_image_upload
    ADD COLUMN min_per_color VARCHAR;

--changeset rishabh.kumar@impactanalytics.co:add_imu_per stripComments:false splitStatements:false context:add_imu_per labels:new_column_added_for_tb
--comment: Add add_imu_per columns
ALTER TABLE assort_smart.line_plan_image_upload
    ADD COLUMN gross_margin float8;

--changeset kumar.shubham@impactanalytics.co:target_imu_per stripComments:false splitStatements:false context:target_imu_per labels:target_imu_per
--comment: Add target_imu_per column
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN target_imu_per float8 DEFAULT 0 NULL;

--changeset kumar.shubham@impactanalytics.co:imu_per stripComments:false splitStatements:false context:imu_per labels:imu_per
--comment: Add imu_per column
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN imu_per float8 DEFAULT 0 NULL;

--changeset mehul.jain@impactanalytics.co:add_season_code stripComments:false splitStatements:false context:add_season_code labels:add_season_code
--comment: Add season_code column to track style-season mapping
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN season_code int4 NULL;

--changeset kumar.shubham@impactanalytics.co:drop_target_imu_per stripComments:false splitStatements:false context:drop_target_imu_per labels:drop_target_imu_per
--comment: Drop target_imu_per column
ALTER TABLE assort_smart.line_plan_image_upload
DROP COLUMN IF EXISTS target_imu_per;