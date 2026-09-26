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
	is_deleted bool NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	article varchar NOT NULL,
	asset_url varchar NULL,
	brand varchar NULL,
	clearance_start_date date NULL,
	color varchar NOT NULL,
	dtc_season varchar NULL,
	dtc_year varchar NULL,
	l0_id varchar NOT NULL,
	l1_id varchar NOT NULL,
	l2_id varchar NOT NULL,
	l3_id varchar NOT NULL,
	l4_id varchar NOT NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	product_bucket_code int8 NOT NULL,
	product_channel varchar NULL,
	product_life_cycle varchar NULL,
	"size" varchar NOT NULL,
	size_name varchar NOT NULL,
	sku varchar NULL,
	"style" varchar NULL,
	style_color_id varchar NOT NULL,
	upc varchar NULL,
	vendor varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;



--changeset liquibase:product_attributes_filter_new_cols stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_start..
--comment: delta changeset for product_attributes_filter..
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_case_pack varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS item_desc_og varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color_name_og varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS pfs_season_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS dtc_season_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style_color_id_og varchar NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color_name varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style_og varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color_id_og varchar NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS coordinate_cd varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS itemsku_flg varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rtl_coordinate_group_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l3_name_brand varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS size_id_og int8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS supersede_flag bool NULL;

--changeset linu.nazil:product_attributes_filter_type_change stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_start..
--comment: type change of supersede flag
ALTER TABLE "global".product_attributes_filter ALTER COLUMN supersede_flag TYPE varchar;

--changeset kailash.kangne:product_attributes_filter_type_change stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_start..
--comment: source_code added
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS source_code varchar NULL;

--changeset kailash:column_addition_v1 stripComments:false splitStatements:false context:column_addition_v1 labels:MTP-41563
--comment: MTP-41563 model_description added
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS model_description varchar NULL;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

