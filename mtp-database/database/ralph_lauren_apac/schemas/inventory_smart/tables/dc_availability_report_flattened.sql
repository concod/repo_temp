--liquibase formatted sql
--changeset saad.adeeb@impactanalytics.co:dc_availability_report_flattened stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
--inventory_smart.alerts_product_level definition
    CREATE TABLE inventory_smart.dc_availability_report_flattened (
    l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l0_id varchar NULL,
	l1_id varchar NULL,
	l2_id varchar NULL,
	l3_id varchar NULL,
	l4_id varchar NULL,
	"size" varchar NULL,
	"source" varchar NULL,
	brand varchar NULL,
	style_color_id varchar NULL,
	product_description text NULL,
	model_description varchar NULL,
	article varchar NULL,
	"style" varchar NULL,
	channel varchar NULL,
	product_code varchar NULL,
	supersede_flag varchar NULL,
	oh int8 NULL,
	dc_code int4 NULL,
	dc_name varchar NULL,
	default_store_groups _int4 NULL,
	sg_name text NULL,
	"key" text NULL,
	country varchar NULL,
	dc_instock_pct numeric NULL,
	dc_instock_pct_details numeric NULL,
	seq_no int8 NULL
) PARTITION BY LIST (l0_name);

-- Create indexes on article, size, and channel for efficient joins
CREATE INDEX idx_dc_availability_article_size_channel ON inventory_smart.dc_availability_report_flattened (article, "size", channel);
--changeset saad.adeeb@impactanalytics.co:dc_availability_report_flattened_idx_add stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
--inventory_smart.alerts_product_level added new index
CREATE INDEX idx_dc_availability_article_size_dc_code ON inventory_smart.dc_availability_report_flattened USING btree (article, size, dc_code);

--changeset sidhartha.c@impactanalytics.co:dc_availability_report_flattened__ stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
--inventory_smart.dc_availability_report_flattened
ALTER TABLE inventory_smart.dc_availability_report_flattened
ADD COLUMN state VARCHAR NULL,
ADD COLUMN city VARCHAR NULL,
ADD COLUMN product_group VARCHAR NULL,
ADD COLUMN season VARCHAR NULL,
ADD COLUMN rtl_zone_id VARCHAR NULL,
ADD COLUMN store_comp_status_cd VARCHAR NULL,
ADD COLUMN store_name VARCHAR NULL,
ADD COLUMN color VARCHAR NULL,
ADD COLUMN rtl_coordinate_group_desc VARCHAR NULL;


--changeset sidhartha.c@impactanalytics.co:dc_availability_report_flattened____ stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488_
--inventory_smart.dc_availability_report_flattened added columns
ALTER TABLE inventory_smart.dc_availability_report_flattened
ADD COLUMN district VARCHAR NULL,
ADD COLUMN region VARCHAR NULL;
--changeset saad.adeeb@impactanalytics.co:dc_availability_report_flattened_redesigned stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
--dc_availability_report_flattened_redesigned
ALTER TABLE inventory_smart.dc_availability_report_flattened ADD new_article varchar NULL;
ALTER TABLE inventory_smart.dc_availability_report_flattened ADD old_article varchar NULL;
ALTER TABLE inventory_smart.dc_availability_report_flattened ADD active varchar NULL;

--changeset kuldeep.rathore@impactanalytics.co:dc_availability_report_flattened_new stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
--dc_availability_report_flattened_new
ALTER TABLE inventory_smart.dc_availability_report_flattened
    ADD COLUMN IF NOT EXISTS country varchar null,
    ADD COLUMN IF NOT EXISTS retail_region varchar null,
    ADD COLUMN IF NOT EXISTS forecasting_channel varchar null, 
    ADD COLUMN IF NOT EXISTS year varchar null;
	
--changeset kuldeep.rathore@impactanalytics.co:dc_availability_report_flattened_dtype_change stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
--dc_availability_report_flattened_dtype_change
ALTER TABLE inventory_smart.dc_availability_report_flattened
ALTER COLUMN product_group TYPE varchar[] USING ARRAY[product_group];


--changeset navy.modepalli@impactanalytics.co:dc_availability_report_flattened_column_rename stripComments:false splitStatements:false context:Release_1_0
--dc_availability_report_flattened_dtype_change renaming columns
ALTER TABLE inventory_smart.dc_availability_report_flattened
RENAME COLUMN city TO s4_name;
ALTER TABLE inventory_smart.dc_availability_report_flattened
RENAME COLUMN country TO s1_name;
ALTER TABLE inventory_smart.dc_availability_report_flattened
RENAME COLUMN region TO s2_id;
ALTER TABLE inventory_smart.dc_availability_report_flattened
RENAME COLUMN state TO s3_name;