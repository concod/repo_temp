--liquibase formatted sql
--changeset Sai.kiran:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
CREATE TABLE "global".product_attributes_filter (
	product_code varchar NOT NULL,
      product_name varchar NOT NULL,
	product_description text NULL,
	price float8 NULL,
     original_price float8 NULL,
	"cost" float8 NULL,
	active bool NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NOT NULL,
	l4_name varchar NOT NULL,
	l5_name varchar NOT NULL,
     l0_id varchar NOT NULL,
	l1_id varchar NOT NULL,
	l2_id varchar NOT NULL,
	l3_id varchar NOT NULL,
	l4_id varchar NOT NULL,
	l5_id varchar NOT NULL,
	item_status varchar NULL,
	Primary_trait_desc varchar Null,
	Primary_vendor_name varchar Null,
	Style_desc varchar Null,
	color varchar NULL,
	Size varchar Null,
	Sbt_flag bool Null,
	Drop_ship_flag varchar Null,
	IA_CUSTOM_STYLE_ID varchar Null,
	IA_SKU_TYPE varchar Null,
	PRODUCT_TYPE varchar Null,
	Product_category varchar Null,
	Product_attribute_4 varchar Null,
Product_attribute_5 varchar Null,
Product_attribute_6 varchar Null,
Product_attribute_7 varchar Null,
Product_attribute_8 varchar Null,
Product_attribute_9 varchar Null,
Product_attribute_10 varchar Null,
Product_attribute_11 varchar Null,
Product_attribute_12 varchar Null,
Product_attribute_13 varchar Null,
Product_attribute_14 varchar Null,
Product_attribute_15 varchar Null,
Launch_date date Null,
Clearance boolean Not Null default false,
Receipt_date date Null,
created_at timestamptz NULL,
updated_at timestamptz NULL,
created_by int4 NULL,
updated_by int4 NULL,
replacement_product_codes _varchar NULL,
reference_product_codes _varchar NULL,
is_deleted bool NULL,
CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;


--changeset aman.lakkoju:product_attributes_filter_psa_codes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added style,article,primary_trait_id columns in PAF table
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style varchar NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS article varchar NOT NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS primary_trait_id varchar NOT NULL ;

--changeset shreyas.sankpal@impactanalytics.co:product_attributes_filter_columns_for_MV stripComments:false splitStatements:false context:Release_1_0 labels:MTP-61813
--comment: added color_desc, size, launch_date columns in PAF table
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS "size" varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS launch_date date NULL;


--changeset Sai.kiran:product_attributes_filter_change_uda_master stripComments:false splitStatements:false context:Release_1_0 labels:adding_secondary_trait_desc
--comment: Adding secondary traits as array to product master
ALTER TABLE "global".product_attributes_filter ADD 	COLUMN IF NOT EXISTS uda_value_desc VARCHAR[] NULL;

--changeset aman_lakkoju:product_attributes_filter_psa_codes_rcl_hash stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_psa_codes_rcl_hash and rcl_hash
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL;

--changeset Sai.kiran:syncing up test postgres and bitbucket stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync test db and bitbucket repo 
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS brand varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS clearance_start_date date NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color_name varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l3_name_brand varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS primary_vendor_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_bucket_code int8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_channel varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS size_name varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS sku varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style_color_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS supersede_flag varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS upc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_case_pack varchar NULL;
ALTER TABLE "global".product_attributes_filter	ALTER COLUMN Sbt_flag TYPE VARCHAR USING Sbt_flag::VARCHAR;

--changeset linu.nazil:index_on_l0_l1_product_code up test postgres and bitbucket stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Adding index on l0_name, l1_name, product_code columns for article selection list generate_rcl_constraint_data
CREATE INDEX IF NOT EXISTS paf_l0_l1_pc_idx ON "global".product_attributes_filter USING btree (l0_name, l1_name, product_code);



--changeset Bhargav.Polavarapu:syncing ordering up test postgres  and bitbucket stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync test db and bitbucket repo adding columns ordering
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS ordering varchar NULL;



--changeset Bhargav.Polavarapu:replisnement_column_added_cb_case stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding replinshement column cracker barrel
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS replenishment_status varchar NULL;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));


	--changeset zakia.firdous:product_type_ada_added_cb_case stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding product_type_ada column cracker barrel
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_type_ada varchar NULL;

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);

--changeset linu.nazil@impactanalytics.co:paf_hash_combine_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_hash_combine_idx
--comment: create index on hash combine
CREATE INDEX paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, primary_trait_desc, l3_name, product_code) WHERE (active AND (NOT is_deleted));