--liquibase formatted sql
--changeset keerthi.vardhani@impactanalytics.co:article_inventory_dashboard_v1 stripComments:false splitStatements:false context:Release_1_0 labels:figs_article_inventory_dashboard
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
    dc_available float4 NULL,
    dc_oo float4 NULL,
    dc_oo_30_days float4 NULL,
    in_stock_percentage float4 NULL,
    first_sale_date date NULL,
    last_receipt_date date NULL,
    lw_store_units float4 NULL,
    lw_sfs_units float4 NULL,
    lw_price float4 NULL,
    lw_aur float4 NULL,
    lw_aps float4 NULL,
    fwos float4 NULL,
    wos_oh_it float4 NULL,
    hybrid_wos float4 NULL,
    hybrid_wos_oh_it float4 NULL,
     upas float4 NULL,
     forecast_this_wk float4 NULL,
     forecast_next_wk float4 NULL,
     forecast_4_next_wk float4 NULL,
     forecast_8_next_wk float4 NULL,
     mfp_forecast_4_next_wk float4 NULL,
     next_4wks_promo_pct float4 NULL,
     past_4wks_actual_sales float4 NULL,
     forecast_deviation_pct float4 NULL,
     past_4wks_store_count float4 NULL,
     next_4wks_store_count float4 NULL,
     store_count_deviation_pct float4 NULL,
     past_4wks_promo_pct float4 NULL,
     promo_deviation_pct float4 NULL,
     ly_past_4wks_actual_sales float4 NULL,
     ly_next_4wks_actual_sales float4 NULL,
     ly_deviation_pct float4 NULL,
     no_of_stores_oh float4 NULL,
     wos_oh int4 null,
     style_name varchar NULL,
     color_name varchar NULL,
     l0_name varchar NULL,
     l1_name varchar NULL,
    l2_name varchar NULL,
    l3_name varchar NULL,
   store_name varchar NULL,
   lw_discount_amount float4 null,
   lw_discount_percentage float4 null,
    channel_name text null,
    twos int4 null,
    CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code),
    CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX if not exists article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);
CREATE INDEX if not exists article_inventory_dashboard_store_code_idx ON inventory_smart.article_inventory_dashboard USING btree (store_code);

--changeset keerthi.vardhani@impactanalytics.co:article_inventory_dashboard_figs1 stripComments:false splitStatements:false context:Release_1_0 labels:figs_article_inventory_dashboard
--comment: initial changeset for article_inventory_dashboard

ALTER TABLE inventory_smart.article_inventory_dashboard 
    ADD COLUMN IF NOT EXISTS  l4_name varchar null,
    ADD COLUMN IF NOT EXISTS last_allocated_date date NULL,
    ADD COLUMN IF NOT EXISTS  article_status_tag varchar null;

--changeset keerthi.vardhani@impactanalytics.co:article_inventory_dashboard_figs2 stripComments:false splitStatements:false context:Release_1_0 labels:figs_article_inventory_dashboard
--comment: initial changeset for article_inventory_dashboard

ALTER TABLE inventory_smart.article_inventory_dashboard 
    ADD COLUMN IF NOT EXISTS  in_stock float4 null;

--changeset keerthi.vardhani@impactanalytics.co:article_inventory_dashboard_figs3 stripComments:false splitStatements:false context:Release_1_0 labels:figs_article_inventory_dashboard
--comment: initial changeset for article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard 
    ADD COLUMN IF NOT EXISTS  last_week_sales float4 null,
    ADD COLUMN IF NOT EXISTS  last_week_revenue float4 null,
    ADD COLUMN IF NOT EXISTS  l4w_units float4 null,
    ADD COLUMN IF NOT EXISTS  wip float4 null;


--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_add_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of col changeset for alerts channel level
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS color_id varchar null,
ADD COLUMN IF NOT EXISTS replenish_status varchar null,
ADD COLUMN IF NOT EXISTS style_type varchar null,
ADD COLUMN IF NOT EXISTS f_style_fabric varchar null,
DROP COLUMN IF EXISTS color_name;



--changeset abhishek.sagar@impactanalytics.co:alerts_ps_lvl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of col changeset for aid
ALTER TABLE inventory_smart.alerts_product_store_level
ADD COLUMN IF NOT EXISTS color_name varchar null;


--changeset abhishek.sagar@impactanalytics.co:alerts_ps_lvl_ stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of col changeset for aid v1
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS color_name varchar null;