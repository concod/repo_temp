--liquibase formatted sql
--changeset swapnil-bhange-v3:product_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:product_attributes_filter_v3
--comment: initial changeset for product_attributes_filter v3

-- "global".product_attributes_filter definition
-- DROP TABLE "global".product_attributes_filter;

CREATE TABLE if not exists "global".product_attributes_filter (
product_code varchar NOT NULL,
product_name varchar NOT NULL,
active boolean default false,
l0_name varchar NOT NULL,
l1_name varchar NOT NULL,
l2_name varchar NOT NULL,
l3_name varchar NOT NULL,
style_id varchar NOT NULL,
article varchar NOT NULL,
sku_id varchar NULL,
pgr varchar NOT NULL,
product_group varchar NOT NULL,
sgr varchar NOT NULL,
sub_group varchar NOT NULL,
typ varchar NOT NULL,
finish varchar NOT NULL,
grp_number varchar NULL,
subclass_desc varchar NULL,
vendor_id varchar NULL,
vendor varchar NULL,
style_name varchar NULL,
color_id varchar NULL,
color_name varchar NULL,
color_family_name varchar NULL,
size varchar NULL,
product_status boolean NULL,
launch_date date NULL,
season_code varchar NULL,
season_code_desc varchar NULL,
fashion_grade varchar NULL,
exit_date date NULL,
brand varchar NULL,
material varchar NULL,
product_lifecycle varchar NULL,
final_range varchar NOT NULL,
stat_period varchar NOT NULL,
origin varchar NOT NULL,
sales_area varchar NOT NULL,
product_bucket_code bigint NOT NULL,
parent_id varchar NULL,
psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL,
CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name)
;

CREATE INDEX IF NOT EXISTS product_attributes_filter_product_code_idx ON "global".product_attributes_filter (product_code);

--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_columns_add stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS cost float8;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS created_by int4;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS updated_by int4;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS replacement_product_codes _varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS reference_product_codes _varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS price float8;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS receipt_date date;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS clearance boolean;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_description varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS is_deleted boolean;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS original_price float8;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_aunz varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS origin_ausnz varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS origin_euuk varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_africa varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS origin_africa varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_asia varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS origin_asia varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_americas varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS origin_americas varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_euuk varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l4_name varchar;

--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_column_add_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_name varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS price_status varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS original_sku varchar;


--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_column_added_col_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v3
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb NOT NULL DEFAULT '{}'::jsonb;

--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_columns_rename_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v2

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_au_nz varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS origin_au_nz varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS origin_eu_uk varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_usa varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS origin_usa varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS range_eu_uk varchar;

--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_column_drop_col_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS sku_id;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS final_range;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS style_id;

--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_new_index stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_new_index
CREATE INDEX product_attributes_filter_rcl_hash_idx ON "global".product_attributes_filter USING gin (rcl_hash);


--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_columns_add2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v2

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS display_article varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS display_product_code varchar;


--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_column_rename stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v2

ALTER TABLE "global".product_attributes_filter
RENAME COLUMN product_lifecycle TO product_life_cycle;


--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_column_addition stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v3

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS ordering varchar;

--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_alter_col_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_alter_col_v4
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS final_range VARCHAR;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN stat_period DROP NOT NULL;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN origin DROP NOT NULL;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN sales_area DROP NOT NULL;

--changeset prakhar.suhane@impactanalytics.co:product_attributes_filter_alter_col_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_alter_col_v4
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS clearance_flag VARCHAR;

--changeset swapnil.bhange@impactanalytics.co:product_attributes_filter_alter_col_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_alter_col_v5
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS s0_name VARCHAR;

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);


--changeset raja.duraisamy:paf_l4_name_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_l4_name_idx_1
--comment: create index on l4_name
CREATE INDEX IF NOT EXISTS paf_l4_name_idx ON global.product_attributes_filter USING btree (l4_name) where active and ordering = 'Y';

--changeset vishal.kumart:paf_l1_l4_product_code_idx stripComments:false splitStatements:false context:Release_1_0 labels:paf_l1_l4_product_code_idx
--comment: create index on l1_l4_product_code_idx
CREATE INDEX IF NOT EXISTS paf_l1_l4_product_code_idx ON global.product_attributes_filter (l1_name, l4_name, product_code)
  WHERE NOT COALESCE(is_deleted, false);

  --changeset prakhar.suhane@impactanalytics.co:product_attributes_filter_alter_col_v6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_alter_col_v6
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_type VARCHAR;

--changeset linu.nazil:paf_original_sku_combine_idx stripComments:false splitStatements:false context:Release_1_0 labels:paf_original_sku_combine_idx
--comment: create index on original_sku_combine_idx
CREATE INDEX IF NOT EXISTS paf_original_sku_combine_idx ON global.product_attributes_filter USING btree (original_sku) WHERE active;