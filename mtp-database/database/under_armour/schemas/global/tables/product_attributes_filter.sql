--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
DROP TABLE IF EXISTS "global".product_attributes_filter;
CREATE TABLE "global".product_attributes_filter (
	product_code varchar NOT NULL,
	product_name varchar NOT NULL,
	product_description text NULL,
	active bool NOT NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	is_deleted bool NULL,
	article varchar NULL,
	brand varchar NULL,
	clearance_start_date date NULL,
	color varchar NULL,
	construction_type_id varchar NULL,
	l0_id varchar NULL,
	l0_name varchar NOT NULL,
	l1_id varchar NULL,
	l1_name varchar NULL,
	l2_id varchar NULL,
	l2_name varchar NULL,
	l3_id varchar NULL,
	l3_name varchar NULL,
	l4_id varchar NULL,
	l4_name varchar NULL,
	launch_date date NULL,
	product_channel varchar NULL,
	"size" varchar NULL,
	sku varchar NULL,
	smv int4 NULL,
	sourcing_class_id varchar NULL,
	style_color_id varchar NULL,
	upc varchar NULL,
	department varchar NULL,
	subcategory varchar NULL,
	expected_toolset varchar NULL,
	"class" varchar NULL,
	calendar varchar NULL,
	is_style varchar NULL,
	style_category varchar NULL,
	product_developed_facility_id int4 NULL,
	"style" int4 NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);

--changeset mayank.mukundam@impactanalytics.co:product_attributes_filter_index stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: adding index for product_attributes_filter
CREATE INDEX idx_product_attributes_filter_product_l0 ON "global".product_attributes_filter(product_code, l0_name);

--changeset mayank.mukundam@impactanalytics.co:product_attributes_filter_columns stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: adding columns for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN sourcing_configuration varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN fob float8;
ALTER TABLE "global".product_attributes_filter ADD COLUMN is_active bool;
ALTER TABLE "global".product_attributes_filter ADD COLUMN is_updated bool;
ALTER TABLE "global".product_attributes_filter ADD COLUMN cost float8;
ALTER TABLE "global".product_attributes_filter ADD COLUMN price float8;
ALTER TABLE "global".product_attributes_filter ADD COLUMN original_price float8;
ALTER TABLE "global".product_attributes_filter ADD COLUMN clearance bool;
ALTER TABLE "global".product_attributes_filter ADD COLUMN receipt_date date;
ALTER TABLE "global".product_attributes_filter ADD COLUMN replacement_product_codes varchar[];
ALTER TABLE "global".product_attributes_filter ADD COLUMN reference_product_codes varchar[];
ALTER TABLE "global".product_attributes_filter ADD COLUMN product_bucket_code int8;
ALTER TABLE "global".product_attributes_filter ADD COLUMN created_at1 timestamp;
ALTER TABLE "global".product_attributes_filter ADD COLUMN updated_at1 timestamp;

--changeset mayank.mukundam@impactanalytics.co:product_attributes_filter_style_column stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: changing style column data type
ALTER TABLE "global".product_attributes_filter ALTER COLUMN style type varchar;