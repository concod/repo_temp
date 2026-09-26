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
--changeset laraib_6.ahmad:article_forecast_alerts_demand_zero stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: added the missing deviation
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero ADD COLUMN IF NOT EXISTS deviation float8 NULL;

--changeset pradeep.kumar:article_forecast_alerts_demand_zero stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_forecast_alerts_demand_zero

ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero ADD COLUMN l0_name text NULL;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero ADD COLUMN l1_name text NULL;

ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero DROP COLUMN IF EXISTS l4_name;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero DROP COLUMN IF EXISTS l5_name;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero DROP COLUMN IF EXISTS primary_trait_desc;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero DROP COLUMN IF EXISTS zerodemand_is_resolved;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero DROP COLUMN IF EXISTS store_level_inacc_fcst_is_resolved;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero DROP COLUMN IF EXISTS article_level_inacc_fcst_is_resolved;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero DROP COLUMN IF EXISTS product_description;
ALTER TABLE inventory_smart.article_forecast_alerts_demand_zero DROP COLUMN IF EXISTS deviation;