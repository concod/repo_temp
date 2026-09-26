--liquibase formatted sql
--changeset tania.bhattacharya@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
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
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	replacement_product_codes _varchar NULL,
	reference_product_codes _varchar NULL,
	is_deleted bool NULL,
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
	l5_name varchar NOT NULL,
	"size" int8 NULL,
	colour_name varchar NULL,
	product_bucket_code int8 NULL,
	usim int8 NULL,
	merch_sn_total varchar NULL,
	product_category varchar NULL,
	product_group varchar NULL,
	product_type varchar NULL,
	material_kind varchar NULL,
	fabric_yarn_type varchar NULL,
	sustainability_type varchar NULL,
	colour_group varchar NULL,
	colour int8 NULL,
	length varchar NULL,
	collar varchar NULL,
	neckline varchar NULL,
	leg_shape varchar NULL,
	cuff varchar NULL,
	pocket_type_composition varchar NULL,
	sleeve varchar NULL,
	sleeve_length varchar NULL,
	collection_segment varchar NULL,
	collection_style varchar NULL,
	design varchar NULL,
	hood varchar NULL,
	shape_outline varchar NULL,
	license_family varchar NULL,
	product_license_flag varchar NULL,
	occasion varchar NULL,
	enabler varchar NULL,
	advert varchar NULL,
	fashionability varchar NULL,
	presentation_method varchar NULL,
	good_better_best varchar NULL,
	consumer_style varchar NULL,
	uom varchar NULL,
	"module" varchar NULL,
	module_desc varchar NULL,
	l5_id varchar NULL,
	l6_id varchar NULL,
	l6_name varchar NULL,
	l7_id varchar NULL,
	l7_name varchar NULL,
	receipt_date date NULL,
	l8_id varchar NULL,
	l8_name varchar NULL,
	class_code varchar NULL,
	class_code_desc varchar NULL,
	lic_character varchar NULL,
	circularity varchar NULL,
	garment_construction varchar NULL,
	rooms varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE INDEX paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, l3_name, product_code) WHERE (active AND (NOT is_deleted));
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v0 stripComments:false splitStatements:false context:Release_1_0_v0 labels:liquibase_project_start_v0
--comment: added four new columns in PAF table
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS imgurl varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS assortment_planning_level varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS assortment_planning_level_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS article varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:product_attributes_filter_dg_v1 stripComments:false splitStatements:false context:Release_1_0_v1 labels:liquibase_project_start_v1
--comment: added four more new columns in PAF table
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS planning_category varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS planning_category_desc varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS planning_subcategory varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS planning_subcategory_desc varchar NULL;