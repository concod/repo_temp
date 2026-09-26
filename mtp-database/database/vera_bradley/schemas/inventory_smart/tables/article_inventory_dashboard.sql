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
	oh_dc int8 NULL,
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
	dc_oh_1 int4 NULL,
	dc_oh_qcloc int4 NULL,
	dc_oh_cwc int4 NULL,
	dc_oh_10 int4 NULL,
	bulk_remaining int4 NULL,
	lw_margin_percentage float4 NULL,
	model_stock float4 NULL,
	price_point float4 NULL,
	sales_1_ago int4 NULL,
	sales_2_ago int4 NULL,
	sales_3_ago int4 NULL,
	sales_4_ago int4 NULL,
	available_to_allocate float4 NULL,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code, channel)
);
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:TYPE_UNIQUE_ID_OF_CHANGE stripComments:false splitStatements:false context:change_oh_it_oo labels:JIRA_NO 
--comment Add comment describing your change 

ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN oh TYPE float8 USING oh::float8;
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN it TYPE float8 USING it::float8;
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN oo TYPE float8 USING oo::float8;


--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;


--changeset suryasai.gopal@impactanalytics.co:article_inventory_dashboard stripComments:false splitStatements:false context:MTP-15174 labels:wos_predicted_oh
--comment: wos_predicted_oh column add article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard ADD if not exists wos_predicted_oh int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD if not exists wos_predicted_oh_it int4 NULL;
--changeset laraib.ahmad@impactanalytics.co:article_inventory_dashboard stripComments:false splitStatements:false context:MTP-22547 labels:week_to_date_sales_revenue,last_day_sales_revenue,sales_revenue_1_ago,sales_revenue_2_ago,sales_revenue_3_ago,sales_revenue_4_ago
--comment:  week_to_date_sales_revenue,last_day_sales_revenue,sales_revenue_1_ago,sales_revenue_2_ago,sales_revenue_3_ago,sales_revenue_4_ago column added
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS week_to_date_sales_revenue  float4 NULL ;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS last_day_sales_revenue  float4 NULL ;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sales_revenue_1_ago  float4 NULL ;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sales_revenue_2_ago  float4 NULL ;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sales_revenue_3_ago  float4 NULL ;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sales_revenue_4_ago  float4 NULL ;