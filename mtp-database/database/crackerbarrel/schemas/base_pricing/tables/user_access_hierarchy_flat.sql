--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:user_access_hierarchy_flat_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Flat table for user access hierarchy with ID and name columns

CREATE TABLE IF NOT EXISTS base_pricing.user_access_hierarchy_flat (
    user_code INT NOT NULL,
    acl_code INT NOT NULL,
    store_hierarchy_id TEXT,
    product_hierarchy_id TEXT,
    store_hierarchy_name TEXT NOT NULL,
    product_hierarchy_name TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

--changeset vishnu.vardhan@impactanalytics.co:user_access_hierarchy_flat_indexes_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Indexes for user access hierarchy flat table

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_uahf_user
ON base_pricing.user_access_hierarchy_flat (user_code);

-- Index for user + store hierarchy queries
CREATE INDEX IF NOT EXISTS idx_uahf_user_store
ON base_pricing.user_access_hierarchy_flat (user_code, store_hierarchy_id);

-- Index for user + product hierarchy queries
CREATE INDEX IF NOT EXISTS idx_uahf_user_product
ON base_pricing.user_access_hierarchy_flat (user_code, product_hierarchy_id);
