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
	article varchar NOT NULL,
	brand_currency varchar NULL,
	child_skus _varchar NOT NULL,
	clearance_end_date date NULL,
	clearance_start_date date NULL,
	dotcom_exclusive varchar NULL,
	drop_ship_ind varchar NULL,
	end_date date NULL,
	flag varchar NULL,
	gender varchar NULL,
	hierarchy_1 varchar NOT NULL,
	hierarchy_2 varchar NOT NULL,
	hierarchy_3 varchar NOT NULL,
	is_set varchar NULL,
	launch_date date NULL,
	merchandise_brand varchar NULL,
	merchandise_category varchar NULL,
	metal_color varchar NULL,
	metal_type varchar NULL,
	"ordering" varchar NULL,
	planning_ownership varchar NULL,
	price_bucket varchar NOT NULL,
	primary_sub_sku varchar NULL,
	primary_wh varchar NULL,
	product_banner varchar NULL,
	product_bucket_code int8 NOT NULL,
	product_channel varchar NOT NULL,
	product_channel_name varchar NOT NULL,
	product_cost_price_per_unit float8 NULL,
	product_final_price_per_unit float8 NULL,
	production_method varchar NULL,
	product_retail_price_per_unit float8 NULL,
	product_tag varchar NULL,
	product_type varchar NULL,
	"size" varchar NULL,
	sku_grade varchar NULL,
	store_pack_size varchar NULL,
	supplier_pack_size varchar NULL,
	vendor_code varchar NULL,
	vendor_currency varchar NULL,
	vendor_name varchar NULL,
	vendor_style varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

