--liquibase formatted sql
--changeset liquibase:article_inventory_dashboard_1 stripComments:false splitStatements:false context:Release_1_9 labels:liquibase_project_start
--comment: initial changeset for article_inventory_dashboard
CREATE TABLE IF NOT EXISTS inventory_smart.article_inventory_dashboard (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	lw_qty int4 NULL,
	wos int4 NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	excess int4 NULL,
	normal int4 NULL,
	shortfall int4 NULL,
	stockout int4 NULL,
	bulk_remaining int4 NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	promo_percentage float4 NULL,
	price_point float4 NULL,
	model_stock float4 NULL,
	lw_margin_percentage float4 NULL,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code),
	CONSTRAINT article_inventory_dashboard_product_fk FOREIGN KEY (article) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset vishal.kumar@impactanalytics.co:article_inventory_dashboard_1 stripComments:false splitStatements:false context:SMA changes labels:MTP-22985_9
--comment: reserve columns added to the article inventory dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard ADD IF NOT EXISTS user_reserve float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD IF NOT EXISTS system_reserve float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD IF NOT EXISTS sma_ecomm_reserve float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD IF NOT EXISTS dc_ecomm_reserve float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD IF NOT EXISTS ecomm_reserve float4 NULL;
