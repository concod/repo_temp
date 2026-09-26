--liquibase formatted sql
--changeset liquibase:po_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_master

CREATE TABLE IF NOT EXISTS inventory_smart.po_master (
	po_code varchar NOT NULL,
	product_code varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	allocated_qty int4 NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	not_before_date date NULL,
	CONSTRAINT po_master_un UNIQUE (po_code, product_code, dc_code, channel, requirement_date, not_before_date),
	CONSTRAINT po_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT po_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);

--changeset kaustubh.gupta:po_master stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: schema change for po_master
ALTER TABLE inventory_smart.po_master
ADD COLUMN pack_type_id varchar NULL;


--changeset aman.lakkoju:deleting and addingconstaints po_master stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: deleting and addingconstaints
ALTER TABLE inventory_smart.po_master DROP CONSTRAINT po_master_un;

ALTER TABLE inventory_smart.po_master ADD CONSTRAINT po_master_un UNIQUE (po_code,product_code,requirement_date,channel,dc_code,not_before_date,pack_type_id);

--changeset aman.lakkoju:added article stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: added article
ALTER TABLE inventory_smart.po_master ADD COLUMN IF NOT EXISTS article varchar NULL;

--changeset aman_lakkoju:included oh_pack_qty,oo_pack_qty in po_master stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: added oh_pack_qty,oo_pack_qty in  po_master
ALTER TABLE inventory_smart.po_master ADD COLUMN IF NOT EXISTS oo_pack_qty int4 NULL;
ALTER TABLE inventory_smart.po_master ADD COLUMN IF NOT EXISTS oh_pack_qty int4 NULL;

--changeset aman_lakkoju_:included_pack_type_in_po_master stripComments:false splitStatements:false context:initial_release labels:included_pack_type_in_po_master
--comment: included_pack_type_in_po_master
ALTER TABLE inventory_smart.po_master ADD COLUMN IF NOT EXISTS pack_type varchar NULL;
