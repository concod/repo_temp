--liquibase formatted sql
--changeset liquibase:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_inventory_dashboard
CREATE TABLE inventory_smart.article_inventory_dashboard (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	store_level_prediction float8 NULL,
	oh_dc int4 NULL,
	shortfall int4 NULL,
	normal int4 NULL,
	excess int4 NULL,
	wos int4 NULL,
	lw_qty int4 NULL,
	promo_percentage float4 NULL,
	stockout int4 NULL,
	tot_inv float4 NULL,
	si float4 NULL,
	available_stores_percentage float4 NULL,
	week_to_date_sales int4 NULL,
	last_day_sales int4 NULL,
	top_25_percent float4 NULL,
	oo_dc float4 NULL,
	it_dc float4 NULL,
	channel varchar NOT NULL,
	wos_predicted_oh_oo float4 NULL,
	wos_predicted_oh float4 NULL,
	si_it float4 NULL,
	si_dc float4 NULL,
	si_all float4 NULL,
	clearance bool NULL,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code, channel)
);
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD si_oo float4 NULL;

--changeset manas.malik@impactanalytics.co:article_inventory_dashboard_wos stripComments:false splitStatements:false context:MTP-15174 labels:wos
--comment: wos column  aid datatype change in article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN wos TYPE float8 USING wos::float8;
