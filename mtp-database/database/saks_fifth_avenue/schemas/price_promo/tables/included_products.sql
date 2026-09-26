--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:included_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for included_products


CREATE TABLE price_promo.included_products (
    promo_id int4 NOT NULL,
    product_id int8 NOT NULL,
    product_name varchar NOT NULL,
    CONSTRAINT included_product_pkey PRIMARY KEY (promo_id, product_id)
)
PARTITION BY LIST (promo_id);

-- Create indexes
CREATE INDEX idx_included_products_combined 
    ON price_promo.included_products USING btree (promo_id, product_id);


--changeset sidharth.harish@impactanalytics.co:included_products_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: removed constraint
ALTER TABLE price_promo.included_products DROP CONSTRAINT included_product_pkey;
ALTER TABLE price_promo.included_products ALTER COLUMN product_name DROP NOT NULL;