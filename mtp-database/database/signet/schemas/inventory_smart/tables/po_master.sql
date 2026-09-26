--liquibase formatted sql
--changeset liquibase:po_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_master
CREATE TABLE inventory_smart.po_master (
	po_code varchar NOT NULL,
	product_code varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	allocated_qty int4 NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	not_before_date date NULL,
	CONSTRAINT po_master_un UNIQUE (po_code, product_code, dc_code, channel, requirement_date, not_before_date)
);


ALTER TABLE inventory_smart.po_master ADD CONSTRAINT po_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.po_master ADD CONSTRAINT po_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset sri.harsha:po_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-17932
--comment: Added po_date and ordered_qty columns
ALTER TABLE inventory_smart.po_master ADD po_date date NOT NULL;
ALTER TABLE inventory_smart.po_master ADD ordered_qty int4 NOT NULL;

--changeset swapnil.bhange:po_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-24266
--comment: removed not null for requirement date
ALTER TABLE inventory_smart.po_master ALTER COLUMN requirement_date DROP NOT NULL;