--liquibase formatted sql
--changeset shivam.tiwari@impactanalytics.co:product_attributes_filter_pm stripComments:false splitStatements:false context:Release_1_0_1 labels:liquibase_project_start_pm
--comment: initial changeset for product_attributes_filter_pm
CREATE TABLE "global".product_attributes_filter (
	product_code varchar NOT NULL,
	product_name varchar NOT NULL,
	product_description text NULL,
	price float8 NULL,
	"cost" float8 NULL,
	original_price float8 NULL,
	active bool DEFAULT true NOT NULL,
	clearance bool DEFAULT false NOT NULL,
	receipt_date date NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	replacement_product_codes _varchar DEFAULT '{}'::character varying[] NULL,
	reference_product_codes _varchar DEFAULT '{}'::character varying[] NULL,
	is_deleted bool DEFAULT false NULL,
	l0_name varchar NOT NULL,
	ret_price varchar NULL,
	l2_id varchar NULL,
	size_code varchar NULL,
	l1_name varchar NULL,
	color_desc varchar NULL,
	country varchar NULL,
	l3_id varchar NULL,
	std_cost_style_master float8 NULL,
	prim_vendor_name varchar NULL,
	l2_name varchar NULL,
	dimen_pack varchar NULL,
	l5_name varchar NULL,
	group_code1 varchar NULL,
	l0_id varchar NULL,
	sub_class varchar NULL,
	l5_id varchar NULL,
	style_nrf varchar NULL,
	seas_name varchar NULL,
	style_type_desc varchar NULL,
	dimpk_desc varchar NULL,
	style_name varchar NULL,
	pack_qty int8 NULL,
	color_id varchar NULL,
	color_group varchar NULL,
	style_code varchar NULL,
	group_code12 varchar NULL,
	l4_id varchar NULL,
	region varchar NULL,
	l3_name varchar NULL,
	cont_desc varchar NULL,
	group_code4 varchar NULL,
	group_code5 varchar NULL,
	l6_name varchar NULL,
	location_code varchar NULL,
	division varchar NULL,
	div_name varchar NULL,
	colorname varchar NULL,
	l4_name varchar NULL,
	l1_id varchar NULL,
	retail_price float8 NULL,
	leadtime float8 NULL,
	upc varchar NULL,
	style_desc varchar NULL,
	l6_id varchar NULL,
	nrf_color varchar NULL,
	product_bucket_code varchar NULL,
	season varchar NULL,
	group_code2 varchar NULL,
	article varchar NULL,
	size_name_desc varchar NULL,
	style_type varchar NULL,
	brand varchar NULL,
	group_code3 varchar NULL,
	primary_vendor varchar NULL,
	prim_vendor_key varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
	CONSTRAINT product_attributes_filter_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT product_attributes_filter_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);


--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

