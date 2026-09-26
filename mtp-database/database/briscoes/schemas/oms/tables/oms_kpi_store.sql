--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:oms_kpi_master_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_store
--comment: schema changeset for oms_kpi_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_kpi_store (
   	year_week int4 NULL,
	product_code text NULL,
	store_code text NULL,
	dc_inv float4 NULL,
	safety_stock int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	effective_lead_time int4 NULL,
	wos int4 NULL,
	target_service_level float4 NULL,
	ss_base int4 NULL,
	system_inv float4 NULL,
	open_receipt_units float4 NULL,
	min_order_quantity_style int4 NULL,
	min_order_quantity_sku int4 NULL,
	order_multiple int4 NULL,
	channel text NULL,
	vendor_code text NULL,
	vendor_name text NULL,
	max_order_quantity_style int4 NULL,
	max_order_quantity_sku int4 NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_shipment int4 NULL,
	id int4 NULL,
	mrpc int4 NULL,
	store_inv float4 NULL,
	CONSTRAINT pk_oms_kpi_store PRIMARY KEY (product_code, store_code, channel)
);

--changeset kanishka.parashar@impactanalytics.co:oms_kpi_store stripComments:false splitStatements:false context:new_column
--comment: added store_oh
ALTER TABLE inventory_smart.oms_kpi_store ADD COLUMN IF NOT EXISTS store_oh float4 NULL;


--changeset raja.duraisamy@impactanalytics.co:oms_kpi_master_store_index2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_store
--comment: schema changeset for oms_kpi_store_index_added
create index if not exists idx_oms_kpi_store_store_code_product_code_idx on inventory_smart.oms_kpi_store (store_code, product_code, year_week);

--changeset raja.duraisamy@impactanalytics.co.co:oms_kpi_store_columns_update stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_constraints_lead_time_store_index
--comment: oms_kpi_store id column update
ALTER TABLE inventory_smart.oms_kpi_store
DROP COLUMN  IF EXISTS id;

ALTER TABLE inventory_smart.oms_kpi_store
ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;

--changeset raja.duraisamy@impactanalytics.co:oms_kpi_store_index3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_store
--comment: schema changeset for oms_kpi_store_index_added
drop index if exists inventory_smart.idx_oms_kpi_store_store_code_product_code_idx;
create index if not exists idx_oms_kpi_store_product_store_idx on inventory_smart.oms_kpi_store (product_code, store_code);

