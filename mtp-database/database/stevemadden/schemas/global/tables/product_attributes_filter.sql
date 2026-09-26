--liquibase formatted sql
--changeset liquibase:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
-- "global".product_attributes_filter definition

-- Drop table

-- DROP TABLE "global".product_attributes_filter;

CREATE TABLE "global".product_attributes_filter (
	product_code varchar NOT NULL,
	product_name varchar NULL,
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
	article varchar NOT NULL,
	asset_url varchar NULL,
	clearance_start_date date NULL,
	color varchar NULL,
	color_id_og varchar NULL,
	color_name varchar NOT NULL,
	color_name_og varchar NULL,
	dtc_season varchar NULL,
	dtc_season_id varchar NULL,
	dtc_year varchar NULL,
	item_desc_og varchar NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	"size" varchar NOT NULL,
	"style" varchar NULL,
	style_color_id varchar NULL,
	emotional_space_descr_new varchar NULL,
	l2_id varchar NOT NULL,
	l1_name varchar NOT NULL,
	l3_id varchar NOT NULL,
	size1 varchar NULL,
	subbrand_description varchar NULL,
	l2_name varchar NOT NULL,
	l5_name varchar NULL,
	masterstyle varchar NULL,
	l0_id varchar NOT NULL,
	article_status varchar NULL,
	l5_id varchar NULL,
	l4_id varchar NULL,
	article_type varchar NULL,
	collection varchar NULL,
	l3_name varchar NOT NULL,
	subbrand_code int8 NULL,
	masterstyle_descr varchar NULL,
	emotional_space varchar NULL,
	sub_collection varchar NULL,
	l6_name varchar NULL,
	product_lifecycle varchar NULL,
	product_channel varchar NULL,
	l4_name varchar NOT NULL,
	l1_id varchar NOT NULL,
	emotional_space_code int8 NULL,
	l6_id varchar NULL,
	size2 varchar NULL,
	product_hierarchy varchar NULL,
	pricing varchar NULL,
	product_id_name varchar NULL,
	product_bucket_code varchar NULL,
	product_code_id int4 NULL,
	l0_name_id int4 NULL,
	l1_name_id int4 NULL,
	l2_name_id int4 NULL,
	sizes_mat varchar NULL,
	user_defined_4 varchar NULL,
	user_defined_1 varchar NULL,
	user_defined_3 varchar NULL,
	form varchar NULL,
	user_defined_6 varchar NULL,
	flex_style varchar NULL,
	user_defined_5 varchar NULL,
	generic varchar NULL,
	user_defined_2 varchar NULL,
	main_sku_tag bool NULL,
	current_floorset varchar NULL,
	subbrand_code_desc varchar NULL,
	current_assortment_group varchar NULL,
	superseded_choice_id varchar NULL,
	superseded_product_code varchar NULL,
	flagged_rows int4 NULL,
	brand_name varchar NULL,
	rcl_hash jsonb DEFAULT '{}'::jsonb NULL,
	psa_codes _varchar DEFAULT '{}'::character varying[] NULL,
	season_code varchar NULL,
	color_family_name varchar NOT NULL,
	attribute2_desc varchar NULL,
	vendor_desc varchar NULL,
	style_name varchar NOT NULL,
	color_id varchar NOT NULL,
	product_status varchar NULL,
	season_code_desc varchar NULL,
	attribute4_desc varchar NULL,
	merchandise_category varchar NULL,
	launch_date date NULL,
	product_grade varchar NULL,
	attribute1_desc varchar NULL,
	sm_active_flag_ignore varchar NULL,
	attribute3_desc varchar NULL,
	parent_id varchar NULL,
	replenishment_flag varchar NULL,
	vendor_id varchar NULL,
	fullprice_unit_retail float8 NULL,
	otherprice2_clearance_flag varchar NULL,
	otherprice2_unit_retail float8 NULL,
	outletprice_clearance_flag varchar NULL,
	otherprice1_unit_retail float8 NULL,
	fullprice_clearance_flag varchar NULL,
	outletprice_unit_retail float8 NULL,
	otherprice1_clearance_flag varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ALTER COLUMN price type float;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN cost type float;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN original_price type float;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN fullprice_unit_retail type float;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN otherprice2_unit_retail type float;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN otherprice1_unit_retail type float;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN outletprice_unit_retail type float;

--changeset mihir.marwah@impactanalytics.co:product_attributes_filter_change1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

alter table "global".product_attributes_filter alter column product_bucket_code TYPE bigint USING product_bucket_code::bigint;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

