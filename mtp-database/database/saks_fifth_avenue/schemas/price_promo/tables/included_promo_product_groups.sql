--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:included_promo_product_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for included_promo_product_groups


CREATE TABLE price_promo.included_promo_product_groups (
    promo_id int4 NOT NULL,
    product_group_id int4 NOT NULL,
    product_group_name varchar(100) NOT NULL,
    CONSTRAINT included_promo_product_groups_pkey PRIMARY KEY (promo_id, product_group_id)
);

-- Create indexes
CREATE INDEX idx_included_promo_promo_id 
    ON price_promo.included_promo_product_groups USING btree (promo_id);
CREATE INDEX idx_included_promo_product_group_id 
    ON price_promo.included_promo_product_groups USING btree (product_group_id);
CREATE INDEX idx_included_promo_combined 
    ON price_promo.included_promo_product_groups USING btree (promo_id, product_group_id);


--changeset sidharth.harish@impactanalytics.co:included_promo_product_groups_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:  alter product_group_name column type to text
ALTER TABLE price_promo.included_promo_product_groups ALTER COLUMN product_group_name TYPE text USING product_group_name::text;
