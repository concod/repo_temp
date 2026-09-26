--liquibase formatted sql
--changeset liquibase:store_stock_drilldown stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_stock_drilldown
CREATE TABLE inventory_smart.store_stock_drilldown (
	store_avail_oh float4 NULL,
	store_in_transit float4 NULL,
	oh_dc int4 NULL,
	article varchar NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NOT NULL,
	oo int4 NULL,
	tot_inv float4 NULL,
	lw_qty int4 NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	promo_percentage float4 NULL,
	wos_predicted float4 NULL,
	store_level_prediction float4 NULL,
	size_integrity float4 NULL,
	style_color_status varchar NULL,
	store_status varchar NULL,
	excess int4 NULL,
	normal int4 NULL,
	shortfall int4 NULL,
	stockout int4 NULL,
	available_stores_percentage float4 NULL,
	week_to_date_sales int4 NULL,
	last_day_sales int4 NULL,
	top_25_percent int4 NULL,
	oo_dc int4 NULL,
	it_dc float4 NULL,
	"date" date NOT NULL,
	CONSTRAINT store_stock_drilldown_un UNIQUE (product_code, channel, date, store_code)
);
CREATE INDEX store_stock_drilldown_article_idx ON inventory_smart.store_stock_drilldown USING btree (article, channel);
ALTER TABLE inventory_smart.store_stock_drilldown ADD CONSTRAINT store_stock_drilldown_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.store_stock_drilldown ADD CONSTRAINT store_stock_drilldown_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
