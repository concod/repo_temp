--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:product_attributes_filter_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_1

CREATE TABLE if not exists "global".product_attributes_filter (
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
CREATE INDEX if not exists product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX if not exists product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);



--changeset sreevathsa.sp@impactanalytics.co:product_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_add_columns_product_attributes_filter
--comment: initial changeset for product_attributes_filter_psa_codes
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL;


--changeset sreevathsa.sp@impactanalytics.co:product_attributes_filter_add_columns_size_v1 stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_product_attributes_filter_add_columns_size
--comment: product_attributes_filter_add_columns_size
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS size_id varchar NULL;

--changeset sreevathsa.sp@impactanalytics.co:product_attributes_filter_add_columns_vendor_display_number stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_product_attributes_filter_add_columns_vendor_display_number
--comment: product_attributes_filter_add_columns_vendor_display_number and product_life_cycle
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_display_number varchar NULL;

--changeset sreevathsa.sp@impactanalytics.co:product_attributes_filter_add_columns_itm_id_itm_key stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_product_attributes_filter_add_columns_itm_id_itm_key
--comment: product_attributes_filter_add_columns_itm_id_itm_key
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS itm_key varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS itm_id varchar NULL;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

--changeset parmanand.mishra@impactanalytics.co:product_attributes_filter_add_columns_bmsl_attr stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_product_attributes_filter_add_columns_bmsl_attr
--comment: product_attributes_filter_add_columns_bmsl_attr
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS bmsl_attr varchar NULL;

--changeset abijithsarath.menon@impactanalytics.co:product_attributes_filter_add_columns_rcd_close stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_product_attributes_filter_add_columns_bmsl_attr
--comment: product_attributes_filter_add_columns_rcd_close
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcd_close_flg int8 NULL;

--changeset bhaskar.reddy@impactanalytics.co:product_attributes_filter_add_columns_dates stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_product_attributes_filter_add_columns_bmsl_attr
--comment: product_attributes_filter_add_columns_dates
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS first_sale_date date NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS last_reciept_date date NULL;

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);
