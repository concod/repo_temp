--liquibase formatted sql
--changeset liquibase:oms_po_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_po_master
CREATE TABLE IF NOT EXISTS inventory_smart.oms_po_master (
	product_code varchar(50) NULL,
	"location" varchar(50) NULL,
	channel varchar(50) NULL,
	quantity_ordered float4 NULL,
	open_quantity float4 NULL,
	store_type varchar(50) NULL,
	fiscal_year int4 NULL,
	fiscal_week int4 NULL,
	quantity_received float4 NULL,
	po_id varchar(50) NULL,
	vendor_code int4 NULL,
	completed_date date NULL,
	not_before_date date NULL,
	not_after_date date NULL,
	"date" date NULL,
	store_banner varchar(50) NULL,
	product_banner varchar(50) NULL,
	ideal_receipt_date date NULL,
	primary_wh text NULL
);

--changeset jaya.khandelwal@impactanalytics.co:oms_po_master_2 stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1122
--comment: initial changeset for oms_po_master
ALTER TABLE inventory_smart.oms_po_master ALTER COLUMN vendor_code TYPE varchar(50);

--changeset aman.lakkoju:Added product_channel_name_1 column stripComments:false splitStatements:false context:Release_1_0 labels:MTP-31858
--comment: Added product_channel_name column
ALTER TABLE inventory_smart.oms_po_master ADD COLUMN IF NOT EXISTS product_channel_name varchar(50) NULL;