--liquibase formatted sql
--changeset linu.nazil:loss_units stripComments:false splitStatements:false context:Release_1 labels:New_Req
--comment: Partition changeset for loss_units
CREATE TABLE IF NOT EXISTS inventory_smart.loss_units (
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
	oo int4 NULL,
	it int4 NULL,
	wos_pred float8 NULL,
	store_name varchar NULL,
	fiscal_year_week int4 NOT NULL,
	CONSTRAINT loss_units_un UNIQUE (product_hierarchy, store_code, date, fiscal_year_week),
	CONSTRAINT loss_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
)
PARTITION BY LIST (fiscal_year_week);
CREATE INDEX loss_units_fiscal_week_idx ON inventory_smart.loss_units USING btree (fiscal_week);
CREATE INDEX loss_units_fiscal_year_idx ON inventory_smart.loss_units USING btree (fiscal_year);