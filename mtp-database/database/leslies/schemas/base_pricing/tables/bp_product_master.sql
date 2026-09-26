--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_master_12 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_master_10


CREATE TABLE IF NOT EXISTS
base_pricing.bp_product_master (
    product_id int4 NOT NULL,
    product_name varchar(255) NULL,
    product_image text NULL,
    active bool NULL,
    -- Hierarchy Level l0
    l0_id varchar(15) NULL,
    l0_name varchar(100) NULL,
    l0_cuq varchar(255) NULL,
    l0_cid int4 NULL,
    -- Hierarchy Level l1
    l1_id varchar(15) NULL,
    l1_name varchar(100) NULL,
    l1_cuq varchar(255) NULL,
    l1_cid int4 NULL,
    -- Hierarchy Level l2
    l2_id varchar(15) NULL,
    l2_name varchar(100) NULL,
    l2_cuq varchar(255) NULL,
    l2_cid int4 NULL,
    -- Hierarchy Level l3
    l3_id varchar(15) NULL,
    l3_name varchar(100) NULL,
    l3_cuq varchar(255) NULL,
    l3_cid int4 NULL,
    -- Hierarchy Level l4
    l4_id varchar(15) NULL,
    l4_name varchar(100) NULL,
    l4_cuq varchar(255) NULL,
    l4_cid int4 NULL,
    -- Hierarchy Level l5
    l5_id varchar(15) NULL,
    l5_name varchar(100) NULL,
    l5_cuq varchar(255) NULL,
    l5_cid int4 NULL,
    zone_structure_id int4 NULL,
    CONSTRAINT bp_product_master_pkey PRIMARY KEY (product_id)
);

CREATE INDEX idx_product_id ON base_pricing.bp_product_master (product_id);

--changeset abhishek.singh@impactanalytics.co:bp_product_master_new_01 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_master_new_01

ALTER TABLE base_pricing.bp_product_master 
ADD COLUMN IF NOT EXISTS usable BOOLEAN DEFAULT TRUE;

--changeset vishnu.vardhan@impactanalytics.co:bp_product_master_uam_hierarchy_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Add UAM hierarchy columns to product master

ALTER TABLE base_pricing.bp_product_master
ADD COLUMN IF NOT EXISTS uam_heirarchy_id TEXT DEFAULT NULL;

ALTER TABLE base_pricing.bp_product_master
ADD COLUMN IF NOT EXISTS uam_heirarchy_name TEXT DEFAULT NULL;

--changeset vishnu.vardhan@impactanalytics.co:bp_product_master_uam_hierarchy_indexes_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Create indexes on UAM hierarchy columns for better query performance

CREATE INDEX IF NOT EXISTS idx_product_uam_hierarchy_id
ON base_pricing.bp_product_master (uam_heirarchy_id);

CREATE INDEX IF NOT EXISTS idx_product_uam_hierarchy_name
ON base_pricing.bp_product_master (uam_heirarchy_name);

--changeset vishnu.vardhan@impactanalytics.co:bp_product_master_rls_policies_01 stripComments:false splitStatements:false context:Release_1_0 labels:uam_hierarchy_security
--comment: Enable RLS and create policies for product master table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS product_access_policy ON base_pricing.bp_product_master;
DROP POLICY IF EXISTS product_access_update_policy ON base_pricing.bp_product_master;
DROP POLICY IF EXISTS product_access_delete_policy ON base_pricing.bp_product_master;
DROP POLICY IF EXISTS product_access_insert_policy ON base_pricing.bp_product_master;

-- Create SELECT policy with hierarchy-based access control
CREATE POLICY product_access_policy
ON base_pricing.bp_product_master
FOR SELECT
USING (
    /* Case 0: user not set → allow all rows */
    NULLIF(current_setting('app.current_user_code', true), '') IS NULL

    OR

    /* Case 1: user has no product hierarchy restriction */
    NOT EXISTS (
        SELECT 1
        FROM base_pricing.user_access_hierarchy_flat uahf
        WHERE uahf.user_code =
              NULLIF(current_setting('app.current_user_code', true), '')::int
    )

    OR

    /* Case 2: product explicitly allowed */
    EXISTS (
        SELECT 1
        FROM base_pricing.user_access_hierarchy_flat uahf
        WHERE uahf.user_code =
              NULLIF(current_setting('app.current_user_code', true), '')::int
          AND uahf.product_hierarchy_id =
              bp_product_master.uam_heirarchy_id
    )
);

-- Create UPDATE policy (allow all for now)
CREATE POLICY product_access_update_policy
ON base_pricing.bp_product_master
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create DELETE policy (allow all for now)
CREATE POLICY product_access_delete_policy
ON base_pricing.bp_product_master
FOR DELETE
USING (true);

-- Create INSERT policy (allow all for now)
CREATE POLICY product_access_insert_policy
ON base_pricing.bp_product_master
FOR INSERT
WITH CHECK (true);

-- Enable RLS on product master table
ALTER TABLE base_pricing.bp_product_master
ENABLE ROW LEVEL SECURITY;

-- Force RLS for all operations (including superusers)
ALTER TABLE base_pricing.bp_product_master
FORCE ROW LEVEL SECURITY;


--changeset yashraj.jha@impactanalytics.co:bp_product_master_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_master_10
ALTER TABLE base_pricing.bp_product_master
ADD COLUMN IF NOT EXISTS product_code varchar(100) NULL;

--changeset yashraj.jha@impactanalytics.co:bp_product_master_13 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_master_13
ALTER TABLE base_pricing.bp_product_master
ALTER COLUMN product_code SET NOT NULL;