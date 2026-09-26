--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_reporting_post_hierarchy_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_hierarchy_date


CREATE TABLE price_promo.ps_reporting_post_hierarchy_date (
    promo_id _int4 NOT NULL,
    product_id int8 NOT NULL,
    s0_id int8 NOT NULL,
    s0_name varchar NULL,
    s1_id int8 NOT NULL,
    s1_name varchar NULL,
    "date" date NOT NULL,
    fw int2 NOT NULL,
    fy int2 NOT NULL,
    week_start_date date NOT NULL,
    actual_sales_units float8 DEFAULT 0 NULL,
    finalized_sales_units float8 DEFAULT 0 NULL,
    baseline_sales_units float8 DEFAULT 0 NULL,
    actual_revenue float8 DEFAULT 0 NULL,
    finalized_revenue float8 DEFAULT 0 NULL,
    baseline_revenue float8 DEFAULT 0 NULL,
    actual_margin float8 DEFAULT 0 NULL,
    finalized_margin float8 DEFAULT 0 NULL,
    baseline_margin float8 DEFAULT 0 NULL,
    lw_revenue float8 DEFAULT 0 NULL,
    lw_sales_units float8 DEFAULT 0 NULL,
    lw_margin float8 DEFAULT 0 NULL,
    ly_sales_units float8 DEFAULT 0 NULL,
    ly_revenue float8 DEFAULT 0 NULL,
    ly_margin float8 DEFAULT 0 NULL,
    actual_discount float8 DEFAULT 0 NULL,
    finalized_discount float8 DEFAULT 0 NULL,
    actual_inventory float8 DEFAULT 0 NULL,
    CONSTRAINT product_rep_pkey PRIMARY KEY (product_id, s0_id, s1_id, date)
)
PARTITION BY RANGE ("date");

-- Create indexes
CREATE INDEX ps_rep_promo_id_idx 
    ON price_promo.ps_reporting_post_hierarchy_date USING btree (promo_id);
CREATE INDEX ps_rep_promo_product_id_idx 
    ON price_promo.ps_reporting_post_hierarchy_date USING btree (promo_id, product_id);

--changeset abhishek.singh@impactanalytics.co:ps_reporting_post_hierarchy_date_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_hierarchy_date


ALTER TABLE  price_promo.ps_reporting_post_hierarchy_date
ADD COLUMN actual_contribution_revenue float8 NULL,
ADD COLUMN finalized_contribution_revenue float8 NULL,
ADD COLUMN actual_contribution_margin float8 NULL,
ADD COLUMN finalized_contribution_margin float8 NULL,
ADD COLUMN lw_contribution_revenue float8 NULL,
ADD COLUMN lw_contribution_margin float8 NULL,
ADD COLUMN ly_contribution_revenue float8 NULL,
ADD COLUMN ly_contribution_margin float8 NULL;