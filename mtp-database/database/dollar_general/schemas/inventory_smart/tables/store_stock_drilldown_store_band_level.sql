--liquibase formatted sql
--changeset swapnil.bhange:store_stock_drilldown_store_band_level stripComments:false splitStatements:false context:Release_1_0 labels:0034
--comment: initial changeset for store_stock_drilldown_store_band_level
CREATE TABLE inventory_smart.store_stock_drilldown_store_band_level (
	product_code varchar NOT NULL,
	primary_sku varchar NOT NULL,
	product_description varchar NULL,
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


-- inventory_smart.store_stock_drilldown_store_band_level foreign keys

ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ADD CONSTRAINT store_stock_drilldown_store_band_level_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset swapnil.bhange-2:store_stock_drilldown_store_band_level stripComments:false splitStatements:false context:Release_1_0 labels:ssdst-2
--comment: changed store_band to psa_name  for store_stock_drilldown_store_band_level
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level RENAME COLUMN store_band to psa_name;

--changeset swapnil.bhange-3:store_stock_drilldown_store_band_level stripComments:false splitStatements:false context:Release_1_0 labels:ssdst-3
--comment: changed lw_reciept_cost to lw_receipt_cost  for store_stock_drilldown_store_band_level
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level RENAME COLUMN lw_reciept_cost to lw_receipt_cost;

--changeset swapnil.bhange-4:store_stock_drilldown_store_band_level stripComments:false splitStatements:false context:Release_1_0 labels:ssdst-4
--comment: added index for store_stock_drilldown_store_band_level
CREATE INDEX store_stock_drilldown_store_band_level_product_code_idx ON inventory_smart.store_stock_drilldown_store_band_level USING btree (product_code);


--changeset swapnil.bhange-5:store_stock_drilldown_store_band_level_v5 stripComments:false splitStatements:false context:Release_1_0 labels:ssdst-5
--comment: changed data type for store_stock_drilldown_store_band_level columns
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN oh TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN it TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN oo TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN total_inv TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN dc_oh TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN dc_it TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN dc_oo TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN total_inv_dc TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN std_receipt_units TYPE int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN std_receipt_cost TYPE int8;

--changeset swapnil.bhange6:store_stock_drilldown_store_band_level_v6 stripComments:false splitStatements:false context:Release_1_0 labels:ssdst-6
--comment: changed data type for store_stock_drilldown_store_band_level columns V6
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN psa_name TYPE int8 USING psa_name::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN std_receipt_units TYPE int8 USING std_receipt_units::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN std_receipt_cost TYPE int8 USING std_receipt_cost::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN std_sales_cost TYPE int8 USING std_sales_cost::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN std_sales_units TYPE int8 USING std_sales_units::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN lw_receipt_units TYPE int8 USING lw_receipt_units::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN lw_receipt_cost TYPE int8 USING lw_receipt_cost::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN lw_sales_cost TYPE int8 USING lw_sales_cost::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN lw_sales_units TYPE int8 USING lw_sales_units::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN lw_revenue TYPE int8 USING lw_revenue::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN wos TYPE int8 USING wos::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN oh TYPE int8 USING oh::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN it TYPE int8 USING it::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN oo TYPE int8 USING oo::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN total_inv TYPE int8 USING total_inv::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN dc_oh TYPE int8 USING dc_oh::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN dc_it TYPE int8 USING dc_it::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN dc_oo TYPE int8 USING dc_oo::int8;
ALTER TABLE inventory_smart.store_stock_drilldown_store_band_level ALTER COLUMN total_inv_dc TYPE int8 USING total_inv_dc::int8;

