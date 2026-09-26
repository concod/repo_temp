--liquibase formatted sql
--changeset liquibase:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter


CREATE TABLE "global".product_attributes_filter (
  product_code varchar NOT NULL,
  product_name varchar NOT NULL,
  product_description text NULL,
  price float8 NULL,
  "cost" float8 NULL,
  original_price float8 NULL,
  active bool NOT NULL,
  clearance bool NOT NULL,
  receipt_date date NULL,
  created_at timestamptz NULL,
  updated_at timestamptz NULL,
  created_by int4 NULL,
  updated_by int4 NULL,
  replacement_product_codes _varchar NULL,
  reference_product_codes _varchar NULL,
  is_deleted bool NULL, -- mandatory till here
 article varchar not null,
super_style_color_code varchar null,
product_id varchar not null,
product_type varchar null,
product_details_en_us varchar null,
l0_name varchar not null,
l1_id varchar not null,
l1_name varchar not null,
l2_id varchar null,
l2_name varchar null,
l3_id varchar not null,
l3_name varchar not null,
l4_id varchar not null,
l4_name varchar not null,
l5_id varchar null,
l5_name varchar null,
l6_id varchar not null,
l6_name varchar not null,
size varchar not null,
size_desc varchar not null,
color varchar not null,
color_description varchar not null,
replenishment_flag varchar null,
inseam varchar null,
inseam_name varchar null,
label_code varchar null,
web_band_size varchar null,
back_type varchar null,
back_type_name varchar null,
coverage_bra varchar null,
coverage_bra_name varchar null,
lining_bra varchar null,
lining_bra_name varchar null,
bust_type varchar null,
bust_type_name varchar null,
closure_type varchar null,
closure_type_name varchar null,
pocket_quantity varchar null,
cup_size varchar null,
fit varchar null,
fit_name varchar null,
height varchar null,
height_name varchar null,
impact_level varchar null,
impact_level_name varchar null,
longline_bra varchar null,
neckline varchar null,
neckline_name varchar null,
sheerness varchar null,
sheerness_name varchar null,
silhouette varchar null,
silhouette_name varchar null,
sleeve_length varchar null,
sleeve_length_name varchar null,
strap_type varchar null,
strap_type_name varchar null,
fabric_feel varchar null,
fabric_weight varchar null,
fabric_stretch varchar null,
sweat_wicking varchar null,
added_construction varchar null,
breathability varchar null,
end_use varchar null,
special_features varchar null,
target_area varchar null,
shapewear_wear_with varchar null,
country_of_origin varchar null,
department varchar null,
wash varchar null,
wash_name varchar null,
length_description varchar null,
length_description_name varchar null,
compression varchar null,
compression_name varchar null,
product_bucket_code bigint null,
vendor_id varchar null,
vendor_desc varchar null,
product_lifecycle varchar null,
style_launch_season varchar null,


CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);


--changeset soumya.sen@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: launch date addition changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS launch_date DATE NULL;

--changeset suchithra.pr@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_start
--comment: addition of columns in product_attributes_filter


ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS ordering varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color_launch_season varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS article_description varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS dimension_pack varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL;


--changeset priyaranjan.pradhan@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:add_exit_dt_paf_test labels:add_exit_date_test
--comment: exit_date addition_test changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS exit_date DATE NULL;


--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_new stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

--changeset divyansh.gupta@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:add_dt_paf labels:add_paf
--comment: columns changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN IF NOT EXISTS collection varchar NULL,
ADD COLUMN IF NOT EXISTS superstyle_name varchar NULL,
ADD COLUMN IF NOT EXISTS superstyle varchar NULL,
ADD COLUMN IF NOT EXISTS collection_desc varchar NULL;
