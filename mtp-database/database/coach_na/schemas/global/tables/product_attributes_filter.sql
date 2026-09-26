--liquibase formatted sql
--changeset liquibase:product_attributes_filter_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

CREATE TABLE "global".product_attributes_filter (
	product_code varchar NOT NULL,
	article varchar NULL,
	price int4 NULL,
	"cost" int4 NULL,
	original_price int4 NULL,
	active bool NULL,
	clearance bool NULL,
	receipt_date date NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	is_deleted bool NULL,
	replacement_product_codes _varchar NULL,
	reference_product_codes _varchar NULL,
	rcl_hash jsonb DEFAULT '{}'::jsonb NULL,
	psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL,
	replen_flag bool NULL,
	local_flag bool NULL,
	dropship_flag bool NULL,
	l0_name varchar NOT NULL,
	brand_id varchar NULL,
	brand_name varchar NULL,
	l1_name varchar NOT NULL,
	l3_name varchar NOT NULL,
	l6_name varchar NOT NULL,
	color_code varchar NULL,
	color_description varchar NULL,
	dept_grouping varchar NULL,
	l2_name varchar NOT NULL,
	factory_type varchar NULL,
	flag varchar NULL,
	launch_date varchar NULL,
	launch_date2 varchar NULL,
	product_code_orig varchar NULL,
	l5_name varchar NOT NULL,
	"size" varchar NULL,
	size_mapping_classification varchar NULL,
	size_new varchar NULL,
	sizedescr_orig varchar NULL,
	"style" varchar NOT NULL,
	l8_name varchar NULL,
	sub_class_code varchar NULL,
	l7_name varchar NOT NULL,
	sub_dept_code varchar NULL,
	l4_name varchar NULL,
	subdept_name varchar NULL,
	product_name varchar NULL,
	product_description text NULL,
	seasoncode varchar NULL,
	assortment_indicator varchar NULL,
	l11_name varchar NULL,
	intro_date date NULL,
	article_orig varchar NULL,
	upc_orig varchar NOT NULL,
	classcode varchar NOT NULL,
	collection_code varchar NULL,
	mapped_color varchar NULL,
	seasoncode_descr varchar NULL,
	subcollect_code varchar NOT NULL,
	deptid varchar NOT NULL,
	style_color_id_orig varchar NULL,
	level_4_hierarchy_description varchar NULL,
	subdeptname varchar NOT NULL,
	vendor_description varchar NULL,
	color_family_description varchar NULL,
	subdeptcode varchar NOT NULL,
	silhouette_code varchar NULL,
	vendor_id varchar NULL,
	styledesc varchar NOT NULL,
	subclasscode varchar NOT NULL,
	product_bucket_code int8 NULL,
	channel varchar NULL,
	l0_id varchar NULL,
	l1_id varchar NULL,
	l2_id varchar NULL,
	l3_id varchar NULL,
	l4_id varchar NULL,
	l5_id varchar NULL,
	l6_id varchar NULL,
	l7_id varchar NULL,
	l8_id varchar NULL,
	product_channel varchar NULL,
	nrf_code varchar NULL,
	product_segmentation varchar NULL,
	style_long_description varchar NULL,
	upc varchar NULL,
	sku varchar NULL,
	supersede_flag varchar NULL,
	color_name varchar NULL,
	color varchar NULL,
	style_name varchar NULL,
	clearance_start_date date NULL,
	size_name varchar NULL,
	ia_sku_type varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX  product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
CREATE INDEX  product_attributes_filter_rcl_hash_idx ON global.product_attributes_filter USING gin (rcl_hash);

--changeset draksharapu.rajesh@impactanalytics.co:product_attributes_filter_coach_adding_date_col_v1 stripComments:false splitStatements:false context:Release_1.1 labels:product_attributes_filter_date_col_addition
--comment: adding date col for ingestion 


ALTER TABLE global.product_attributes_filter ADD COLUMN last_allocated_date date NULL;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));


--changeset Shaik.Azmathulla@impactanalytics.co:partition_logic stripComments:false splitStatements:false context:Release_1_0 labels:partition_logic
--comment: Added the l1_name in PK for partition logic.

ALTER TABLE IF EXISTS global.product_attributes_filter DROP CONSTRAINT IF EXISTS product_attributes_filter_pk;
ALTER TABLE IF EXISTS global.product_attributes_filter ADD CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name, l1_name);


--changeset hemantkumar.bajaj@impactanalytics.co:product_attributes_filter_coach_adding_date_col_v2 stripComments:false splitStatements:false context:Release_1.1 labels:product_attributes_filter_date_col_addition
--comment: adding column product_vertical


ALTER TABLE global.product_attributes_filter ADD COLUMN product_vertical varchar;


--changeset hemantkumar.bajaj@impactanalytics.co:product_attributes_filter_coach_adding_date_col_v3 stripComments:false splitStatements:false context:Release_1.1 labels:product_attributes_filter_date_col_addition
--comment: adding column product_vertical_desc


ALTER TABLE global.product_attributes_filter ADD COLUMN product_vertical_desc varchar;

--changeset hemantkumar.bajaj@impactanalytics.co:product_attributes_filter_coach_adding_date_col_v4 stripComments:false splitStatements:false context:Release_1.1 labels:product_attributes_filter_date_col_addition
--comment: adding column product_reach_desc and product_reach


ALTER TABLE global.product_attributes_filter ADD COLUMN product_reach varchar;

ALTER TABLE global.product_attributes_filter ADD COLUMN product_reach_desc varchar;

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);

--changeset hemantkumar.bajaj@impactanalytics.co:product_attributes_filter_coach_adding_date_col_v5 stripComments:false splitStatements:false context:Release_1.1 labels:product_attributes_filter_date_col_addition
--comment: alter last allocation date default setting

ALTER TABLE global.product_attributes_filter
ALTER COLUMN last_allocated_date SET DEFAULT DATE '2000-01-01';