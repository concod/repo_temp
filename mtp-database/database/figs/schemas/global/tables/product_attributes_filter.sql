--liquibase formatted sql
--changeset liquibase:product_attributes_filter_figs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter


CREATE TABLE "global".product_attributes_filter (
"cost" float8 NULL,
"original_price" float8 NULL,
created_at timestamptz NULL,
updated_at timestamptz NULL,
created_by int4 NULL,
updated_by int4 NULL,
replacement_product_codes _varchar NULL,
reference_product_codes _varchar NULL,
is_deleted bool NULL,
product_code   varchar  not null ,
product_name   varchar  not null ,
product_description   varchar   null ,
l0_name   varchar   not null ,
l1_name   varchar   not null ,
l2_name   varchar   not null ,
l3_name   varchar   not null ,
f_style_franchise   varchar   null ,
price   float   null ,
l4_name   varchar  not null ,
style_name   varchar   null ,
color_name   varchar   null ,
color_family_name   varchar   null ,
color_id   varchar   null ,
tall_petite_size   varchar   null ,
article   varchar   null ,
style_color_code   varchar   null ,
base_size   varchar   null ,
size   varchar   null ,
style_type   varchar   null ,
color_type   varchar   null ,
f_licensed_vs_non_licensed   varchar   null ,
license_type   varchar   null ,
launch_date   date   null ,
f_silhouette   varchar   null ,
f_inseam_body_length   varchar   null ,
f_waistband   varchar   null ,
f_closure   varchar   null ,
f_leg_shape   varchar   null ,
f_neckline   varchar   null ,
f_sleeve_length   varchar   null ,
f_sleeve_type   varchar   null ,
f_rise   varchar   null ,
f_style_fabric   varchar   null ,
clearance   bool   null ,
receipt_date   date   null ,
product_bucket_code   bigint   null ,
active   bool  not null,


CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code,l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);




--changeset priyaranjan.pradhan@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: vendor_id vendor_desc addition changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_id varchar null;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_desc varchar null;
ALTER TABLE "global".product_attributes_filter RENAME COLUMN style_type TO product_lifecycle;

--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN IF NOT EXISTS style_type_v2 varchar null,
ADD COLUMN IF NOT EXISTS factory varchar null,
ADD COLUMN IF NOT EXISTS style_type varchar null,
ADD COLUMN IF NOT EXISTS assort_product_type varchar null;


--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_ordering_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of ordering col changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN IF NOT EXISTS ordering varchar null;


--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_ordering_add_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of ordering col changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN IF NOT EXISTS replenishment_status varchar null;


--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_rename_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment:  changing column name  col changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter 
RENAME COLUMN replenishment_status TO replenish_status;


--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_add_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of ordering col changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN IF NOT EXISTS replenishment_status varchar null;

--changeset priyaranjan.pradhan@impactanalytics.co:product_attributes_filter_add_cols stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment:  addition of ordering col changeset for product_attributes_filters
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);