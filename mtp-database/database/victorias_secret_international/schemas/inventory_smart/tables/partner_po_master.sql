--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:partner_po_master_table stripComments:false splitStatements:false context:MTP-18913 labels:partner_po_master
--comment: initial changeset for partner_po_master

CREATE TABLE IF NOT EXISTS inventory_smart.partner_po_master (
	dest_store_code varchar NULL,
	po_num varchar NULL,
	product_code varchar NULL,
	po_date date NULL,
	flrst_cd varchar NULL,
	drop_cd varchar NULL,
	original_qty int4 NULL,
	trans_mode varchar NULL,
	smoothing_flag int4 NULL,
	source_store_code varchar NULL,
	flagged_rows int4 NULL
);