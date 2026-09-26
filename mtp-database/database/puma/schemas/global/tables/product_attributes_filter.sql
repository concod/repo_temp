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
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	"style" varchar NULL,
	article varchar NULL,
	additionalcollectionmark varchar NULL,
	articlestatustag varchar NULL,
	business_segment varchar NULL,
	businesssubsegment varchar NULL,
	clearance_article bool NULL,
	color varchar NOT NULL,
	color_code varchar NULL,
	color_desc varchar NULL,
	dcs varchar NULL,
	dropship_flag bool NULL,
	erpgender varchar NULL,
	erpmastergender varchar NULL,
	erpmerchstylefamily varchar NULL,
	erpseasoncdactive varchar NULL,
	erpseasoncdopened varchar NULL,
	keyinitiative varchar NULL,
	l0_id varchar NULL,
	l1_id varchar NULL,
	l2_id varchar NULL,
	l3_id varchar NULL,
	l4_id varchar NULL,
	l5_id varchar NULL,
	launch_date date NULL,
	linename varchar NULL,
	maindistributionchannel varchar NULL,
	product_bucket_code int8 NOT NULL,
	productcharacter varchar NULL,
	product_cost float8 NULL,
	product_price float8 NULL,
	product_price_cn float8 NULL,
	product_price_us float8 NULL,
	relevant_size int4 NOT NULL,
	reportingbusinessunit varchar NULL,
	reportingline varchar NULL,
	retaildcscd varchar NULL,
	"size" varchar NOT NULL,
	size_bucket varchar NOT NULL,
	styleagegroup varchar NULL,
	style_description varchar NULL,
	stylegroup varchar NULL,
	subcat varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;


--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_new stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));
