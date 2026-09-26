--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
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

--changeset hisham.mohammed@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: updated the schema for paf 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS balloon_kit_flag;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS bulk_replenishment;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS class_combined;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS color;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS dept_combined;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS division_combined;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS ecommerce_3rd_party_vendor;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS ecommerce_sku_master;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS eoq;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS forecast_flag;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS instock_facings;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS inventory_sku_flag;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS kit_ordering_flag;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS license_pattern; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS line_combined;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS msrp;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS next_gen_case_pk; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS pack_cost; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS pack_qty; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS regular_price; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS replacement_sku; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS sales_reference_sku; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS selling_price; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS store_facings; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS store_instock; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS web_instock; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS web_master_pk; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS web_orderable; 
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS zero_adjustment_sku; 
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l2_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l2_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l2_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l3_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l3_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS size varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS allow_direct_ship_code float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS allow_direct_ship_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS class_name varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS collection_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS collection_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS collection_name varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS cubic_meter varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS depth_dimension float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS division_name varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS first_case_sell_price float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS first_relacement_cost float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS first_sugg_retail_price float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS height_dimension float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS is_special_order bool NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS kit_status varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS kit_status_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS lifestyle varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS multi_division_mapping_flag int8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS price_bucket varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS promo_end_date varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS promo_price float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS promo_start_date varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS purchase_status varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS purchase_status_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS purchase_status_type varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS purchase_status_type_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rec_status varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS relacement_cost float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS retail_price float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS sell_price float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS storage_depth float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS storage_height float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS storage_weight float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS storage_width float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS super_collection_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS super_collection_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_model_number varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_name varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS width_dimension float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS worry_free_eligible float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS worry_free_outdoor_eligible float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_bucket_code int8  NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS active_flag  VARCHAR  NULL;

--changeset hemant.kumar@impactanalytics.co:product_attributes_filter_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: added column l1_id
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l1_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS dpt_name varchar NULL;


--changeset jaya.khandelwal@impactanalytics.co:product_attributes_filter_chg2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  column addition
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS comfort varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS second_description varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS finish varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS special_order_lead_time varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS "type" varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS markdown_date date NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS shape varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS form varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS moq varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS launch_date date NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS custom_special_order_lead_time varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS description varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS exit_date date NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS "function" varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS aesthetic varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS no_of_reg_weeks int8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS covering varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS color varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_type varchar NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS replacement_cost float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS plannable_hierarchy int8 NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS master_hierarchy_code varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS lead_time int8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS channel varchar NULL;


--changeset hemant.kumar@impactanalytics.co:product_attributes_filter_chg3 stripComments:false splitStatements:false context:Release_1_1 labels:col-added
--comment: added column first_replacement_cost
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS first_replacement_cost float8 NULL;

--changeset ashvin.prasanth@impactanalytics.co:product_attributes_filter_chg4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  adding l4_desc ,l4_id and l4_name .droping l1_id,l2_desc

ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS l1_id;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS l2_desc;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l4_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l4_id varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l4_name varchar NOT NULL;

--changeset siddharth.upadhyay@impactanalytics.co:product_attributes_filter_chg4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  adding county_of_origin
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS county_of_origin varchar NULL;

