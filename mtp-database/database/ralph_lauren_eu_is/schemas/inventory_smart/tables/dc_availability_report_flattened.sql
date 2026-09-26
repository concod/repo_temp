--liquibase formatted sql
--changeset saad.adeeb@impactanalytics.co:dc_availability_report_flattened_redesign stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
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
	seq_no int8 NULL,
	district varchar NULL,
	region varchar NULL,
	climate varchar NULL,
	state varchar NULL,
	city varchar NULL,
	product_group _varchar NULL,
	foe_year varchar NULL,
	season varchar NULL,
	rtl_zone_id varchar NULL,
	store_comp_status_cd varchar NULL,
	store_name varchar NULL,
	color varchar NULL,
	rtl_coordinate_group_desc varchar NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX idx_dc_availability_article_size_channel ON inventory_smart.dc_availability_report_flattened USING btree (article, size, channel);
ALTER TABLE inventory_smart.dc_availability_report_flattened ADD new_article varchar NULL;
ALTER TABLE inventory_smart.dc_availability_report_flattened ADD old_article varchar NULL;
ALTER TABLE inventory_smart.dc_availability_report_flattened ADD active varchar NULL;
--changeset saad.adeeb@impactanalytics.co:dc_availability_report_flattened_redesign_partitition stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73488
--inventory_smart.alerts_product_level definition
DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_33mensapparel;
CREATE TABLE inventory_smart.dc_availability_report_flattened_33mensapparel
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('33-MENS APPAREL');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_44womensapparel;
CREATE TABLE inventory_smart.dc_availability_report_flattened_44womensapparel
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('44-WOMENS APPAREL');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_51accessoriesandfragrance;
CREATE TABLE inventory_smart.dc_availability_report_flattened_51accessoriesandfragrance
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('51-ACCESSORIES AND FRAGRANCE');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_61childrens;
CREATE TABLE inventory_smart.dc_availability_report_flattened_61childrens
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('61-CHILDRENS');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_70home;
CREATE TABLE inventory_smart.dc_availability_report_flattened_70home
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('70-HOME');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_82antiquesandvintage;
CREATE TABLE inventory_smart.dc_availability_report_flattened_82antiquesandvintage
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('82-ANTIQUES AND VINTAGE');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_85finejewelryandwatches;
CREATE TABLE inventory_smart.dc_availability_report_flattened_85finejewelryandwatches
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('85-FINE JEWELRY AND WATCHES');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_92concessionbusinesses;
CREATE TABLE inventory_smart.dc_availability_report_flattened_92concessionbusinesses
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('92-CONCESSION BUSINESSES');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_94generic;
CREATE TABLE inventory_smart.dc_availability_report_flattened_94generic
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('94-GENERIC');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_95shortagegroup;
CREATE TABLE inventory_smart.dc_availability_report_flattened_95shortagegroup
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('95-SHORTAGE GROUP');


DROP TABLE IF EXISTS inventory_smart.dc_availability_report_flattened_97creativeservices;
CREATE TABLE inventory_smart.dc_availability_report_flattened_97creativeservices
PARTITION OF inventory_smart.dc_availability_report_flattened
FOR VALUES IN ('97-CREATIVE SERVICES');


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