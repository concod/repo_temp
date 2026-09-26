--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:included_product_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for included_product_hierarchy


CREATE TABLE price_promo.included_product_hierarchy (
    promo_id int4 NOT NULL,
    hierarchy_level_id int8 NOT NULL,
    hierarchy_level_name varchar(100) NULL,
    hierarchy_value_id int8 NOT NULL,
    hierarchy_value_name varchar(100) NULL,
    CONSTRAINT included_product_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id)
);

-- Create indexes
CREATE INDEX idx_included_product_hierarchy_promo_id 
    ON price_promo.included_product_hierarchy USING btree (promo_id);
CREATE INDEX idx_included_product_hierarchy 
    ON price_promo.included_product_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);



--changeset sidharth.harish@impactanalytics.co:included_product_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: varchar to text
ALTER TABLE price_promo.included_product_hierarchy ALTER COLUMN hierarchy_value_name TYPE text USING hierarchy_value_name::text;
