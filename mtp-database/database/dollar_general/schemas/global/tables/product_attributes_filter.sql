--liquibase formatted sql
--changeset ashish@impactanalytics.co:product_attributes_filter_dg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
CREATE TABLE global.product_attributes_filter (
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
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NOT NULL,
	l4_name varchar NOT NULL,
	article varchar NOT NULL,
	asset_url varchar NULL,
	brand varchar NULL,
	clearance_start_date date NULL,
	color varchar NULL,
	dtc_season varchar NULL,
	dtc_year varchar NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	product_bucket_code int8 NOT NULL,
	product_channel varchar NULL,
	product_life_cycle varchar NULL,
	"size" varchar NOT NULL,
	sku varchar NULL,
	"style" varchar NULL,
	l3_code varchar NOT NULL,
	season_code varchar NULL,
	l2_description varchar NOT NULL,
	l4_code varchar NOT NULL,
	l3_description varchar NOT NULL,
	style_id varchar NULL,
	l1_description varchar NOT NULL,
	l0_code varchar NOT NULL,
	product_status varchar NOT NULL,
	season_code_desc varchar NULL,
	merchandise_category varchar NULL,
	launch_date date NULL,
	l4_description varchar NOT NULL,
	msrp float8 NOT NULL,
	l2_code varchar NOT NULL,
	brand_name varchar NULL,
	lead_sku varchar NOT NULL,
	pdq_flag bool NOT NULL,
	plan_name varchar NULL,
	product_type_flag int4 NOT NULL,
	primary_sku varchar NOT NULL,
	child_skus _varchar NOT NULL,
	l1_code varchar NOT NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;

--changeset ashish@impactanalytics.co:product_attributes_filter_rcl_hash stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_rcl_hash
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;

--changeset ashish@impactanalytics.co:product_attributes_filter_psa_codes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_psa_codes
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes varchar[] DEFAULT '{}'::varchar[] NOT NULL;

--changeset shashwat.yadav@impactanalytics.co:product_attributes_filter_set_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_set_date
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS set_date varchar NULL;

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS inner_pack_size int4 NULL;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);

--changeset srinivasgowda.sg@impactanalytics.co:product_attributes_filter_dg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index for product_attributes_filter_dg
CREATE INDEX IF NOT EXISTS idx_paf_optimal_composite 
ON "global".product_attributes_filter (primary_sku, l0_code, l1_code, l3_code, l4_code, l0_name, l1_name, l3_name, l4_name, l0_status, allocation_status_flag);		 