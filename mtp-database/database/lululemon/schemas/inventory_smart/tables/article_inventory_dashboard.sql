--liquibase formatted sql
--changeset shreyansh.jain@impactanalytics.co:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for article_inventory_dashboard

CREATE TABLE IF NOT EXISTS inventory_smart.article_inventory_dashboard (
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	l6_name text NULL,
	l7_name text NULL,
	l8_name text NULL,
	product_description text NULL,
	article text NULL,
	article_original text NULL,
	store_oh_it_oo numeric NULL,
	dc_oh_it_oo numeric NULL,
	wos_oh_oo_it numeric NULL,
	lw_sales_units numeric NULL,
	wtd_sales_units numeric NULL,
	last_8_week_sales numeric NULL,
	l4_weeks_units numeric NULL,
	l8_weeks_units numeric NULL,
	wtd_revenue numeric(12, 2) NULL,
	wtd_promo numeric(10, 2) NULL,
	lw_margin_perc numeric(10, 2) NULL,
	lw_aur numeric(10, 2) NULL,
	lw_promo numeric(10, 2) NULL,
	wtd_aur numeric(10, 2) NULL,
	wtd_margin numeric(10, 2) NULL,
	dc_oh numeric NULL,
	dc_it numeric NULL,
	dc_oo numeric NULL,
	store_oh numeric NULL,
	store_oo numeric NULL,
	store_it numeric NULL,
	store_oh_it numeric NULL,
	sell_through_perc numeric(10, 2) NULL,
	lw_revenue numeric(12, 2) NULL,
	wos_oh numeric(10, 2) NULL,
	wos_oh_it numeric(10, 2) NULL,
	wos_oh_oo numeric(10, 2) NULL,
	wos_targeted numeric(10, 2) NULL,
	stockout int4 NULL,
	shortfall int4 NULL,
	excess int4 NULL,
	stockout_flag int4 NULL,
	shortfall_flag int4 NULL,
	forecast_1week numeric(10, 2) NULL,
	forecast_4weeks numeric(10, 2) NULL,
	color_code text NULL,
	channel text NULL,
	in_stock_perc numeric(10, 2) NULL,
	store_code text NULL,
	store_name text NULL,
	rnk int4 NULL,
	normal int4 NULL,
	size_integrity float8 NULL
);

--changeset raghav.kirkol@impactanalytics.co:alter_AIDgt stripComments:false splitStatements:false context:Release_1 labels:Alter_AIDgt
--comment: add column oh_dc to AID
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN oh_dc numeric; 


--changeset raghav.kirkol@impactanalytics.co:alter_AID_tot_invg stripComments:false splitStatements:false context:Release_1 labels:Alter_AID_tot_invg
--comment: add column tot_inv to AID
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN tot_inv numeric;


--changeset raghav.kirkol@impactanalytics.co:alter_AID_tot_invg_1 stripComments:false splitStatements:false context:Release_1 labels:Alter_AID_tot_invg
--comment: add column fwos to AID
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN fwos float4;


--changeset raghav.kirkol@impactanalytics.co:alter_AID_tot_invg_3 stripComments:false splitStatements:false context:Release_1 labels:Alter_AID_tot_invg
--comment: DROP COLUMN l8_name
ALTER TABLE inventory_smart.article_inventory_dashboard
DROP COLUMN l8_name;



--changeset raghav.kirkol@impactanalytics.co:alter_AID_add_s2_name stripComments:false splitStatements:false context:Release_1 labels:Alter_AID_tot_invg
--comment: add_column_s2_name
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN s2_name varchar;

--changeset surendra.babu@impactanalytics.co:article_inventory_dashboard_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:aid_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);