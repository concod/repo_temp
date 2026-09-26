--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:po_master stripComments:false splitStatements:false context:MTP-1234 labels:schema 
--comment: initial changeset for po_master
CREATE TABLE inventory_smart.po_master (
	po_code varchar NOT NULL,
    pack_type_id varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
    allocated_qty int4 NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	not_before_date date NULL,
	article varchar NULL,
	number_of_allocations int4 NULL,
	CONSTRAINT po_master_un UNIQUE (po_code, article, pack_type_id),
	CONSTRAINT po_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE
);

--changeset sri.harsha@impactanalytics.co:po_master_2 stripComments:false splitStatements:false context:MTP-1234 labels:schema 
--comment: initial changeset for po_master
ALTER TABLE inventory_smart.po_master
ADD COLUMN product_code varchar NULL;

--changeset sri.harsha@impactanalytics.co:po_master_4 stripComments:false splitStatements:false context:MTP-1234 labels:schema 
--comment: modify unique constraint to include product_code
ALTER TABLE inventory_smart.po_master DROP CONSTRAINT po_master_un;
ALTER TABLE inventory_smart.po_master ADD CONSTRAINT po_master_un UNIQUE (po_code, article, pack_type_id, product_code);