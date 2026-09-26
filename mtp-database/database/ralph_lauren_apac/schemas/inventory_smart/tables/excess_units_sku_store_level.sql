--liquibase formatted sql
--changeset linu.nazil:excess_units_sku_store_level stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22504
--comment: Partition changeset for excess_units_sku_store_level
CREATE TABLE IF NOT EXISTS inventory_smart.excess_units_sku_store_level (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	fiscal_year int2 NOT NULL,
	fiscal_week int2 NOT NULL,
	"date" date NOT NULL,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	week_qty int4 NULL,
	ros float4 NULL,
	target_wos int4 NULL,
	wos_pred float4 NULL,
	excess_inv int4 NULL,
	excess_inv_cost float4 NULL,
	tot_inv int4 NULL,
	product_code varchar NULL,
	store_name varchar NULL,
	fiscal_year_week int4 NOT NULL,
	min_stock float4 NULL,
	CONSTRAINT excess_units_sku_store_level_un UNIQUE (product_code, store_code, date, fiscal_year_week),
	CONSTRAINT excess_units_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT excess_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
)
PARTITION BY LIST (fiscal_year_week);