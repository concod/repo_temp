--liquibase formatted sql
--changeset liquibase:oms_po_master_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_po_master_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_po_master (
	po_id varchar NOT NULL,
	product_code varchar(50) NOT NULL,
	loc_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	oo int4 NULL,
	it int4 NULL,
	projected_delivery_date date NOT NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(50) NULL,
	id serial4 NOT NULL,
	order_id varchar NULL,
	asn_id varchar NULL,
	fiscal_year_week int4 NULL,
	pseudo_po int4 NULL,
	CONSTRAINT pk_oms_po_master PRIMARY KEY (po_id, product_code, loc_code, channel, projected_delivery_date)
);

--changeset pradeep.kumar:adding_quantity_ordered_test stripComments:false splitStatements:false context:Release_1_0 labels:adding_quantity_ordered_column_test
--comment: adding quantity_ordered_column

ALTER TABLE inventory_smart.oms_po_master ADD COLUMN IF NOT EXISTS quantity_ordered INTEGER;