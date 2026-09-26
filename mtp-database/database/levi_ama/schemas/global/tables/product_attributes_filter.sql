--liquibase formatted sql
--changeset liquibase:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

CREATE TABLE "global".product_attributes_filter (
    active BOOLEAN NOT NULL,
    article VARCHAR NOT NULL,
    article_description VARCHAR NOT NULL,
    attributes VARCHAR NOT NULL,
    carryover_new VARCHAR NOT NULL,
    clearance BOOLEAN NOT NULL,
    color VARCHAR NOT NULL,
    color_name VARCHAR NOT NULL,
    cost FLOAT8,
    currency_cost FLOAT8 NOT NULL,
    currency_price FLOAT8 NOT NULL,
    dc_assignment VARCHAR NOT NULL,
    display_article VARCHAR NOT NULL,
    display_product_code VARCHAR NOT NULL,
    distributions VARCHAR NOT NULL,
    global_fit_platform VARCHAR NOT NULL,
    l0_code VARCHAR NOT NULL,
    l0_name VARCHAR NOT NULL,
    l1_code VARCHAR NOT NULL,
    l1_name VARCHAR NOT NULL,
    l2_code VARCHAR NOT NULL,
    l2_name VARCHAR NOT NULL,
    l3_code VARCHAR NOT NULL,
    l3_name VARCHAR NOT NULL,
    l4_code VARCHAR NOT NULL,
    l4_name VARCHAR NOT NULL,
    l5_code VARCHAR NOT NULL,
    l5_name VARCHAR NOT NULL,
    l6_code VARCHAR NOT NULL,
    l6_name VARCHAR NOT NULL,
    l7_code VARCHAR NOT NULL,
    l7_name VARCHAR NOT NULL,
    lifecycle VARCHAR NOT NULL,
    markdown_date DATE NOT NULL,
    on_floor_date DATE NOT NULL,
    original_price FLOAT8 NOT NULL,
    price FLOAT8,
    price_status VARCHAR NOT NULL,
    product_bucket_code BIGINT NOT NULL,
    product_channel VARCHAR NOT NULL,
    product_code VARCHAR,
    product_description VARCHAR NOT NULL,
    product_name VARCHAR NOT NULL,
    product_price_positioning VARCHAR NOT NULL,
    product_status VARCHAR NOT NULL,
    season VARCHAR NOT NULL,
    season_name VARCHAR NOT NULL,
    size VARCHAR NOT NULL,
    size_name VARCHAR NOT NULL,
    vir_constraint_flag VARCHAR NOT NULL,
    weeks_of_life INT8 NOT NULL
)
PARTITION BY LIST (l0_name);

--changeset sri.harsha@impactanalytics.co:product_attributes_filter_missing_columns stripComments:false splitStatements:false context:Release_1_0 labels:missing_columns
--comment: added missing columns for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD replacement_product_codes _varchar DEFAULT '{}'::character varying[] NULL;
ALTER TABLE "global".product_attributes_filter ADD reference_product_codes _varchar DEFAULT '{}'::character varying[] NULL;
ALTER TABLE "global".product_attributes_filter ADD receipt_date date NULL;
ALTER TABLE "global".product_attributes_filter ADD created_at timestamptz DEFAULT now() NULL;
ALTER TABLE "global".product_attributes_filter ADD updated_at timestamptz DEFAULT now() NULL;
ALTER TABLE "global".product_attributes_filter ADD created_by int4 NULL;
ALTER TABLE "global".product_attributes_filter ADD updated_by int4 NULL;
ALTER TABLE "global".product_attributes_filter ADD is_deleted bool DEFAULT false NULL;
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;
ALTER TABLE "global".product_attributes_filter ADD rcl_hash jsonb DEFAULT '{}'::jsonb NULL;

CREATE UNIQUE INDEX paf_product_idx ON global.product_attributes_filter USING btree (product_code, l0_name);

CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);

CREATE INDEX product_attributes_filter_rcl_hash_idx ON global.product_attributes_filter USING gin (rcl_hash);

--changeset sri.harsha@impactanalytics.co:product_attributes_filter_datatype_change stripComments:false splitStatements:false context:Release_1_0 labels:datatype change
--comment: added missing columns for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ALTER COLUMN product_description TYPE text USING product_description::text;

--changeset sri.harsha@impactanalytics.co:product_attributes_filter_psa_codes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_psa_codes
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes varchar[] DEFAULT '{}'::varchar[] NOT NULL;

--changeset himansh.bhardwaj@impactanalytics.co:product_attributes_filter_attributes_column_removed stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Dropped attributes column from psf
ALTER TABLE "global".product_attributes_filter DROP COLUMN attributes;

--changeset sri.harsha@impactanalytics.co:product_attributes_filter_new_columns stripComments:false splitStatements:false context:Release_1_0 labels:datatype change
--comment: added missing columns for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN primary_product_code VARCHAR NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN current_price FLOAT8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN subcategory VARCHAR NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN internal_name VARCHAR NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN upc_ean VARCHAR NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN volume_rank INT8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN pc9_replacer VARCHAR NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN store_volume INT8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN door_count INT8 NULL;

--changeset sri.harsha@impactanalytics.co:product_attributes_filter_dropping_null_columns stripComments:false splitStatements:false context:Release_1_0 labels:datatype change
--comment: dropping null for product_attributes_filter
ALTER TABLE global.product_attributes_filter ALTER COLUMN carryover_new DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN color DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN color_name DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN currency_cost DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN currency_price DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN dc_assignment DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN distributions DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN global_fit_platform DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN lifecycle DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN markdown_date DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN on_floor_date DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN original_price DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN price_status DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN product_price_positioning DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN vir_constraint_flag DROP NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN weeks_of_life DROP NOT NULL;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

    
--changeset himansh.bhardwaj@impactanalytics.co:paf_hash_combine_idx_and_paf_article_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index
create index IF NOT EXISTS paf_hash_combine_idx on global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, l3_name, product_code) WHERE (active AND (NOT is_deleted));
create index IF NOT EXISTS paf_article_idx on global.product_attributes_filter USING btree (article);

--changeset ashish@impactanalytics.co:reset_all_index stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: reset_all_index
DROP INDEX IF EXISTS "global"."paf_hash_combine_idx";
DROP INDEX IF EXISTS "global"."paf_article_combine_idx";
DROP INDEX IF EXISTS "global"."paf_article_idx";
DROP INDEX IF EXISTS "global"."product_attributes_filter_product_code_idx";
DROP INDEX IF EXISTS "global"."paf_product_idx";
DROP INDEX IF EXISTS "global"."product_attributes_filter_rcl_hash_idx";
DROP INDEX IF EXISTS "global"."product_attributes_filter_l0_name_idx";

CREATE INDEX paf_article_combine_idx ON global.product_attributes_filter USING btree (l0_name, article, product_code) WHERE (active AND (NOT is_deleted));
CREATE INDEX paf_article_idx ON global.product_attributes_filter USING btree (article);
CREATE INDEX paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, l3_name, product_code, rcl_hash) WHERE (active AND (NOT is_deleted));
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
CREATE INDEX product_attributes_filter_rcl_hash_idx ON global.product_attributes_filter USING gin (rcl_hash);


--changeset prince.kumar@impactanalytics.co:modifying_the_constraints stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding a new columnn intro_date
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS intro_date DATE NULL;

--changeset prince.kumar@impactanalytics.co:partition_logic stripComments:false splitStatements:false context:Release_1_0 labels:partition_logic
--comment: removed the l1_name in PK for partition logic.

ALTER TABLE IF EXISTS global.product_attributes_filter DROP CONSTRAINT IF EXISTS product_attributes_filter_pk;
ALTER TABLE IF EXISTS global.product_attributes_filter ADD CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name);


--changeset prince.kumar@impactanalytics.co:update_paf_columns stripComments:false splitStatements:false context:Release_1_0 labels:paf_changes
--comment: Dropping weeks_of_life, volume_rank, store_volume, door_count; adding mfp_categorization

ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS weeks_of_life;

ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS volume_rank;

ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS store_volume;

ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS door_count;

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS mfp_categorization VARCHAR NULL;