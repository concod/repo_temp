--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:article_inventory_dashboard_change stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_inventory_dashboard_01

CREATE TABLE IF NOT EXISTS inventory_smart.article_inventory_dashboard (
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	article varchar NOT NULL,
	"style" varchar NULL,
	style_description varchar NULL,
	season varchar NULL,
	gender varchar NULL,
	collection varchar NULL,
	"class" varchar NULL,
	subclass varchar NULL,
	sty_primary_occsn_end_use_dsc varchar NULL,
	product_type varchar NULL,
	launch_date date NULL,
	clearance bool NULL,
	clearance_flag varchar NULL,
	planned_clearance_date date NULL,
	store_code varchar NOT NULL,
	store_name varchar NULL,
	store_grade varchar NULL,
	price float4 NULL,
	msrp float4 NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	total_inv float4 NULL,
	wtd_units int4 NULL,
	lw_units float4 NULL,
	lw_margin float4 NULL,
	lw_revenue float4 NULL,
	lw_margin_percentage float4 NULL,
	l4w_units float4 NULL,
	l4w_revenue float4 NULL,
	l8w_units float4 NULL,
	l6m_units float4 NULL,
	discount float4 NULL,
	promo float4 NULL,
	wos_oh_oo_it float4 NULL,
	wos_oh_oo float4 NULL,
	wos_oh_it float4 NULL,
	wos_oh float4 NULL,
	dc_wos_oh_oo_it float4 NULL,
	dc_wos_oh_oo float4 NULL,
	dc_wos_oh float4 NULL,
	stockout float4 NULL,
	shortfall float4 NULL,
	excess float4 NULL,
	normal float4 NULL,
	article_alert_flag varchar NULL,
	sell_through_perc float4 NULL,
	ata_eaches float4 NULL,
	ata_packs float4 NULL,
	ata float4 NULL,
	dc_instock float4 NULL,
	dc_oo float4 NULL,
	in_stock float4 NULL,
	in_stock_ata float4 NULL,
	allocated_units float4 NULL,
	in_stock_count int4 NULL,
	total_count int4 NULL,
	dc_instock_count int4 NULL,
	dc_instock_total_count int4 NULL,
	in_stock_dc_ata_count int4 NULL,
	in_stock_dc_ata_total_count int4 NULL,
	twos float4 NULL,
	product_tag varchar GENERATED ALWAYS AS (
CASE
    WHEN stockout IS NOT NULL AND stockout <> 0::double precision THEN 'stockout'::text
    WHEN shortfall IS NOT NULL AND shortfall <> 0::double precision THEN 'shortfall'::text
    WHEN excess IS NOT NULL AND excess <> 0::double precision THEN 'excess'::text
    WHEN normal IS NOT NULL AND normal <> 0::double precision THEN 'normal'::text
    ELSE NULL::text
END) STORED NULL,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code, l3_name),
	CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);



--changeset ujjawal.singh@impactanalytics.co:article_inventory_dashboard_01 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: columns  addition
ALTER TABLE inventory_smart.article_inventory_dashboard
  ADD COLUMN instock_percentage float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard
  ADD COLUMN stock_to_sell_ratio float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard
 ADD COLUMN size_integrity_oh float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard
  ADD COLUMN size_integrity_oh_it float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard
  ADD COLUMN size_integrity_oh_oo_it float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard
  ADD COLUMN forecast_4w float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard
  ADD COLUMN forecast_w float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard
  ADD COLUMN forecast_8w float4 NULL;