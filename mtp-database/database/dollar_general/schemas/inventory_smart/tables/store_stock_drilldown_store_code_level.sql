--liquibase formatted sql
--changeset swapnil.bhange:store_stock_drilldown_store_code_level stripComments:false splitStatements:false context:Release_1_0 labels:0035
--comment: initial changeset for store_stock_drilldown_store_code_level
CREATE TABLE inventory_smart.store_stock_drilldown_store_code_level (
	product_code varchar NULL,
	primary_sku varchar NULL,
	product_description varchar NULL,
	store_code varchar NULL,
	store_name varchar NULL,
	l0_code varchar NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	store_band int4 NULL,
	target_st_percentage float4 NULL,
	st_percentage float4 NULL,
	std_receipt_units int4 NULL,
	std_receipt_cost int4 NULL,
	std_sales_cost int4 NULL,
	std_sales_units int4 NULL,
	lw_st_percentage float4 NULL,
	lw_receipt_units int4 NULL,
	lw_reciept_cost int4 NULL,
	lw_sales_cost int4 NULL,
	lw_sales_units int4 NULL,
	lw_revenue int4 NULL,
	wos int4 NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	total_inv float4 NULL,
	dc_oh float4 NULL,
	dc_it float4 NULL,
	dc_oo float4 NULL,
	total_inv_dc float4 NULL,
	sku_status varchar NULL,
	store_status varchar NULL
);

-- inventory_smart.store_stock_drilldown_store_code_level foreign keys

ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ADD CONSTRAINT store_stock_drilldown_store_code_level_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ADD CONSTRAINT store_stock_drilldown_store_code_level_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset swapnil.bhange-2:store_stock_drilldown_store_code_level stripComments:false splitStatements:false context:Release_1_0 labels:ssdsc-2
--comment: changed store_band to psa_name  for store_stock_drilldown_store_code_level
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level RENAME COLUMN store_band to psa_name;

--changeset swapnil.bhange-3:store_stock_drilldown_store_code_level stripComments:false splitStatements:false context:Release_1_0 labels:ssdsc-3
--comment: changed lw_reciept_cost to lw_receipt_cost for store_stock_drilldown_store_code_level
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level RENAME COLUMN lw_reciept_cost to lw_receipt_cost;

--changeset swapnil.bhange-4:store_stock_drilldown_store_code_level stripComments:false splitStatements:false context:Release_1_0 labels:ssdsc-4
--comment: added index for store_stock_drilldown_store_code_level
CREATE INDEX store_stock_drilldown_store_code_level_product_code_idx ON inventory_smart.store_stock_drilldown_store_code_level USING btree (product_code);
CREATE INDEX store_stock_drilldown_store_code_level_store_code_idx ON inventory_smart.store_stock_drilldown_store_code_level USING btree (store_code);

--changeset swapnil.bhange-5:store_stock_drilldown_store_code_level_v5 stripComments:false splitStatements:false context:Release_1_0 labels:ssdst-5
--comment: changed data type for store_stock_drilldown_store_code_level columns
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN oh TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN it TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN oo TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN total_inv TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN dc_oh TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN dc_it TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN dc_oo TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN total_inv_dc TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN std_receipt_units TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ALTER COLUMN std_receipt_cost TYPE int8;

--changeset swapnil.bhange@impactanalytics.co:store_stock_drilldown_store_code_level_v6 stripComments:false splitStatements:false context:Release_1_0 labels:ssdst-6
--comment: added store_group and store_attribute
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ADD COLUMN store_group_description varchar;
ALTER TABLE inventory_smart.store_stock_drilldown_store_code_level ADD COLUMN store_attribute varchar;


