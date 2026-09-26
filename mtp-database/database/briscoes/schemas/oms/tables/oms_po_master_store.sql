--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_po_master_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_po_master_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_po_master_store (
   	order_id text NULL,
	po_id text NULL,
	asn_id text NULL,
	product_code text NULL,
	store_code text NULL,
	channel text NULL,
	projected_delivery_date date NULL,
	fiscal_year_week int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	pseudo_po int4 NULL,
	quantity_ordered int4 NULL
);


--changeset raja.duraisamt@impactanalytics.co:oms_po_master_store_index1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_po_master_store_index_added

create index if not exists idx_oms_po_master_store_product_code_fiscal_year_week_idx on inventory_smart.oms_po_master_store (product_code, fiscal_year_week);

--changeset raja.duraisamy@impactanalytics.co:oms_po_master_store_index2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_po_master_store_index_added
drop index if exists inventory_smart.idx_oms_po_master_store_product_code_fiscal_year_week_idx;
create index if not exists idx_oms_po_master_store_product_store_idx on inventory_smart.oms_po_master_store (product_code, store_code);