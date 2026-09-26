--liquibase formatted sql
--changeset nibeel.yunus@impactanalytics.co:po_master stripComments:false splitStatements:false contextMTP-64270 labels:MTP-64270 
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
	article varchar NULL,
	CONSTRAINT po_master_un UNIQUE (po_code, product_code, dc_code, channel, requirement_date, not_before_date),
	CONSTRAINT po_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT po_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);

--changeset sidhartha.c@impactanalytics.co:po_master_1 stripComments:false splitStatements:false contextMTP-64270 labels:po_master_1
--comment: newly added columns changeset for po_master_1
alter table inventory_smart.po_master add column sales_org_name varchar NOT null;
alter table inventory_smart.po_master add column pack_type_id varchar null;
alter table inventory_smart.po_master add column number_of_allocations int4 NOT NULL;
ALTER TABLE inventory_smart.po_master ALTER COLUMN channel DROP NOT NULL;
