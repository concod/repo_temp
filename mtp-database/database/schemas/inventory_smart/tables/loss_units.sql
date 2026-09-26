--liquibase formatted sql
--changeset liquibase:loss_units stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for loss_units
CREATE TABLE inventory_smart.loss_units (
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
	CONSTRAINT loss_units_un UNIQUE (product_hierarchy, store_code, fiscal_year, fiscal_week, date)
);
ALTER TABLE inventory_smart.loss_units ADD CONSTRAINT loss_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
