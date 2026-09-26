--liquibase formatted sql
--changeset liquibase:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter



-- "global".product_attributes_filter definition

-- Drop table

-- DROP TABLE "global".product_attributes_filter;

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
	color varchar NULL,
	style_color_id varchar NULL,
	vendor varchar NULL,
	l0_id varchar NOT NULL,
	l0_name varchar NOT NULL,
	l0_id_name varchar NOT NULL,
	l1_id varchar NOT NULL,
	l1_name varchar NOT NULL,
	l1_id_name varchar NOT NULL,
	l2_id varchar NOT NULL,
	l2_name varchar NOT NULL,
	l2_id_name varchar NOT NULL,
	l3_id varchar NOT NULL,
	l3_name varchar NOT NULL,
	l3_id_name varchar NOT NULL,
	l4_id varchar NOT NULL,
	l4_name varchar NOT NULL,
	l5_name varchar NOT NULL,
	"style" varchar NULL,
	"size" varchar NULL,
	article varchar NULL,
	size_name varchar NULL,
	upc varchar NOT NULL,
	sku varchar NOT NULL,
	launch_date date NULL,
	clearance_date date NULL,
	brand varchar NULL,
	color_name varchar NULL,
	launch_price float8 NULL,
	markdown_ind varchar NULL,
	lifecycle varchar NULL,
	dropship_flag bool NULL,
	product_bucket_code int8 NULL,
	product_channel varchar NULL,
	vendor_case_pack varchar NULL,
	l3_name_brand varchar NULL,
	supersede_flag varchar NULL,
	attri_1 varchar NULL,
	attri_2 varchar NULL,
	attri_3 varchar NULL,
	attri_4 varchar NULL,
	attri_5 varchar NULL,
	attri_7 varchar NULL,
	attri_8 varchar NULL,
	attri_9 varchar NULL,
	attri_10 varchar NULL,
	attri_12 varchar NULL,
	attri_13 varchar NULL,
	attri_14 varchar NULL,
	attri_15 varchar NULL,
	attri_16 varchar NULL,
	attri_17 varchar NULL,
	attri_18 varchar NULL,
	attri_21 varchar NULL,
	attri_22 varchar NULL,
	attri_23 varchar NULL,
	attri_24 varchar NULL,
	attri_25 varchar NULL,
	attri_26 varchar NULL,
	attri_27 varchar NULL,
	attri_28 varchar NULL,
	attri_29 varchar NULL,
	attri_30 varchar NULL,
	attri_32 varchar NULL,
	attri_33 varchar NULL,
	attri_34 varchar NULL,
	attri_35 varchar NULL,
	attri_36 varchar NULL,
	attri_37 varchar NULL,
	attri_38 varchar NULL,
	attri_39 varchar NULL,
	attri_40 varchar NULL,
	attri_41 varchar NULL,
	attri_42 varchar NULL,
	attri_43 varchar NULL,
	attri_44 varchar NULL,
	attri_45 varchar NULL,
	attri_46 varchar NULL,
	attri_47 varchar NULL,
	attri_48 varchar NULL,
	attri_50 varchar NULL,
	ladder varchar NULL,
	fit varchar NULL,
	rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL,
	style_color_description varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE INDEX IF NOT EXISTS paf_article_combine_idx ON  global.product_attributes_filter USING btree (l0_name, article, product_code) WHERE (active AND (NOT is_deleted));
CREATE INDEX IF NOT EXISTS product_attributes_filter_l0_name_idx ON  global.product_attributes_filter USING btree (l0_name);
CREATE INDEX IF NOT EXISTS product_attributes_filter_product_code_idx ON  global.product_attributes_filter USING btree (product_code);

--changeset liquibase:product_attributes_filter_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v2

ALTER TABLE "global".product_attributes_filter
DROP COLUMN color,
DROP COLUMN style_color_id,
DROP COLUMN vendor,
DROP COLUMN l0_id_name,
DROP COLUMN l1_id,
DROP COLUMN l1_id_name,
DROP COLUMN l2_id_name,
DROP COLUMN l3_id_name,
DROP COLUMN product_channel,
DROP COLUMN vendor_case_pack,
DROP COLUMN l3_name_brand,
DROP COLUMN supersede_flag,
DROP COLUMN attri_1,
DROP COLUMN attri_2,
DROP COLUMN attri_3,
DROP COLUMN attri_4,
DROP COLUMN attri_5,
DROP COLUMN attri_7,
DROP COLUMN attri_8,
DROP COLUMN attri_9,
DROP COLUMN attri_10,
DROP COLUMN attri_12,
DROP COLUMN attri_13,
DROP COLUMN attri_14,
DROP COLUMN attri_15,
DROP COLUMN attri_16,
DROP COLUMN attri_17,
DROP COLUMN attri_18,
DROP COLUMN attri_21,
DROP COLUMN attri_22,
DROP COLUMN attri_23,
DROP COLUMN attri_24,
DROP COLUMN attri_25,
DROP COLUMN attri_26,
DROP COLUMN attri_27,
DROP COLUMN attri_28,
DROP COLUMN attri_29,
DROP COLUMN attri_30,
DROP COLUMN attri_32,
DROP COLUMN attri_33,
DROP COLUMN attri_34,
DROP COLUMN attri_35,
DROP COLUMN attri_36,
DROP COLUMN attri_37,
DROP COLUMN attri_38,
DROP COLUMN attri_39,
DROP COLUMN attri_40,
DROP COLUMN attri_41,
DROP COLUMN attri_42,
DROP COLUMN attri_43,
DROP COLUMN attri_44,
DROP COLUMN attri_45,
DROP COLUMN attri_46,
DROP COLUMN attri_47,
DROP COLUMN attri_48,
DROP COLUMN attri_50,
DROP COLUMN ladder,
DROP COLUMN fit,
DROP COLUMN style_color_description;


ALTER TABLE "global".product_attributes_filter
    ADD COLUMN product_line varchar NULL,
    ADD COLUMN l6_name varchar NULL,
    ADD COLUMN l7_name varchar NULL,
    ADD COLUMN l8_name varchar NULL,
    ADD COLUMN article_status varchar NULL,
    ADD COLUMN color_code varchar NULL,
    ADD COLUMN color_description varchar NULL,
    ADD COLUMN color_family varchar NULL,
    ADD COLUMN "ordering" varchar NULL,
    ADD COLUMN season_code varchar NULL,
    ADD COLUMN silhouette varchar NULL,
    ADD COLUMN planning_product_grouping varchar NULL,
    ADD COLUMN gender varchar NULL,
    ADD COLUMN flex_status varchar NULL,
    ADD COLUMN global_merch_team varchar NULL,
    ADD COLUMN fit_classification varchar NULL,
    ADD COLUMN design_line varchar NULL,
    ADD COLUMN designed_for_activity varchar NULL,
    ADD COLUMN size_scale varchar NULL,
    ADD COLUMN product_development_pod varchar NULL,
    ADD COLUMN product_size_definition varchar NULL,
    ADD COLUMN global_line_segment_style_category varchar NULL,
    ADD COLUMN l6_id varchar NULL,
    ADD COLUMN l7_id varchar NULL,
    ADD COLUMN l8_id varchar NULL,
    ADD COLUMN article_original varchar NULL,
    ADD COLUMN product_code_original varchar NULL;


CREATE INDEX paf_hash_combine_idx ON  global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, l3_name, product_code) WHERE (active AND (NOT is_deleted));
CREATE INDEX product_attributes_filter_rcl_hash_idx ON  global.product_attributes_filter USING gin (rcl_hash);


--changeset liquibase:product_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v3

ALTER TABLE "global".product_attributes_filter
ADD COLUMN l5_id varchar NULL;


--changeset liquibase:product_attributes_filter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v4

ALTER TABLE "global".product_attributes_filter
DROP COLUMN style,
DROP COLUMN size_name,
DROP COLUMN upc,
DROP COLUMN sku,
DROP COLUMN clearance_date,
DROP COLUMN brand,
DROP COLUMN color_name,
DROP COLUMN launch_price,
DROP COLUMN markdown_ind,
DROP COLUMN lifecycle,
DROP COLUMN dropship_flag;

--changeset liquibase:product_attributes_filter_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_v5

ALTER TABLE "global".product_attributes_filter
ADD COLUMN style_name VARCHAR,
ADD COLUMN color_name VARCHAR;

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);
