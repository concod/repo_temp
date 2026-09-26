-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:article_inventory_dashboard stripComments:false splitStatements:false context: db_sync labels:article_inventory_dashboard
-- comment: initial changeset for article_inventory_dashboard

CREATE TABLE inventory_smart.article_inventory_dashboard (
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
	lw_units float4 NULL,
	lw_margin float4 NULL,
	lw_revenue float4 NULL,
	l4w_units float4 NULL,
	l4w_revenue float4 NULL,
	l8w_units float4 NULL,
	discount float4 NULL,
	promo float4 NULL,
	wos_oh_oo_it float4 NULL,
	wos_oh_oo float4 NULL,
	wos_oh float4 NULL,
	dc_wos_oh_oo_it float4 NULL,
	dc_wos_oh_oo float4 NULL,
	dc_wos_oh float4 NULL,
	stockout float4 NULL,
	shortfall float4 NULL,
	excess float4 NULL,
	normal float4 NULL,
	sell_through_perc float4 NULL,
	ata_eaches float4 NULL,
	ata_packs float4 NULL,
	ata float4 NULL,
	dc_instock float4 NULL,
	in_stock float4 NULL,
	in_stock_ata float4 NULL,
	allocated_units float4 null,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code)
);
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES global.store_master(store_code) ON DELETE CASCADE;

--changeset shameel.zeshan@impactanalytics.co:article_inventory_dashboard_dc_oo stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-40 labels:schema 
--comment: dc_oo column addition 
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_oo float4 NULL; 

--changeset shameel.zeshan@impactanalytics.co:article_inventory_dashboard_wos_oh_it stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-40 labels:schema 
--comment: wos_oh_it column addition 
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS wos_oh_it float4 NULL; 

--changeset shameel.zeshan@impactanalytics.co:article_inventory_dashboard_l6m_units stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-40 labels:schema 
--comment: l6m_units column addition 
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l6m_units float4 NULL; 

--changeset shameel.zeeeshan@impactanalytics.co:article_inventory_dashboard_dc_instock_count stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-40 labels:schema 
--comment: dc_instock_count column addition 
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock_count int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS total_count int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_instock_count int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_instock_total_count int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock_dc_ata_count int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock_dc_ata_total_count int4 NULL;

--changeset shameel.zeshan@impactanalytics.co:article_inventory_dashboard_dc_instock_count stripComments:false splitStatements:false context: clearance_flag column addition labels:added clearance_flag 
--comment: added clearance_flag
ALTER TABLE inventory_smart.article_inventory_dashboard ADD if not exists clearance_flag varchar NULL;

--changeset aman.lakkoju:added_wtd_sales_metrics stripComments:false splitStatements:false context: clearance_flag column addition labels:added clearance_flag 
--comment: added_wtd_sales_metrics
ALTER TABLE inventory_smart.article_inventory_dashboard 
ADD COLUMN IF NOT EXISTS wtd_units int4 NULL,
ADD COLUMN IF NOT EXISTS w2_units int4 NULL,
ADD COLUMN IF NOT EXISTS w3_units int4 NULL,
ADD COLUMN IF NOT EXISTS w4_units int4 NULL,
ADD COLUMN IF NOT EXISTS w5_units int4 NULL,
ADD COLUMN IF NOT EXISTS w6_units int4 NULL,
ADD COLUMN IF NOT EXISTS w7_units int4 NULL,
ADD COLUMN IF NOT EXISTS w8_units int4 NULL,
ADD COLUMN IF NOT EXISTS twos float4 NULL;



--changeset aman_lakkoju:added_artile_alert_flag_column stripComments:false splitStatements:false context: clearance_flag column addition labels:added clearance_flag 
--comment: added_artile_alert_flag_column
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS article_alert_flag varchar NULL;


--changeset shrinidhi.choragi@impactanalytics.co:article_inventory_dashboard_margin_perc stripComments:false splitStatements:false context: margin_perc labels:margin_perc 
--comment: margin_perc column addition 
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS lw_margin_percentage float4 NULL; 

-- changeset linu.nazil@impactanalytics.co:article_inventory_dashboard_product_tag stripComments:false splitStatements:false context:db_sync labels:added clearance_flag
-- comment: added product_tag column
ALTER TABLE inventory_smart.article_inventory_dashboard ADD product_tag varchar GENERATED ALWAYS AS (
CASE
    WHEN stockout IS NOT NULL AND stockout <> 0::double precision THEN 'stockout'::text
    WHEN shortfall IS NOT NULL AND shortfall <> 0::double precision THEN 'shortfall'::text
    WHEN excess IS NOT NULL AND excess <> 0::double precision THEN 'excess'::text
    WHEN normal IS NOT NULL AND normal <> 0::double precision THEN 'normal'::text
    ELSE NULL::text
END) STORED NULL;

--changeset surendra.babu@impactanalytics.co:article_inventory_dashboard_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:aid_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);