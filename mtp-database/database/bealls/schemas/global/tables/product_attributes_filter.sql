--liquibase formatted sql
--changeset praharsh.snehi@impactanalytics.co:product_attributes_filter_02 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter, skip chekc
CREATE TABLE IF NOT EXISTS "global".product_attributes_filter (
    product_code varchar NOT NULL,
    product_name varchar NOT NULL,
    product_description varchar NULL,
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
    l0_id varchar NOT NULL,
    l0_name varchar NOT NULL,
    size varchar NOT NULL,
    l1_id varchar NOT NULL,
    l1_name varchar NOT NULL,
    brand varchar NOT NULL,
    l2_id varchar NOT NULL,
    l2_name varchar NOT NULL,
    l3_id varchar NOT NULL,
    l3_name varchar NOT NULL,
    l4_id varchar NOT NULL,
    l4_name varchar NOT NULL,
    color varchar NOT NULL,
    color_name varchar NOT NULL,
    style_color_id varchar NOT NULL,
    article varchar NOT NULL,
    size_name varchar NULL,
    launch_date date NULL,
    clearance_start_date date NULL,
    product_bucket_code int8 NULL,
    product_channel int4 NULL,
    vendor_case_pack int4 NULL,
    l3_name_brand varchar NULL,
    supersede_flag bool NULL,
    l5_id varchar NOT NULL,
    l5_name varchar NOT NULL,
    sku varchar NOT NULL,
    upc varchar NOT NULL,
    default_sku_flag int4 NULL,
    vendor varchar NULL,
    vendor_name varchar NULL,
    product_status varchar NULL,
    product_life_cycle varchar NULL,
    season_code varchar NULL,
    fashion_grade varchar NULL,
    price_status varchar NULL,
    season_code_desc varchar NULL,
    collection varchar NULL,
    material varchar NULL,
    exit_date DATE NULL,
    brand_level varchar NULL,
    CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code,l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX IF NOT EXISTS product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX IF NOT EXISTS product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter DROP CONSTRAINT IF EXISTS product_attributes_filter_fk;
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_01 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

--changeset ujjawal.singh@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: column type, adding(rcl_hash, psa_code) , drop constraints , drop indexes , create missing index

ALTER TABLE "global".product_attributes_filter
ALTER COLUMN product_description TYPE text;

ALTER TABLE "global".product_attributes_filter
ADD COLUMN if not exists rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN if not exists psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL;

ALTER TABLE "global".product_attributes_filter
DROP CONSTRAINT IF EXISTS product_attributes_filter_fk;

DROP INDEX IF EXISTS product_attributes_filter_l0_name_idx;
DROP INDEX IF EXISTS product_attributes_filter_product_code_idx;

CREATE INDEX paf_l1_name ON  global.product_attributes_filter USING btree (l1_name);



--changeset ujjawal.singh@impactanalytics.co:product_attributes_filter_01 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: master division addition

ALTER TABLE "global".product_attributes_filter
ADD COLUMN if not exists l6_id varchar;
ALTER TABLE "global".product_attributes_filter
ADD COLUMN if not exists l6_name varchar;


--changeset ujjawal.singh@impactanalytics.co:product_attributes_filter_02 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: style_color_description addition
ALTER TABLE "global".product_attributes_filter
ADD COLUMN if not exists style_color_description varchar ;