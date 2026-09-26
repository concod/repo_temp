--liquibase formatted sql
--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v4
CREATE TABLE IF NOT EXISTS "global".product_attributes_filter (
product_code VARCHAR NOT NULL,
l0_id  varchar NULL ,
merchandise_type_code  varchar NULL ,
l0_name  varchar NOT NULL ,
l1_id  varchar NULL ,
commodity_code  varchar NULL ,
l1_name  varchar NULL ,
l2_id  varchar NULL ,
brand_franchise_code  varchar NULL ,
l2_name  varchar NULL ,
brand_franchise_group  varchar NULL ,
l3_id  varchar NULL ,
department_code  varchar NULL ,
l3_name  varchar NULL ,
department_group  varchar NULL ,
l4_id  varchar NULL ,
l4_name  varchar NULL ,
l5_id  varchar NULL ,
l5_name  varchar NULL ,
l6_id  varchar NULL ,
l6_name  varchar NULL ,
l7_id  varchar NULL ,
l7_name  varchar NULL ,
l9_id  varchar NULL ,
l9_name  varchar NULL ,
l10_id  varchar NULL ,
l10_name  varchar NULL ,
country  varchar NULL ,
subclass_desc  varchar NULL ,
color_id  varchar NULL ,
color_desc  varchar NULL ,
size  varchar NULL ,
l8_id  varchar NULL ,
l8_name  varchar NULL ,
current_msrp  float8 NULL ,
msrp  float8 NULL ,
unit_retail_price  float8 NULL ,
price  float8 NULL ,
season_code  varchar NULL ,
season_code_desc  varchar NULL ,
fashion_grade  varchar NULL ,
collection  varchar NULL ,
primary_material_code  varchar NULL ,
primary_material_description  varchar NULL ,
CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added new columns in PAF table
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_name varchar NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_description text NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS cost float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS original_price float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS active bool NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS clearance bool NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS receipt_date date NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS created_at timestamptz NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS created_by int4 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS updated_by int4 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS replacement_product_codes _varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS reference_product_codes _varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS is_deleted bool NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS article varchar NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS length_as_size varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_bucket_code int8 NULL;

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added commodity in PAF table
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS commodity varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v7 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added length_as_size_code in PAF table
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS length_as_size_code varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v9 stripComments:false splitStatements:false context:Release_1_0_v9 labels:liquibase_project_start_v9
--comment: added 10 new fields in PAF table but not really 10
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_type_cnl_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS is_brand_type_deleted bool NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_type_brand_franchise_hierarchy_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_type_department_hierarchy_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS colour_rgb_int varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS colour_rgb_hex varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS colour_rgb_tuple varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v9_0306 stripComments:false splitStatements:false context:Release_1_0_v9_0306 labels:liquibase_project_start_v9_0306
--comment: adding fields to paf for brand 0306
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_type_hierarchy_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_type_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_type_name varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v10_2306 stripComments:false splitStatements:false context:Release_1_0_v10_2306 labels:liquibase_project_start_v10_2306
--comment: adding fields to paf 2306
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_type_brand_franchise_hierarchy_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_type_department_hierarchy_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style_colour_size_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS primary_style_colour_size_id varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v11_0307 stripComments:false splitStatements:false context:Release_1_0_v11_2306 labels:liquibase_project_start_v11_0307
--comment: adding fields to paf 0307
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_franchise_hierarchy_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS department_hierarchy_code varchar NULL;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_1021 stripComments:false splitStatements:false context:Release_1_0_1021 labels:liquibase_project_start_1021
--comment: adding fields to paf 1021
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS merchandise_type_cnl_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand_franchise_cnl_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS department_cnl_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS primary_silhouette_cnl_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS primary_style_cnl_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS raw_material_graphic_name varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS raw_material_graphic_code varchar NULL; 
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS raw_material_graphic_description varchar NULL;