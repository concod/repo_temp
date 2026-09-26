--liquibase formatted sql
--changeset keerthi.vardhani@impactanalytics.co:alerts_product_level stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:figs_alerts_product_level
--comment: initial changeset for alerts_product_level


CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_level (
    article text NOT NULL,
    l0_name text NULL,
    l1_name text NULL,
    l2_name text NULL,
    l3_name text NULL,
    l4_name text NULL,
    "style" text NULL,
    product_description text NULL,
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
    wos_oh float4 NULL,
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
    lw_aur float4 NULL,
    clearance_alert_flag int4 NULL,
    newly_launched_alert_flag int4 NULL,
    retirement_alert_flag int4 NULL,
    in_stock_percentage float4 NULL,
    first_sale_date date NULL,
    last_receipt_date date NULL,
    launch_date date NULL,
    lw_price float4 NULL,
    lw_aps float4 NULL,
    sell_through_rate float4 NULL,
    wos_oh_it float4 NULL,
    forecast_this_wk float4 NULL,
    forecast_next_week float4 NULL,
    forecast_4_next_week float4 NULL,
    forecast_8_next_week float4 NULL,
    no_of_stores_oh int4 NULL,
     shrtfl_is_resolved int4 NULL,
  excs_is_resolved int4 NULL,
   newly_launched_is_resolved int4 NULL,
   stckout_is_resolved int4 null,
    CONSTRAINT alerts_product_level_pk PRIMARY KEY (article)
);

--changeset keerthi.vardhani@impactanalytics.co:alerts_product_level_2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:figs_alerts_product_level
--comment: drop old forecast columns
ALTER TABLE inventory_smart.alerts_product_level 
DROP COLUMN IF EXISTS forecast_next_week,
DROP COLUMN IF EXISTS forecast_4_next_week,
DROP COLUMN IF EXISTS forecast_8_next_week;

--changeset keerthi.vardhani@impactanalytics.co:alerts_product_level_3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:figs_alerts_product_level
--comment: recreate forecast columns
ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN IF NOT EXISTS forecast_next_week float4 NULL,
ADD COLUMN IF NOT EXISTS forecast_4_next_week float4 NULL,
ADD COLUMN IF NOT EXISTS forecast_8_next_week float4 NULL;
