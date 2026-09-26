--liquibase formatted sql
--changeset swapnil.bhannge:oms_po_master_version_v3 stripComments:false splitStatements:false context:Release_1_0 labels:oms_po_master_version
--comment: initial changeset for oms_po_master_version_v3

CREATE TABLE IF NOT EXISTS inventory_smart.oms_po_master_version (
	version_code int4 NOT NULL,
	order_id varchar NULL,
	po_id varchar NOT NULL,
	asn_id varchar NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	projected_delivery_date date NOT NULL,
	fiscal_year_week int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	pseudo_po int4 NULL,
	created_by int4 NULL,
	created_at timestamp NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	column_updated varchar NULL,
	CONSTRAINT pk_oms_po_master PRIMARY KEY (version_code, po_id, product_code, loc_code, channel, projected_delivery_date)
)PARTITION BY LIST (version_code);

--changeset swapnil.b-5:oms_po_master_version_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in oms_po_master_version_v4
ALTER TABLE inventory_smart.oms_po_master_version ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;
ALTER TABLE inventory_smart.oms_po_master_version ADD COLUMN IF NOT EXISTS quantity_ordered int4 NULL;

