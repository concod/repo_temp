--liquibase formatted sql
--changeset liquibase:store_stock_drilldown stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_stock_drilldown
CREATE TABLE inventory_smart.store_stock_drilldown (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	"date" date NOT NULL,
	store_avail_oh int4 NULL,
	store_in_transit int4 NULL,
	dc_oh int4 NULL,
	model_stock int4 NULL,
	min int4 NULL,
	max int4 NULL,
	wos int4 NULL,
	po_oo_next_30_days_store float8 NULL,
	po_oo_next_60_days_store float8 NULL,
	po_oo_next_90_days_store float8 NULL,
	po_oo_next_30_days_dc float8 NULL,
	po_oo_next_60_days_dc float8 NULL,
	po_oo_next_90_days_dc float8 NULL,
	CONSTRAINT store_stock_drilldown_un UNIQUE (product_code, store_code, date)
);
