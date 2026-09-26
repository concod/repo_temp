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
	l3_name varchar NOT NULL,
	active_flag varchar NOT NULL,
	balloon_kit_flag varchar NULL,
	bulk_replenishment varchar NULL,
	class_combined varchar NOT NULL,
	color varchar NULL,
	dept_combined varchar NOT NULL,
	division_combined varchar NOT NULL,
	ecommerce_3rd_party_vendor varchar NULL,
	ecommerce_sku_master varchar NULL,
	eoq float8 NULL,
	forecast_flag varchar NULL,
	instock_facings float8 NULL,
	inventory_sku_flag varchar NULL,
	kit_ordering_flag varchar NULL,
	license_pattern varchar NULL,
	line_combined varchar NOT NULL,
	msrp float8 NULL,
	next_gen_case_pk varchar NULL,
	pack_cost float8 NULL,
	pack_qty float8 NULL,
	regular_price float8 NULL,
	replacement_sku varchar NULL,
	sales_reference_sku varchar NULL,
	selling_price float8 NULL,
	store_facings float8 NULL,
	store_instock float8 NULL,
	vendor_id varchar NULL,
	web_instock float8 NULL,
	web_master_pk varchar NULL,
	web_orderable varchar NULL,
	zero_adjustment_sku varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;



--changeset jaya.khandelwal@impactanalytics.co:product_store_hierarchy_mapping_alter1 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22383
--comment: adding business unit column 
alter table global.product_attributes_filter add column if not exists business_unit text;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

