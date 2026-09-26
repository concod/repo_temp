
--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:article_inventory_dashboard_v1 stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_article_inventory_dashboard
--comment: initial changeset for article_inventory_dashboard

CREATE TABLE IF NOT EXISTS inventory_smart.article_inventory_dashboard (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NOT NULL,
    product_description varchar null,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
    tot_inv int4 null,
    lw_units int4 null,
    lw_revenue float4 null,
    lw_margin float4 null,
    promo_percentage float4 null,
    wos float4 null,
    store_level_prediction float4 null,
    size_integrity float4 null,
    total_count float4 null,
    in_stock_count float4 null,
    overstock int4 null,
    normal int4 null,
    shortfall int4 null,
    stockout int4 null,
    available_stores_percentage float4 null,
    week_to_date_sales float4 null,
    last_day_sales float4 null,
    oh_dc int4 null,
    oo_dc int4 null,
    dc_oo_po int4 null,
    it_dc int4 null,
    sales_1_ago float4 null,
    sales_2_ago float4 null,
    sales_3_ago float4 null,
    sales_4_ago float4 null,
    sales_5_ago float4 null,
    sales_6_ago float4 null,
    sales_7_ago float4 null,
    sales_8_ago float4 null,
    aur float4 null,
    sell_through_rate float4 null,
    style_color_status varchar null,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code),
	CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX if not exists article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);
CREATE INDEX if not exists article_inventory_dashboard_store_code_idx ON inventory_smart.article_inventory_dashboard USING btree (store_code);


--changeset sreevathsa.sp@impactanalytics.co:add_column_article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_add_column_article_inventory_dashboard
--comment: initial changeset for add_column_article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN wos to wos_oh;

ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_available float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_oo_30_days float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock_percentage float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS first_sale_date date NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS last_receipt_date date NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS lw_store_units float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS lw_sfs_units float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS lw_price float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS lw_aur float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS lw_aps float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS it_allocated float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS it_shipped float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS it_store_to_store float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS fwos float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS wos_oh_it float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS hybrid_wos float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS hybrid_wos_oh_it float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS upas float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS forecast_this_wk float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS forecast_next_wk float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS forecast_4_next_wk float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS forecast_8_next_wk float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS no_of_stores_oh float4 NULL;


--changeset sreevathsa.sp@impactanalytics.co:add_columns_article_inventory_dashboard_add_hier_columns stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_add_columns_article_inventory_dashboard_add_hier_columns
--comment: add style, color_name, l0_name, l1_name, l2_name, l3_id_name, brand, markdown_ind columns to article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS style varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS color_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l0_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l1_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l2_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l3_id_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS brand varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS markdown_ind varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS store_tier varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS store_name varchar NULL;

--changeset sreevathsa.sp@impactanalytics.co:add_column_article_inventory_dashboard_l4_id stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_add_column_article_inventory_dashboard_l4_id
--comment: Add l4_id column to article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l4_id text NULL;

--changeset sreevathsa.sp@impactanalytics.co:article_inventory_dashboard_add_ladder stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_article_inventory_dashboard_add_ladder
--comment: Add l4_id column to article_inventory_dashboard
alter table inventory_smart.article_inventory_dashboard add column if not exists ladder varchar null;

--changeset sreevathsa.sp@impactanalytics.co:article_inventory_dashboard_add_mandatory_columns stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_article_inventory_dashboard_add_mandatory_columns
--comment: article_inventory_dashboard_add_mandatory_columns
ALTER TABLE inventory_smart.article_inventory_dashboard 
ADD COLUMN IF NOT EXISTS s0_name VARCHAR null,
ADD COLUMN IF NOT EXISTS s1_id_name VARCHAR null,
ADD COLUMN IF NOT EXISTS s2_id_name VARCHAR null,
ADD COLUMN IF NOT EXISTS s3_id_name VARCHAR null,
ADD COLUMN IF NOT EXISTS s4_name VARCHAR null,
ADD COLUMN IF NOT EXISTS state_name VARCHAR null,
ADD COLUMN IF NOT EXISTS country_name VARCHAR null,
ADD COLUMN IF NOT EXISTS store_code_name VARCHAR null;

--changeset abijithsarath.menon@impactanalytics.co:article_inventory_dashboard_add_mandatory_columns stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_article_inventory_dashboard_add_mandatory_columns
--comment: article_inventory_dashboard_add_mandatory_columns
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS lw_discount_amount float4 null;

--changeset sreevathsa.sp@impactanalytics.co:article_inventory_dashboard_add_channel_name stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_store_level_add_channel_name
--comment: article_inventory_dashboard_add_channel_name
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS channel_name text null;


--changeset bhaskar.reddy@impactanalytics.co:article_inventory_dashboard_add_few_columns stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_article_inventory_dashboard_add_few_columns
--comment: article_inventory_dashboard_add_mandatory_columns
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS L4W_sales float4 null,
ADD COLUMN IF NOT EXISTS L8W_sales float4 null;

--changeset abijithsarath.menon@impactanalytics.co:article_inventory_dashboard_add_twos stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_article_inventory_dashboard_add_mandatory_columns
--comment: article_inventory_dashboard_add_mandatory_columns
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS twos int4 null;

-- changeset imran.khan@impactanalytics.co:article_inventory_dashboard_update_product_tag_overstock stripComments:false splitStatements:false context:db_sync labels:update_product_tag_excess_to_overstock
-- comment: Update product_tag generated column to use 'overstock' instead of 'excess'
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS product_tag;

ALTER TABLE inventory_smart.article_inventory_dashboard ADD product_tag varchar GENERATED ALWAYS AS (
CASE
    WHEN stockout IS NOT NULL AND stockout <> 0::double precision THEN 'stockout'::text
    WHEN shortfall IS NOT NULL AND shortfall <> 0::double precision THEN 'shortfall'::text
    WHEN overstock IS NOT NULL AND overstock <> 0::double precision THEN 'overstock'::text
    WHEN normal IS NOT NULL AND normal <> 0::double precision THEN 'normal'::text
    ELSE NULL::text
END) STORED NULL;