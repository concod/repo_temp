--liquibase formatted sql
--changeset bhavya.visaria@impactanalytics.co:po_master_por stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial version of po_master_por 

CREATE TABLE IF NOT EXISTS oms.po_master_por (
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
	gac_flag int4 NULL,
	created_by int8 NULL,
	created_at timestamptz NULL,
	updated_by int8 NULL,
	updated_at timestamptz NULL,
	column_updated text NULL,
	row_num int8 NULL,
	CONSTRAINT pk_po_master_por PRIMARY KEY (po_id, product_code, asn_id, order_id, loc_code, projected_delivery_date)
);

--changeset bhavya.visaria@impactanalytics.co:po_master_por_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  version of po_master_por_v1_column_add

alter table oms.po_master_por add column if not exists po_item varchar NULL;