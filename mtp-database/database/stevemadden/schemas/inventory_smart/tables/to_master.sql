--liquibase formatted sql
--changeset liquibase:to_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for to_master
CREATE TABLE inventory_smart.to_master (
	line_status varchar NULL,
	line_status_description text NULL,
	header_status varchar NULL,
	header_status_description text NULL,
	allocation_order int2 NULL,
	invent_site_id_from varchar NULL,
	invent_location_id_from varchar NULL,
	wms_location_id_from varchar NULL,
	invent_site_id_to varchar NULL,
	invent_location_id_to varchar NULL,
	wms_location_id_to varchar NULL,
	product_code varchar NULL,
	quantity_transferred int4 NULL,
	quantity_received int4 NULL,
	quantity_remain_received int4 NULL,
	quantity_shipped int4 NULL,
	quantity_remain_shipped int4 NULL,
	"date" date NULL,
	shipping_date date NULL,
	receipt_date date NULL,
	allocation_user varchar NULL,
	sales_category varchar NULL,
	inventory_status_id_from varchar NULL,
	inventory_status_id_to varchar NULL,
	allocation_code varchar NULL,
	to_code varchar NOT NULL,
	to_id varchar NULL,
	line_num int4 NULL,
	invent_trans_id varchar NULL,
	CONSTRAINT to_master_pk PRIMARY KEY (to_code)
);


--changeset ashish.gupta:to_master_updated_index stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added new index 
CREATE INDEX to_master_allocation_code_idx ON inventory_smart.to_master (allocation_code);