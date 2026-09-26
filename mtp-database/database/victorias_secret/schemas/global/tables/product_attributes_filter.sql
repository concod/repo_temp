--liquibase formatted sql
--changeset aman.pareek:added_article_column stripComments:false splitStatements:false context:article_column_added labels:article_column_added
--comment: added article column to product_attributes_filter
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
	is_deleted bool NULL,
	l0_name varchar NOT NULL,
	l5_name varchar NOT NULL,
	emotional_space_descr_new varchar NULL,
	size1 varchar NULL,
	subbrand_description varchar NULL,
	masterstyle varchar NULL,
	l0_id varchar NOT NULL,
	article_status varchar NULL,
	article varchar NOT NULL,
	l5_id varchar NOT NULL,
	color varchar NULL,
	"size" varchar NULL,
	l3_id varchar NOT NULL,
	l1_id varchar NOT NULL,
	l4_id varchar NOT NULL,
	article_type varchar NULL,
	collection varchar NULL,
	subbrand_code int8 NULL,
	masterstyle_descr varchar NULL,
	emotional_space varchar NULL,
	sub_collection varchar NULL,
	l6_name varchar NOT NULL,
	product_lifecycle varchar NULL,
	product_channel varchar NULL,
	l4_name varchar NOT NULL,
	emotional_space_code int8 NULL,
	size2 varchar NULL,
	product_hierarchy varchar NULL,
	l2_id varchar NOT NULL,
	l6_id varchar NOT NULL,
	l2_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	pricing varchar NULL,
	l3_name varchar NOT NULL,
	current_floorset varchar NULL,
	sizes varchar NULL,
	flagged_rows int4 NULL,
	subbrand_code_desc varchar NULL,
	main_sku_tag bool NULL,
	current_assortment_group varchar NULL,
	user_defined_1 varchar NULL,
	product_id_name varchar NULL,
	user_defined_3 varchar NULL,
	product_bucket_code int8 NULL,
	user_defined_2 varchar NULL,
	user_defined_4 varchar NULL,
	user_defined_6 varchar NULL,
	user_defined_5 varchar NULL,
	generic varchar NULL,
	superseded_choice_id varchar NULL,
	flex_style varchar NULL,
	superseded_product_code varchar NULL,
	form varchar NULL,
	brand_name varchar NOT NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset ashish@impactanalytics.co:product_attributes_filter_rcl_hash stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_rcl_hash
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;

--changeset kamuju.mahaveer@impactanalytics.co:product_attributes_filter_sizes_mat stripComments:false splitStatements:false context:Release_1_0 labels:VPP-319
--comment: Updation of sizes to sizes_mat
ALTER TABLE "global".product_attributes_filter RENAME COLUMN sizes to sizes_mat;

--changeset ashish@impactanalytics.co:product_attributes_filter_psa_codes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_psa_codes
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes varchar[] DEFAULT '{}'::varchar[] NOT NULL;


--changeset kamuju.mahaveer@impactanalytics.co:product_attributes_filter_inner_pack_units stripComments:false splitStatements:false context:Release_1_0 labels:VS-163
--comment: initial changeset for product_attributes_filter_psa_codes
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS inner_pack_units int4 NOT NULL;

--changeset ashish@impactanalytics.co:paf_hash_combine_idx stripComments:false splitStatements:false context:Release_1_0 labels:CI-137
--comment: initial changeset for paf_hash_combine_idx
CREATE INDEX paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, product_code, rcl_hash) where active and not is_deleted;

--changeset ashish:paf_hash_combine_idx_v3 stripComments:false splitStatements:false context:Release_1_0 labels:CI-137
--comment: initial changeset for paf_hash_combine_idx
DROP INDEX IF EXISTS global.paf_hash_combine_idx;
CREATE INDEX IF NOT EXISTS paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l2_name, l3_name, l4_name, l5_name, product_code) where active and not is_deleted;

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
