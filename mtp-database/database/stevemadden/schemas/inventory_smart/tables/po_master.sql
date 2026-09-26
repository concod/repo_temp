--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:po_master stripComments:false splitStatements:false context:MTP-18288 labels:liquibase_project_start
--comment: initial changeset for po_master
-- inventory_smart.po_master definition

-- Drop table

-- DROP TABLE inventory_smart.po_master;

CREATE TABLE if not exists inventory_smart.po_master (
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


-- inventory_smart.po_master foreign keys

ALTER TABLE inventory_smart.po_master ADD CONSTRAINT po_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.po_master ADD CONSTRAINT po_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset suryasai.gopal@impactanalytics.co:po_master_pack_type_id stripComments:false splitStatements:false context:MTP-18288 labels:pack_type_id
--comment: pack_type_id column add po_master
ALTER TABLE inventory_smart.po_master ADD if not exists pack_type_id varchar NULL;

ALTER TABLE inventory_smart.po_master DROP CONSTRAINT po_master_un;

ALTER TABLE inventory_smart.po_master ADD CONSTRAINT po_master_un UNIQUE (po_code, pack_type_id, product_code, dc_code, channel, requirement_date, not_before_date);

--changeset laraib.ahmad@impactanalytics.co:po_master_pack_type_id stripComments:false splitStatements:false context:MTP-26840 labels:pack_type_id
--comment: pack_type_id column add article and number_of_allocations
ALTER TABLE inventory_smart.po_master ADD if not exists article varchar NULL;
ALTER TABLE inventory_smart.po_master ADD if not exists number_of_allocations INTEGER NULL;