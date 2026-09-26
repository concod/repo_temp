--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:excluded_product_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for excluded_product_groups

CREATE TABLE price_promo.excluded_product_groups (
    promo_id int4 NOT NULL,
    pg_id int4 NOT NULL,
    pg_name text NULL
);

-- Create indexes
CREATE INDEX excluded_product_group_combined_idx
    ON price_promo.excluded_product_groups USING btree (promo_id, pg_id);

