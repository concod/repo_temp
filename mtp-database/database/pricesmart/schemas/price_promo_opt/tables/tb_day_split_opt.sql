--liquibase formatted sql
    --changeset vaibhav:day_split_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for day_split_opt

    CREATE TABLE price_promo_opt.tb_day_split_opt (
        l3_cid INTEGER NOT NULL,
        brand_cid INTEGER NOT NULL,
        date DATE NOT NULL,
        week_start_date DATE NOT NULL,
        bnm_day_split_ratio FLOAT,
        ecom_day_split_ratio FLOAT
    ) PARTITION BY RANGE (week_start_date);

    CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_opt ON
    price_promo_opt.tb_day_split_opt
    USING BTREE (l3_cid, brand_cid, week_start_date);