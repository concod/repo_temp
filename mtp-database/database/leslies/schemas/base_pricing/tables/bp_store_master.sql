--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_master_11 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_master_10

-- DDL:
CREATE TABLE IF NOT EXISTS
base_pricing.bp_store_master (
    -- Hierarchy Level s0–s5
    s0_id varchar(15) NULL,
    s0_name varchar(100) NULL,
    s0_cid int4 NULL,

    s1_id varchar(15) NULL,
    s1_name varchar(100) NULL,
    s1_cid int4 NULL,

    s2_id varchar(15) NULL,
    s2_name varchar(100) NULL,
    s2_cid int4 NULL,

    s3_id varchar(15) NULL,
    s3_name varchar(100) NULL,
    s3_cid int4 NULL,

    s4_id varchar(15) NULL,
    s4_name varchar(100) NULL,
    s4_cid int4 NULL,

    s5_id varchar(15) NULL,
    s5_name varchar(100) NULL,
    s5_cid int4 NULL,

    -- Store details
    store_code varchar(15) NULL,
    store_name varchar(100) NULL,
    zone_nm varchar(100) NULL,
    state varchar(100) NULL,
    city varchar(100) NULL,
    type varchar(50) NULL,
    store_open_flag varchar(10) NULL,
    active bool NULL,
    latitude float8 NULL,
    longitude float8 NULL,
    open_date timestamp NULL,
    close_date timestamp NULL,
    is_active int2 NULL,
    store_id int4 NOT NULL,
    market_name varchar(100) NULL,
    currency_id int4 NULL,
    market_id int4 NULL,

    CONSTRAINT bp_store_master_pkey PRIMARY KEY (store_id)
);


--changeset vishnu.vardhan@impactanalytics.co:bp_store_master_uam_hierarchy_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Add UAM hierarchy columns to store master

ALTER TABLE base_pricing.bp_store_master
ADD COLUMN IF NOT EXISTS uam_heirarchy_id TEXT DEFAULT NULL;

ALTER TABLE base_pricing.bp_store_master
ADD COLUMN IF NOT EXISTS uam_heirarchy_name TEXT DEFAULT NULL;


--changeset vishnu.vardhan@impactanalytics.co:bp_store_master_uam_hierarchy_indexes_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Create indexes on UAM hierarchy columns for better query performance

CREATE INDEX IF NOT EXISTS idx_store_uam_hierarchy_id
ON base_pricing.bp_store_master (uam_heirarchy_id);

CREATE INDEX IF NOT EXISTS idx_store_uam_hierarchy_name
ON base_pricing.bp_store_master (uam_heirarchy_name);


--changeset vishnu.vardhan@impactanalytics.co:bp_store_master_rls_policies_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Enable RLS and create policies for store master table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS store_access_policy ON base_pricing.bp_store_master;
DROP POLICY IF EXISTS store_access_update_policy ON base_pricing.bp_store_master;
DROP POLICY IF EXISTS store_access_delete_policy ON base_pricing.bp_store_master;
DROP POLICY IF EXISTS store_access_insert_policy ON base_pricing.bp_store_master;

-- Create SELECT policy with hierarchy-based access control
CREATE POLICY store_access_policy
ON base_pricing.bp_store_master
FOR SELECT
USING (
    /* Case 0: user not set → allow all rows */
    NULLIF(current_setting('app.current_user_code', true), '') IS NULL

    OR

    /* Case 1: user has no store hierarchy restriction */
    NOT EXISTS (
        SELECT 1
        FROM base_pricing.user_access_hierarchy_flat uahf
        WHERE uahf.user_code =
              NULLIF(current_setting('app.current_user_code', true), '')::int
          AND uahf.store_hierarchy_id IS NOT NULL
    )

    OR

    /* Case 2: store explicitly allowed */
    EXISTS (
        SELECT 1
        FROM base_pricing.user_access_hierarchy_flat uahf
        WHERE uahf.user_code =
              NULLIF(current_setting('app.current_user_code', true), '')::int
          AND uahf.store_hierarchy_id = bp_store_master.uam_heirarchy_id
    )
);

-- Create UPDATE policy (allow all for now)
CREATE POLICY store_access_update_policy
ON base_pricing.bp_store_master
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create DELETE policy (allow all for now)
CREATE POLICY store_access_delete_policy
ON base_pricing.bp_store_master
FOR DELETE
USING (true);

-- Create INSERT policy (allow all for now)
CREATE POLICY store_access_insert_policy
ON base_pricing.bp_store_master
FOR INSERT
WITH CHECK (true);

-- Enable RLS on store master table
ALTER TABLE base_pricing.bp_store_master
ENABLE ROW LEVEL SECURITY;

-- Force RLS for all operations (including superusers)
ALTER TABLE base_pricing.bp_store_master
FORCE ROW LEVEL SECURITY;
