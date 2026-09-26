--liquibase formatted sql
--changeset dushant.raut@impactanalytics.co:dc_availability_report_flattened stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
--inventory_smart.alerts_product_level definition
CREATE TABLE inventory_smart.dc_availability_report_flattened (
	article varchar NULL,
	style_color_id varchar NULL,
	l1_id varchar NULL,
	l1_name varchar NULL,
	l2_id varchar NULL,
	l2_name varchar NULL,
	l3_id varchar NULL,
	l3_name varchar NULL,
	l4_id varchar NULL,
	l4_name varchar NULL,
	brand varchar NULL,
	style varchar NULL,
	product_description varchar NULL,
	model_description varchar NULL,
	size varchar NULL,
	size_name varchar NULL,
	retail_facility_code varchar NULL,
	l0_id varchar NULL,
	l0_name varchar NULL,
	channel varchar NULL,
	oh int8 NULL,
	sg_name text NULL,
	source varchar NULL,
	supersede_flag varchar NULL,
	new_article varchar NULL,
	old_article varchar NULL,
	active varchar NULL,
	product_group varchar NULL,
	dtc_season varchar NULL,
	dtc_year varchar NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	rtl_coordinate_group_desc varchar NULL,
	color varchar NULL,
	country varchar NULL,
	district varchar NULL,
	state varchar NULL,
	region varchar NULL,
	city varchar NULL,
	climate varchar NULL,
	store_name varchar NULL,
	store_comp_status_cd varchar NULL,
	seq_no int8 NULL,
	dc_code int8 NULL,
	dc_name varchar NULL,
	default_store_groups int4 NULL,
	key text NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX idx_dc_availability_article_size_channel ON inventory_smart.dc_availability_report_flattened (article, "size", channel);
CREATE INDEX idx_dc_availability_article_size_dc_code ON inventory_smart.dc_availability_report_flattened (article, "size", dc_code);

--changeset dushant.raut@impactanalytics.co:dc_availability_report_flattened_v2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488_
--inventory_smart.alerts_product_level definition_

DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened;
CREATE TABLE inventory_smart.dc_availability_report_flattened (
	article varchar NULL,
	style_color_id varchar NULL,
	l1_id varchar NULL,
	l1_name varchar NULL,
	l2_id varchar NULL,
	l2_name varchar NULL,
	l3_id varchar NULL,
	l3_name varchar NULL,
	l4_id varchar NULL,
	l4_name varchar NULL,
	brand varchar NULL,
	"style" varchar NULL,
	product_description varchar NULL,
	model_description varchar NULL,
	"size" varchar NULL,
	size_name varchar NULL,
	retail_facility_code varchar NULL,
	l0_id varchar NULL,
	l0_name varchar NULL,
	channel varchar NULL,
	oh int8 NULL,
	sg_name text NULL,
	"source" varchar NULL,
	supersede_flag varchar NULL,
	new_article varchar NULL,
	old_article varchar NULL,
	active varchar NULL,
	product_group _varchar NULL,
	dtc_season varchar NULL,
	dtc_year varchar NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	rtl_coordinate_group_desc varchar NULL,
	color varchar NULL,
	country varchar NULL,
	district varchar NULL,
	state varchar NULL,
	region varchar NULL,
	city varchar NULL,
	climate varchar NULL,
	store_name varchar NULL,
	store_comp_status_cd varchar NULL,
	seq_no varchar NULL,
	dc_code int8 NULL,
	dc_name varchar NULL,
	default_store_groups _int4 NULL,
	"key" text NULL,
	instock_pct varchar NULL,
	instock_pct_details varchar NULL,
	product_code varchar NULL,
	rtl_zone_id varchar NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX idx_dc_availability_article_size_channel ON inventory_smart.dc_availability_report_flattened (article,"size",channel);
CREATE INDEX idx_dc_availability_article_size_dc_code ON inventory_smart.dc_availability_report_flattened (article,"size",dc_code);

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_33mensapparel
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('33-MENS APPAREL');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_44womensapparel
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('44-WOMENS APPAREL');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_51accessoriesandfragrance
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('51-ACCESSORIES AND FRAGRANCE');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_61childrens
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('61-CHILDRENS');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_70home
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('70-HOME');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_82antiquesandvintage
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('82-ANTIQUES AND VINTAGE');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_85finejewelryandwatches
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('85-FINE JEWELRY AND WATCHES');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_92concessionbusinesses
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('92-CONCESSION BUSINESSES');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_94generic
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('94-GENERIC');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_95shortagegroup
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('95-SHORTAGE GROUP');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_97creativeservices
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('97-CREATIVE SERVICES');

CREATE TABLE IF NOT EXISTS inventory_smart.dc_availability_report_flattened_81innovation
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('81-INNOVATION');



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