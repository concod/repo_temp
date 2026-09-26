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
	l4_name varchar NOT NULL,
	l5_name varchar NOT NULL,
	article varchar NOT NULL,
	clearance_end_date date NULL,
	clearance_start_date date NULL,
	color varchar NULL,
	color_code varchar NOT NULL,
	company_code varchar NOT NULL,
	development_type varchar NULL,
	direct_imu_target float8 NULL,
	dropship_flag bool NULL,
	end_date date NULL,
	fabrication varchar NULL,
	human_readable_color varchar NULL,
	indirect_imu_target float8 NULL,
	intellectual_property bool NULL,
	inventsizeid varchar NULL,
	launch_date date NULL,
	merchant_pyramid varchar NULL,
	merchant_pyramid_colorway varchar NULL,
	new_carryover_sku varchar NULL,
	new_carryover_style varchar NULL,
	parent_style_description varchar NULL,
	parent_style_id varchar NULL,
	pillar varchar NULL,
	product_cost float8 NULL,
	product_price float8 NULL,
	retailer_markup float8 NULL,
	retirement_date date NULL,
	school varchar NULL,
	selldown_date date NULL,
	selling_collection varchar NULL,
	"size" varchar NULL,
	size_description varchar NULL,
	sku varchar NOT NULL,
	sku_dropped_date varchar NULL,
	"style" varchar NULL,
	style_description varchar NULL,
	style_dropped_date varchar NULL,
	sub_class varchar NULL,
	wholesale_price float8 NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;


--changeset suryasai.gopal@impactanalytics.co:product_attributes_filter_company_code stripComments:false splitStatements:false context:update labels:liquibase_project_start
--comment: removed company code column from product attributes filter
ALTER TABLE "global".product_attributes_filter DROP COLUMN company_code;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

