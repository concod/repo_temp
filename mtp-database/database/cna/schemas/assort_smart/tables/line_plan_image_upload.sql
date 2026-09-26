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

--changeset kumar.shubham@impactanalytics.co:add_style_hierarchy_constraint_12 stripComments:false splitStatements:false context:rename_tables_name_12 labels:new_column_added_for_briscoes
--comment: add_style_hierarchy_constraint12
ALTER TABLE assort_smart.line_plan_image_upload
    ADD COLUMN IF NOT EXISTS min_per_order VARCHAR,
    ADD COLUMN IF NOT EXISTS marketing VARCHAR,
	ADD COLUMN IF NOT EXISTS size_range_type VARCHAR,
	ADD COLUMN IF NOT EXISTS relevant_sizes text,
	ADD COLUMN IF NOT EXISTS channel text,
	ADD COLUMN IF NOT EXISTS air float8 NULL,
	ADD COLUMN IF NOT EXISTS auc float8 NULL,
	ADD COLUMN IF NOT EXISTS color_name varchar NULL,
	ADD COLUMN IF NOT EXISTS style_color varchar NULL;

ALTER TABLE assort_smart.line_plan_image_upload 
DROP CONSTRAINT IF EXISTS unique_style_link_attributes;

ALTER TABLE assort_smart.line_plan_image_upload
DROP CONSTRAINT IF EXISTS unique_style_hierarchy;

ALTER TABLE assort_smart.line_plan_image_upload 
ADD CONSTRAINT unique_style_hierarchy UNIQUE (style_color, hierarchy_code);

--changeset ezhil.kannan@impactanalytics.co:add_new_columns_flex_fix_table_name stripComments:false splitStatements:false context:add_new_columns_flex_fix_table_name labels:new_column_added_for_tb
--comment: Add is_image_mapped column
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN is_image_mapped BOOLEAN DEFAULT FALSE;

--changeset mehul.jain@impactanalytics.co:add_new_columns_flex_fix_table_name stripComments:false splitStatements:false context:add_new_columns_flex_fix_table_name labels:new_column_added_for_briscoes
--comment: Add new template columns
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN IF NOT EXISTS product_type VARCHAR NULL,
ADD COLUMN IF NOT EXISTS existing_rebel_id VARCHAR NULL,
ADD COLUMN IF NOT EXISTS wholesale_cost FLOAT8 NULL,
ADD COLUMN IF NOT EXISTS expected_launch_date TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS notes TEXT NULL,
ADD COLUMN IF NOT EXISTS launch_date_embargo TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS product_description TEXT NULL,
ADD COLUMN IF NOT EXISTS half_sizes_available BOOLEAN NULL,
ADD COLUMN IF NOT EXISTS product_range VARCHAR NULL;


--changeset ezhil.kannan@impactanalytics.co:add_season_code stripComments:false splitStatements:false context:add_season_code labels:add_season_code
--comment: Add season_code column to track style-season mapping
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN season_code int4 NULL;

--changeset mehul.jain@impactanalytics.co:add_product_attribute_columns stripComments:false splitStatements:false context:add_product_attribute_columns labels:new_columns_for_briscoes
--comment: Add product attribute columns for image upload template
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN IF NOT EXISTS fit varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS width varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS season varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS license varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pattern varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS material varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS down_ratio varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS season_year varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS thread_count varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS value_stream varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS color_family varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country_of_origin varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_architecture varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS available_size_range varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS material_composition varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sustainability varchar(255) DEFAULT NULL;

--changeset mehul.jain@impactanalytics.co:rename_columns_to_match_tenant_config stripComments:false splitStatements:false context:rename_columns_to_match_tenant_config labels:column_rename_for_consistency
--comment: Rename columns to match tenant_attribute_master configuration
ALTER TABLE assort_smart.line_plan_image_upload
RENAME COLUMN auc TO aic;

ALTER TABLE assort_smart.line_plan_image_upload
RENAME COLUMN relevant_sizes TO relevant_size;

ALTER TABLE assort_smart.line_plan_image_upload
RENAME COLUMN product_range TO range;

ALTER TABLE assort_smart.line_plan_image_upload
RENAME COLUMN tableau_image_link TO image_name_url;

--changeset mehul.jain@impactanalytics.co:rename_columns_to_match_frontend stripComments:false splitStatements:false context:rename_columns_to_match_frontend labels:rename_columns_to_match_frontend
--comment: Rename columns to match frontend configuration

ALTER TABLE assort_smart.line_plan_image_upload
RENAME COLUMN image_name_url TO tableau_image_link;

--changeset rishabh.swarnkar@impactanalytics.co:MTP-124941 drop_unwanted_columns stripComments:false splitStatements:false context:drop_unwanted_columns labels:drop_unwanted_columns
--comment: Drop unwanted columns
-- Drop columns from line_plan_image_upload table
ALTER TABLE assort_smart.line_plan_image_upload
    DROP COLUMN IF EXISTS product_description;