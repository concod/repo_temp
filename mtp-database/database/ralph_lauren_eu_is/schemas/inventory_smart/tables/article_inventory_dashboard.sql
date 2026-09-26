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
	store_level_prediction float4 NULL,
	oh_dc int4 NULL,
	shortfall int4 NULL,
	normal int4 NULL,
	excess int4 NULL,
	wos float4 NULL,
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
	lw_margin_percentage float4 NULL,
	sales_1_ago float4 NULL,
	sales_2_ago float4 NULL,
	sales_3_ago float4 NULL,
	sales_4_ago float4 NULL,
	sales_5_ago float4 NULL,
	sales_6_ago float4 NULL,
	sales_7_ago float4 NULL,
	sales_8_ago float4 NULL,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code, channel)
);
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
CREATE INDEX article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);
CREATE INDEX article_inventory_dashboard_store_code_idx ON inventory_smart.article_inventory_dashboard USING btree (store_code);

--changeset saad_adeeb:article_inventory_dashboard stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-18915
--comment: Added 8 new columns
ALTER TABLE inventory_smart.article_inventory_dashboard ADD aur float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD sales_pen_pct float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD sales_build float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD sell_through_rate float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD inv_pen_pct float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD stock_to_sales_ratio float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD weeks_oh float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD inv_build float4 NULL;


--changeset jagadeesh_pondara:article_inventory_dashboard stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-24427
--comment: Added 1 new column

ALTER TABLE inventory_smart.article_inventory_dashboard ADD style_color_status varchar NULL;

--changeset kuldeep.rathore@impactanalytics.co:adding dc_instock_pct & dc_instock_pct_details stripComments:false splitStatements:false context:Release_1_2 labels:MTP-64047
--comment: Adding dc_instock_pct
ALTER TABLE inventory_smart.article_inventory_dashboard ADD dc_instock_pct float4 NULL;

--changeset kirubasahari.n@impactanalytics.co:article_inventory_dashboard_col_Addition stripComments:fasle splitStatements:false context:RLIS Labels:MTP-64076
--comment: Adding columns related to consolidated report

ALTER TABLE inventory_smart.article_inventory_dashboard  ADD capped_demand float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD estimated_demand float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD min_constraints float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD max_constraints float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD floorset_date date NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD financial_zone varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD instock_pct float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD instock_pct_details float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD twos float4 NULL;

--changeset ishaan.singh@impactanalytics.co:article_inventory_dashboard_col_Add stripComments:fasle splitStatements:false context:RLIS Labels:MTP-6407
--comment: Adding two columns 

ALTER TABLE inventory_smart.article_inventory_dashboard  ADD dc_oh_packs int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD total_inventory int4 NULL;


