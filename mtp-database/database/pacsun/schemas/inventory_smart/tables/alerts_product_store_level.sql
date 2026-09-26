
--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pascun_alerts_product_store_level
--comment: initial changeset for alerts_product_store_level

CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_store_level (
	article text NOT NULL,
	store_code text NOT NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_id_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	country text NULL,
	s1_id_name text NULL,
	s2_id_name text NULL,
	s3_id_name text NULL,
	s4_name text NULL,
	channel text NULL,
	product_description text NULL,
	dc_flag bool NULL,
	excs_flg int4 NULL,
	shrtfl_flg int4 NULL,
	stckout_flg int4 NULL,
	overstock int4 NULL,
	shortfall int4 NULL,
	stockout int4 NULL,
	normal int4 NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	lw_units int4 NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	promo_percentage float4 NULL,
	wos float4 NULL,
	size_integrity float4 NULL,
	week_to_date_sales float4 NULL,
	last_day_sales float4 NULL,
	oh_dc float4 NULL,
	sales_1_ago float4 NULL,
	sales_2_ago float4 NULL,
	sales_3_ago float4 NULL,
	sales_4_ago float4 NULL,
	sales_5_ago float4 NULL,
	sales_6_ago float4 NULL,
	sales_7_ago float4 NULL,
	sales_8_ago float4 NULL,
	aur float4 NULL,
	clearance_alert_flag int4 NULL,
	newly_launched_alert_flag int4 NULL,
	"Retirement_alert_flag" int4 null,
	CONSTRAINT alerts_product_store_level_pk PRIMARY KEY (article, store_code)
);
CREATE INDEX if not exists alerts_product_store_level_article_idx ON inventory_smart.alerts_product_store_level USING btree (article);
CREATE INDEX if not exists alerts_product_store_level_store_code_idx ON inventory_smart.alerts_product_store_level USING btree (store_code);



--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level_columns_change stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pascun_alerts_product_store_level_columns_change
--comment: alerts_product_store_level_columns_change
alter table inventory_smart.alerts_product_store_level rename column l4_name to style;
alter table inventory_smart.alerts_product_store_level rename column aur to lw_aur;
alter table inventory_smart.alerts_product_store_level rename column wos to wos_oh;
alter table inventory_smart.alerts_product_store_level add column if not exists color_name varchar null;
alter table inventory_smart.alerts_product_store_level add column if not exists brand varchar null;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS in_stock_percentage float4 NULL;
alter table inventory_smart.alerts_product_store_level add column if not exists markdown_ind bool null;
alter table inventory_smart.alerts_product_store_level add column if not exists first_sale_date date null;
alter table inventory_smart.alerts_product_store_level add column if not exists last_receipt_date date null;
alter table inventory_smart.alerts_product_store_level add column if not exists lw_price float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists lw_aps float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists sell_through_rate float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists wos_oh_it float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists forecast_this_wk float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists forecast_next_week float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists forecast_4_next_week float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists forecast_8_next_week float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists no_of_stores_oh int4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists store_name varchar null;
alter table inventory_smart.alerts_product_store_level add column if not exists store_tier varchar null;


--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level_columns_change_for_resolved_flags stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pascun_alerts_product_store_level_columns_change_for_resolved_flags
--comment: alerts_product_store_level_columns_change_for_resolved_flags
alter table inventory_smart.alerts_product_store_level add column if not exists excs_is_resolved int4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists shrtfl_is_resolved int4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists stckout_is_resolved int4 null;


--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level_add_dc_oo_column stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_store_level_add_dc_oo
--comment: Add dc_oo column to alerts_product_store_level
alter table inventory_smart.alerts_product_store_level add column if not exists oo_dc float4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists lw_discount float4 null;

--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level_add_l4_id stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_store_level_add_l4_id
--comment: Add l4_id column to alerts_product_store_level
alter table inventory_smart.alerts_product_store_level add column if not exists l4_id text null;

--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level_add_ladder stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_store_level_add_ladder
--comment: Add ladder column to alerts_product_store_level
alter table inventory_smart.alerts_product_store_level add column if not exists ladder varchar null;

--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level_add_mandatory_columns stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_store_level_add_mandatory_columns
--comment: alerts_product_store_level_add_mandatory_columns
ALTER TABLE inventory_smart.alerts_product_store_level 
ADD COLUMN IF NOT EXISTS s0_name VARCHAR null,
ADD COLUMN IF NOT EXISTS state_name VARCHAR null,
ADD COLUMN IF NOT EXISTS country_name VARCHAR null,
ADD COLUMN IF NOT EXISTS store_code_name VARCHAR null;

--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level_add_dc_available stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_store_level_add_mandatory_columns
--comment: alerts_product_store_level_add_mandatory_columns
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS dc_available int4 null;

--changeset sreevathsa.sp@impactanalytics.co:alerts_product_store_level_add_channel_name stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_store_level_add_channel_name
--comment: alerts_product_store_level_add_channel_name
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS channel_name text null;

--changeset bhaskar.reddy@impactanalytics.co:article_inventory_dashboard_add_few_columns stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_article_inventory_dashboard_add_few_columns
--comment: article_inventory_dashboard_add_mandatory_columns
ALTER TABLE inventory_smart.alerts_product_store_level
ADD COLUMN IF NOT EXISTS L4W_sales float4 null,
ADD COLUMN IF NOT EXISTS L8W_sales float4 null;