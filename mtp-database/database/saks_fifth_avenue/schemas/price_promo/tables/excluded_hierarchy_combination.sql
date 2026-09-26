--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:excluded_hierarchy_combination stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for excluded_hierarchy_combination


CREATE TABLE price_promo.excluded_hierarchy_combination (
    promo_id int4 NOT NULL,
    hierarchy_level_id int4 NULL,
    hierarchy_cid int8 NULL,
    hierarchy_cuq text NULL,
    combination_identifier int4 NULL,
    hierarchy_id text NULL
);

-- Create indexes
CREATE INDEX excluded_hierarchy_combination_combination_identifier_idx
    ON price_promo.excluded_hierarchy_combination USING btree (combination_identifier);
CREATE INDEX excluded_hierarchy_combination_combined_with_identifier_idx
    ON price_promo.excluded_hierarchy_combination USING btree (promo_id, hierarchy_level_id, combination_identifier);


