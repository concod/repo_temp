--liquibase formatted sql
--changeset sreenivas.s@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

CREATE TABLE IF NOT EXISTS "global".product_attributes_filter (
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
    is_deleted bool NULL,
    article_season_name varchar NULL,
    article_season_year varchar NULL,
    l0_name varchar NOT NULL,
    brand_id varchar NULL,
    brand_name varchar NULL,
    buyer_name varchar NULL,
    category_id varchar NULL,
    category_name varchar NULL,
    color varchar NULL,
    colour_char_name varchar NULL,
    colour_internal_char varchar NULL,
    cross_site_status_id varchar NULL,
    cross_site_status_name varchar NULL,
    generic_article_id varchar NULL,
    generic_article_name varchar NULL,
    info_capacity varchar NULL,
    order_unit varchar NULL,
    unit_of_issue varchar NULL,
    info_capsule varchar NULL,
    info_capsule_description varchar NULL,
    info_design varchar NULL,
    info_design_description varchar NULL,
    info_lifecycle varchar NULL,
    info_lifecycle_description varchar NULL,
    info_material_description varchar NULL,
    info_pattern_description varchar NULL,
    info_range_description varchar NULL,
    info_set_description varchar NULL,
    info_watts_description varchar NULL,
    merchandise_category_id varchar NULL,
    merchandise_category_name varchar NULL,
    purchasing_group_id varchar NULL,
    size_char_name varchar NULL,
    sub_category_id varchar NULL,
    sub_category_name varchar NULL,
    vendor_article_numb varchar NULL,
    vendor_id varchar NULL,
    vendor_name varchar NULL,
    replen_flag bool NULL,
    local_flag bool NULL,
    dropship_flag bool NULL,
    l1_name varchar NOT NULL,
    l2_name varchar NOT NULL,
    l3_name varchar NOT NULL,
    l4_name varchar NOT NULL,
    l5_name varchar NOT NULL,
    style_name varchar NULL,
    article varchar NOT NULL,
    order_counter float8 NULL,
    replen_counter float8 NULL,
    parent_id varchar NULL,
    product_bucket_code varchar NOT NULL,
    "size" varchar NULL,
    CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);


-- "global".product_attributes_filter foreign keys

ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
alter table "global".product_attributes_filter alter column product_bucket_code TYPE bigint USING product_bucket_code::bigint;


--changeset akash.bhandari@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:MTP-61690
--comment: added rcl_hash & psa_codes for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL;

--changeset navin.chandan@impactanalytics.co:product_attributes_filter_sales_org_name stripComments:false splitStatements:false context:Release_1_0 labels:sales_org_name
--comment: added sales_org_name for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS sales_org_name varchar DEFAULT '' NOT NULL;

--changeset samridhi.gupta@impactanalytics.co:product_attributes_filter_plc stripComments:false splitStatements:false context:Release_1_0 labels:prod_life_cycle
--comment: added sales_org_name for product_attributes_filter_plc
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_life_cycle varchar NULL;

--changeset sidhartha.c@impactanalytics.co:product_attributes_filter_ordering stripComments:false splitStatements:false context:Release_1_0 labels:ordering
--comment: added ordering for product_attributes_filter_plc
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS ordering varchar NULL;

--changeset sreenivas.s@impactanalytics.co:product_attributes_filter_drop_cascade stripComments:false splitStatements:false context:Release_1_0 labels:ordering
--comment: added ordering for product_attributes_filter_drop
ALTER TABLE "global".product_attributes_filter DROP COLUMN brand_name CASCADE;

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_add_col stripComments:false splitStatements:false context:Release_1_0 labels:ordering
--comment: added ordering for product_attributes_filter_add

ALTER TABLE "global".product_attributes_filter ADD COLUMN brand_name TEXT NULL;

--changeset samarjit.mazumder@impactanalytics.co:product_attributes_filter_l6_added stripComments:false splitStatements:false context:Release_1_0 labels:product_attributes_filter_l6_added
--comment: added l6_name column for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l6_name varchar NULL;

--changeset ashish:paf_hash_combine_idx_v3 stripComments:false splitStatements:false context:Release_1_0 labels:CI-137
--comment: initial changeset for paf_hash_combine_idx
DROP INDEX IF EXISTS global.paf_hash_combine_idx;
CREATE INDEX IF NOT EXISTS paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, product_code) where active and not is_deleted;

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_columns_add stripComments:false splitStatements:false context:Release_1_0 labels:ordering
--comment: added ordering for product_attributes_filter_add

ALTER TABLE "global".product_attributes_filter ADD COLUMN plan_item_active_flag boolean NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN launch_date date NULL;

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_columns_add_2 stripComments:false splitStatements:false context:Release_1_0 labels:ordering
--comment: added ordering for product_attributes_filter_add

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS info_material_description varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS info_pattern_description varchar;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_columns_add_3 stripComments:false splitStatements:false context:Release_1_0 labels:ordering
--comment: added ordering for product_attributes_filter_add

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS exit_date date;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style_id varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color_id varchar;

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_columns_add_4 stripComments:false splitStatements:false context:Release_1_0 labels:ordering
--comment: added columns to product_attributes_filter_add

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_location varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS anr_active_flag bool;

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_columns_add_5 stripComments:false splitStatements:false context:Release_1_0 labels:ordering
--comment: added columns to product_attributes_filter_add

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS is_nested_type bool;

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);

--changeset raja.duraisamy@impactanalytics.co:product_attributes_filter_article_active_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index on article column for active and ordering = 'Y'
CREATE INDEX paf_article_active_idx ON global.product_attributes_filter (article) WHERE active = true AND ordering = 'Y';