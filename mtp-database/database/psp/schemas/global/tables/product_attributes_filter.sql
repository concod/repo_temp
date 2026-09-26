--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:product_attributes_filter_v3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_3

DROP TABLE IF EXISTS "global".product_attributes_filter CASCADE;
CREATE TABLE IF NOT EXISTS "global".product_attributes_filter (
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
	buyer_id varchar NULL,
	buyer_description varchar NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l0_code varchar NULL,
	l0_description varchar NULL,
	l1_code varchar NULL,
	l1_description varchar NULL,
	l2_code varchar NULL,
	l2_description varchar NULL,
	l3_code varchar NULL,
	l3_description varchar NULL,
	primaryupc varchar NULL,
	description varchar NULL,
	wmsdescription varchar NULL,
	create_date date NULL,
	retail_unit float8 NULL,
	retail_measure varchar NULL,
	product_type varchar NULL,
	seasonal int4 NULL,
	active_code varchar NULL,
	pspd_item bool NULL,
	iosub_group int4 NULL,
	manufacturer_id varchar NULL,
	manufacturer varchar NULL,
	brand_id varchar NULL,
	brand varchar NULL,
	inventory_manager_id varchar NULL,
	inventory_manager varchar NULL,
	merchandiser_id varchar NULL,
	merchandiser varchar NULL,
	financeclassname text NULL,
	pspd_vendor_id varchar NULL,
	pspd_vendor varchar NULL,
	msrp float8 NULL,
	imap float8 NULL,
	"map" float8 NULL,
	inset int4 NULL,
	stopped int4 NULL,
	sell_start_date date NULL,
	sell_end_date date NULL,
	psp_kit int4 NULL,
	flash_sales bool NULL,
	preferred_brand bool NULL,
	psp_store_count int4 NULL,
	wnw_store_count int4 NULL,
	product_bucket_code varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);


--changeset kumaran.k@impactanalytics.co:product_attributes_filter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added manufacturer_cuq product_attributes_filter_v3
ALTER TABLE "global".product_attributes_filter
ADD COLUMN manufacturer_cuq varchar NULL;