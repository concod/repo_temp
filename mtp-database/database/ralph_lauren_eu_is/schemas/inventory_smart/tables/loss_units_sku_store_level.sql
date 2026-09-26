--liquibase formatted sql
--changeset linu.nazil:loss_units_sku_store_level stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22504
--comment: Partition changeset for loss_units_sku_store_level
CREATE TABLE IF NOT EXISTS inventory_smart.loss_units_sku_store_level (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	fiscal_year int2 NOT NULL,
	fiscal_week int2 NOT NULL,
	"date" date NOT NULL,
	opening_inventory int4 NULL,
	quantity int4 NULL,
	cluster_avg_sales int4 NULL,
	lost_units int4 NULL,
	line_amount float4 NULL,
	lost_sales float4 NULL,
	product_code varchar NULL,
	oo int4 NULL,
	it int4 NULL,
	wos_pred float8 NULL,
	store_name varchar NULL,
	fiscal_year_week int4 NOT NULL,
	CONSTRAINT loss_units_sku_store_level_un UNIQUE (product_code, store_code, date, fiscal_year_week),
	CONSTRAINT loss_units_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT loss_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
)
PARTITION BY LIST (fiscal_year_week);
CREATE INDEX loss_units_sku_store_level_fiscal_week_idx ON inventory_smart.loss_units_sku_store_level USING btree (fiscal_week);
CREATE INDEX loss_units_sku_store_level_fiscal_year_idx ON inventory_smart.loss_units_sku_store_level USING btree (fiscal_year);