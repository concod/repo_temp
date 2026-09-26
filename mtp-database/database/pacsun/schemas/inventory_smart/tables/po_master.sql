--liquibase formatted sql
--changeset sreevathsa.sp:asn_master stripComments:false splitStatements:false context:pacsun_inv_smart labels:PO
--comment: initial changeset for po_master
CREATE TABLE if not exists inventory_smart.po_master (
	po_code varchar NOT NULL,
	product_code varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	allocated_qty int4 NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	not_before_date date NULL,
	CONSTRAINT po_master_un UNIQUE (po_code,product_code,dc_code,channel,requirement_date,not_before_date),
	CONSTRAINT po_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT po_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);


--comment: add additional columns
ALTER TABLE inventory_smart.po_master ADD COLUMN if not exists handling_type VARCHAR null;
ALTER TABLE inventory_smart.po_master ADD COLUMN if not exists reciever_number VARCHAR null;
ALTER TABLE inventory_smart.po_master ADD COLUMN if not exists pre_pack varchar null;

--changeset sreevathsa.sp:po_master_add_columns stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_po_master_add_columns
--comment: adding vi_date to po_master
ALTER TABLE inventory_smart.po_master ADD COLUMN if not exists vi_date DATE null;

--changeset sreevathsa.sp:po_master_add_columns_asn_flag stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_po_master_add_columns_asn_flag
--comment: adding asn_to to po_master
ALTER TABLE inventory_smart.po_master ADD COLUMN if not exists active_asn_flag bool null;