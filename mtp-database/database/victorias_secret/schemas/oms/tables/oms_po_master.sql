--liquibase formatted sql
--changeset liquibase:oms_po_master stripComments:false splitStatements:false context:Release_1_0 labels:oms_po_master
--comment: initial changeset for oms_po_master

CREATE TABLE IF NOT EXISTS inventory_smart.oms_po_master (
	order_id varchar NOT NULL,
	po_id varchar NOT NULL,
	asn_id varchar NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	fiscal_year_week int4 NULL,
	projected_delivery_date date NOT NULL,
	oo int4 NULL,
	it int4 NULL,
	pseudo_po int4 NULL,
	CONSTRAINT pk_oms_po_master PRIMARY KEY (po_id, product_code, asn_id, order_id, loc_code, channel, projected_delivery_date)
);

--changeset kanishka.parashar:channel_update stripComments:false splitStatements:false context:Release_1_0 labels:updating_channel_column
--comment: channel_column_update
ALTER TABLE inventory_smart.oms_po_master 
DROP CONSTRAINT pk_oms_po_master;

ALTER TABLE inventory_smart.oms_po_master 
ALTER COLUMN channel DROP NOT NULL;

ALTER TABLE inventory_smart.oms_po_master 
ADD CONSTRAINT pk_oms_po_master 
PRIMARY KEY (po_id, product_code, asn_id, order_id, loc_code, projected_delivery_date);

--changeset kanishka.parashar:column_update1 stripComments:false splitStatements:false context:Release_1_0 labels:adding_column1
--comment: adding_column
ALTER TABLE inventory_smart.oms_po_master add column if not exists quantity_ordered int4 null;