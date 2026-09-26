--liquibase formatted sql
--changeset liquibase:article_forecast_alerts_demand_zero stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_forecast_alerts_demand_zero


CREATE TABLE IF NOT EXISTS inventory_smart.article_forecast_alerts_demand_zero (
    article TEXT,
    store_code TEXT,
    past_4_week_actuals FLOAT,
    next_4_week_forecast FLOAT,
    oh FLOAT,
    oo FLOAT,
    it FLOAT,
    launch_date DATE,
    l2_name TEXT,
    l3_name TEXT,
    l4_name TEXT,
    l5_name TEXT,
    primary_trait_desc TEXT,
    product_type TEXT,
    item_status TEXT,
    store_name TEXT,
    channel TEXT,
    region TEXT,
    state TEXT,
    district TEXT,
    store_attribute_1 TEXT,
    article_next_4_week_forecast FLOAT,
    article_past_4_week_actuals FLOAT,
    zero_fcst_flag INTEGER,
    store_level_inacc_fcst_flag INTEGER,
    article_level_inacc_fcst_flag INTEGER,
	zerodemand_is_resolved int4 DEFAULT 0 NULL,
    CONSTRAINT article_forecast_alerts_demand_zero_unique UNIQUE (article,store_code)
);


--changeset himanshu.jangra:updated article_forecast_alerts_demand_zero stripComments:false splitStatements:false context:Release_1_0 labels:cols_add
--comment: added oh_oo_it article_forecast_alerts_demand_zero

ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero ADD COLUMN IF NOT EXISTS oh_oo_it int;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero ADD COLUMN IF NOT EXISTS store_level_inacc_fcst_is_resolved int4 DEFAULT 0 NULL;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero ADD COLUMN IF NOT EXISTS article_level_inacc_fcst_is_resolved int4 DEFAULT 0 NULL;

--changeset himanshu_jangra:added product_description article_forecast_alerts_demand_zero stripComments:false splitStatements:false context:Release_1_0 labels:cols_add
--comment: added product_description article_forecast_alerts_demand_zero
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero ADD COLUMN IF NOT EXISTS product_description TEXT;

--changeset kaustubh.gupta:added_uda_value stripComments:false splitStatements:false context:Release_1_0 labels:added_uda_value
--comment: added_uda_value
alter table inventory_smart.article_forecast_alerts_demand_zero 
add column uda_value_desc _varchar;

