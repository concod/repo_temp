--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:sm_article_inventory_dashboard
--comment: initial changeset for article_inventory_dashboard

CREATE TABLE IF NOT EXISTS inventory_smart.article_inventory_dashboard (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NULL,
	sales_org_name varchar NOT NULL,
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
	oo_dc float4 NULL,
	it_dc float4 NULL,
	sales_1_ago float4 NULL,
	sales_2_ago float4 NULL,
	sales_3_ago float4 NULL,
	sales_4_ago float4 NULL,
	aur float4 NULL,
	sell_through_rate float4 NULL,
	style_color_status varchar NULL,
	wos_oh float4 NULL,
	wos_oh_it float4 NULL,
	dc_oh_oo_it_wos float4 NULL,
	dc_oh_wos float4 NULL,
	dc_oh_oo_wos float4 NULL,
	si_oh_it float4 NULL,
	si_oh_oo_it float4 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code, sales_org_name),
	CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);
CREATE INDEX article_inventory_dashboard_store_code_idx ON inventory_smart.article_inventory_dashboard USING btree (store_code);


--changeset samarjit.mazumder@impactanalytics.co:column_add_article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:sm_column_add_article_inventory_dashboard
--comment: product_type column add article_inventory_dashboard
alter table inventory_smart.article_inventory_dashboard add column product_type varchar  null;

--changeset samarjit.mazumder@impactanalytics.co:store_name_column_add_article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:sm_store_name_column_add_article_inventory_dashboard
--comment: store_name column add article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN store_name varchar NULL;

--changeset samridhi.gupta@impactanalytics.co:column_name_change stripComments:false splitStatements:false context:Release_1_0 labels:sm_store_name_column_change
--comment: store_name column add article_inventory_dashboard_changed
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN lw_qty TO lw_units;

--changeset samridhi.gupta@impactanalytics.co:hierarchy_changes stripComments:false splitStatements:false context:Release_1_0 labels:sm_store_name_column_change
--comment: store_name column add article_inventory_dashboard_changed
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN l4_name TO l6_name;

--changeset samridhi.gupta@impactanalytics.co:ux_changes stripComments:false splitStatements:false context:Release_1_0 labels:sm_store_name_column_change
--comment: store_name column add article_inventory_dashboard_ux_changes
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sales_5_ago FLOAT4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sales_6_ago FLOAT4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sales_7_ago FLOAT4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sales_8_ago FLOAT4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS twos FLOAT4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS style_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS grade VARCHAR NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS price FLOAT4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS average_discount FLOAT4 NULL;


--changeset samridhi.gupta@impactanalytics.co:new_column_drop stripComments:false splitStatements:false context:Release_1_0 labels:sm_store_name_column_change
--comment: store_name column add article_inventory_dashboard_ux_changes
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS style_name;

--changeset samridhi.gupta@impactanalytics.co:article_inventory_dashboard_margin_perc stripComments:false splitStatements:false context: margin_perc labels:margin_perc
--comment: margin_perc column addition
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS style_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS lw_margin_percentage float4 NULL;

-- changeset imran.khan@impactanalytics.co:article_inventory_dashboard_product_tag stripComments:false splitStatements:false context:db_sync labels:added product_tag column
-- comment: added product_tag column
ALTER TABLE inventory_smart.article_inventory_dashboard ADD product_tag varchar GENERATED ALWAYS AS (
CASE
    WHEN stockout IS NOT NULL AND stockout <> 0::double precision THEN 'stockout'::text
    WHEN shortfall IS NOT NULL AND shortfall <> 0::double precision THEN 'shortfall'::text
    WHEN excess IS NOT NULL AND excess <> 0::double precision THEN 'excess'::text
    WHEN normal IS NOT NULL AND normal <> 0::double precision THEN 'normal'::text
    ELSE NULL::text
END) STORED NULL;

-- changeset srinivasgowda.sg@impactanalytics.co:article_inventory_dashboard_rename stripComments:false splitStatements:false context:db_sync labels:rename to base
-- comment: rename to base 
ALTER TABLE inventory_smart.article_inventory_dashboard
RENAME TO article_inventory_dashboard_base;
