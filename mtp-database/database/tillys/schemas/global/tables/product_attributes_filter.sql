--liquibase formatted sql
--changeset ashish@impactanalytics.co:product_attributes_filter_tillys_fixes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts2
--comment: initial changeset for product_attributes_filters
CREATE TABLE IF NOT EXISTS "global".product_attributes_filter (
	product_code varchar NOT NULL,
	l0_id varchar NOT NULL,
	l0_name varchar NOT NULL,
	l1_id varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_id varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_id varchar NOT NULL,
	l3_name varchar NOT NULL,
	l4_id varchar NOT NULL,
	l4_name varchar NOT NULL,
	color varchar NULL,
	color_name varchar NULL,
	color_family_desc varchar NOT NULL,
	size_id varchar NOT NULL,
	size_desc varchar NOT NULL,
	size_sequence varchar NULL,
	brand varchar NOT NULL,
	vendor_id varchar NOT NULL,
	vendor_name varchar NOT NULL,
	create_date varchar NOT NULL,
	launch_date date NULL,
	exit_date date NULL,
	fashion_grade varchar NULL,
	collection varchar NULL,
	price_status varchar NULL,
	product_status varchar NOT NULL,
	season_code varchar NOT NULL,
	season_code_desc varchar NOT NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	replacement_product_codes _varchar NULL,
	reference_product_codes _varchar NULL,
	is_deleted bool NULL,
	active bool NULL,
	price numeric NULL,
	receipt_date date NULL,
	clearance bool NULL,
	updated_price_status varchar NULL,
	product_description varchar NULL,
	"cost" float8 NULL,
	product_name varchar NULL,
	original_price numeric NULL,
	style_color_id varchar NULL,
	style_color_desc varchar NULL,
	department varchar DEFAULT '0'::character varying NOT NULL,
	subdepartment varchar DEFAULT '0'::character varying NOT NULL,
	"class" varchar DEFAULT '0'::character varying NOT NULL,
	subclass varchar DEFAULT '0'::character varying NOT NULL,
	"style" varchar DEFAULT '0'::character varying NOT NULL,
	color_id_name varchar NULL,
	vendor varchar DEFAULT '0'::character varying NOT NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE INDEX paf_article_combine_idx ON global.product_attributes_filter USING btree (l0_name, product_code) WHERE (active AND (NOT is_deleted));
CREATE INDEX paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, l3_name, product_code) WHERE (active AND (NOT is_deleted));
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);

--changeset nischay.p@impactanalytics.co:product_attributes_filter_tillys_test2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_3Feb_2
--comment: alter table changeset for product_attributes_filters_3_feb_2
alter table "global".product_attributes_filter rename column style_color_id to article;

--changeset gauri.nair@impactanalytics.co:rcl_hash_tillys_test stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: alter table - adding rcl_hash to test
alter table "global".product_attributes_filter add column rcl_hash varchar;

--changeset anish.a@impactanalytics.co:rcl_hash_tillys_test_paf2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_paf2
--comment: alter table - adding product_bucket_code_paf2
alter table "global".product_attributes_filter add column product_bucket_code varchar;

--changeset gauri.nair@impactanalytics.co:product_attributes_filter_tillys_alter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_paf3
--comment: alter table - adding silhouette and comments to paf
alter table "global".product_attributes_filter add column if not exists silhouette varchar,
add column if not exists comments varchar;


--changeset anish.a@impactanalytics.co:adding rcl_hash to paf stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_paf2
--comment: alter table - adding rcl_hash to paf
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;


--changeset anish.a@impactanalytics.co:adding_rcl_hash_to_paf3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_paf3
--comment: alter table - adding rcl_hash to paf3
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;

--changeset gauri.nair@impactanalytics.co:adding_2_cols to paf stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_paf4
--comment: alter table - adding style_name and size to paf
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style_name varchar null,
ADD COLUMN IF NOT EXISTS size varchar null;

--changeset anish.a@impactanalytics.co:adding_rcl_hash_to_paf5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_paf3
--comment: alter table - adding rcl_hash to paf3
ALTER TABLE "global".product_attributes_filter ALTER COLUMN rcl_hash SET DEFAULT '{}';

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);

--changeset anish.a@impactanalytics.co:changing_datatype stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_paff3
--comment: alter table -changing_datatype
ALTER TABLE "global".product_attributes_filter ALTER COLUMN product_bucket_code TYPE int8 USING product_bucket_code::int8;

--changeset anish.a@impactanalytics.co:adding_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_paff4
--comment: alter table -adding_columns
ALTER TABLE "global".product_attributes_filter ADD transaction_type varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD marketplace varchar NULL;

