--liquibase formatted sql
--changeset liquibase:po_master_por stripComments:false splitStatements:false context:Release_1_0 labels:po_master_por
--comment: initial changeset for po_master_por

CREATE TABLE IF NOT EXISTS inventory_smart.po_master_por (
	order_id varchar NOT NULL,
	po_id varchar NOT NULL,
	asn_id varchar NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NULL,
	fiscal_year_week int4 NULL,
	projected_delivery_date date NOT NULL,
	oo int4 NULL,
	it int4 NULL,
	pseudo_po int4 NULL,
	quantity_ordered int4 NULL,
    gac_date date NULL,
	CONSTRAINT pk_po_master_por PRIMARY KEY (po_id, product_code, asn_id, order_id, loc_code, projected_delivery_date)
);

--changeset saumya.agnihotri:adding_column stripComments_if_not_exist:false splitStatements:false context:Release_1_0 labels:MTP-89111
--comment: adding_columnif_not_exist
ALTER TABLE inventory_smart.po_master_por ADD COLUMN IF NOT EXISTS gac_flag int4 NULL;