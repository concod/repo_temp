
-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:mv_hierarchy_size_ranges_updates stripComments:false runOnChange:true splitStatements:false context:mv_hierarchy_size_ranges_updated labels:mv_hierarchy_size_ranges_updated 
-- comment: update changeset for mv_hierarchy_size_ranges 


-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS size_smart.mv_hierarchy_size_ranges;

-- Create essential indexes only, removing redundant ones
-- Add a more focused index for our filtering condition
CREATE INDEX IF NOT EXISTS idx_hierarachy_mst_level_l9 ON size_smart.tb_hierarachy_mst(level, l9_name);
-- Index for faster joins in the query
CREATE INDEX IF NOT EXISTS idx_hierarachy_paths ON size_smart.tb_hierarachy_mst(l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name, l9_name) WHERE level = 10;
-- Index for size_config join operations
CREATE INDEX IF NOT EXISTS idx_size_config_size_master_id ON size_smart.tb_size_config(size_master_id);
CREATE INDEX IF NOT EXISTS idx_size_config_size_id ON size_smart.tb_size_config(size_id);

-- Create stage table to pre-compute array mappings (this significantly reduces runtime)
DROP TABLE IF EXISTS size_smart.stg_hierarchy_size_mapping;
CREATE TABLE size_smart.stg_hierarchy_size_mapping AS
WITH 
-- Step 1: Create a temporary table with hierarchy paths and sizes
tmp_hierarchy_sizes AS (
    SELECT
        h.l0_name, h.l1_name, h.l2_name, h.l3_name, h.l4_name, 
        h.l5_name, h.l6_name, h.l7_name, h.l8_name,
        s.name AS size_name
    FROM 
        size_smart.tb_hierarachy_mst h
    JOIN 
        size_smart.tb_size s ON s.name = h.l9_name
    WHERE 
        h.level = 10
),
-- Step 2: Group hierarchy paths to get distinct hierarchies
hierarchy_paths AS (
    SELECT DISTINCT
        l0_name, l1_name, l2_name, l3_name, l4_name, 
        l5_name, l6_name, l7_name, l8_name
    FROM 
        tmp_hierarchy_sizes
)
-- Step 3: Create hierarchy-to-size mappings
SELECT
    h.l0_name, h.l1_name, h.l2_name, h.l3_name, h.l4_name, 
    h.l5_name, h.l6_name, h.l7_name, h.l8_name,
    array_agg(DISTINCT ths.size_name ORDER BY ths.size_name) AS hierarchy_sizes
FROM 
    hierarchy_paths h
JOIN
    tmp_hierarchy_sizes ths ON 
        h.l0_name = ths.l0_name AND
        h.l1_name = ths.l1_name AND
        h.l2_name = ths.l2_name AND
        h.l3_name = ths.l3_name AND
        h.l4_name = ths.l4_name AND
        h.l5_name = ths.l5_name AND
        h.l6_name = ths.l6_name AND
        h.l7_name = ths.l7_name AND
        h.l8_name = ths.l8_name
GROUP BY
    h.l0_name, h.l1_name, h.l2_name, h.l3_name, h.l4_name, 
    h.l5_name, h.l6_name, h.l7_name, h.l8_name;

-- Create indexes on stage table for faster joins
CREATE INDEX idx_stg_hierarchy_size_mapping_path ON size_smart.stg_hierarchy_size_mapping(l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name);
-- Consider adding a GIN index for the array if needed
CREATE INDEX idx_stg_hierarchy_size_mapping_sizes ON size_smart.stg_hierarchy_size_mapping USING gin(hierarchy_sizes);

-- Pre-compute size range lists to reduce runtime
DROP TABLE IF EXISTS size_smart.stg_size_range_lists;
CREATE TABLE size_smart.stg_size_range_lists AS
-- Step 4: Get sizes for each size range (small table)
WITH size_range_sizes AS (
    SELECT 
        scm.id AS size_range_id,
        s.name AS size_name
    FROM 
        size_smart.tb_size_config_mst scm
    JOIN 
        size_smart.tb_size_config sc ON sc.size_master_id = scm.id
    JOIN 
        size_smart.tb_size s ON s.id = sc.size_id
)
-- Step 5: Group size ranges to get arrays of sizes for each range
SELECT
    size_range_id,
    array_agg(DISTINCT size_name ORDER BY size_name) AS range_sizes
FROM
    size_range_sizes
GROUP BY
    size_range_id;

-- Create index on size range lists table
CREATE INDEX idx_stg_size_range_lists_id ON size_smart.stg_size_range_lists(size_range_id);
-- Add GIN index for array operations
CREATE INDEX idx_stg_size_range_lists_sizes ON size_smart.stg_size_range_lists USING gin(range_sizes);

-- Create materialized view with a surrogate key for better performance
CREATE MATERIALIZED VIEW size_smart.mv_hierarchy_size_ranges AS
WITH 
-- Step 6: Match hierarchies to size ranges (using pre-computed tables)
matching_ranges AS (
    SELECT
        h.l0_name, h.l1_name, h.l2_name, h.l3_name, h.l4_name, 
        h.l5_name, h.l6_name, h.l7_name, h.l8_name,
        sr.size_range_id
    FROM 
        size_smart.stg_size_range_lists sr
    JOIN
        size_smart.stg_hierarchy_size_mapping h ON 
            -- Exact match condition with arrays
            sr.range_sizes @> h.hierarchy_sizes AND 
            sr.range_sizes <@ h.hierarchy_sizes
)
-- Final step: Create the result set with surrogate keys
SELECT
    ROW_NUMBER() OVER() AS id,
    hp.l0_name, hp.l1_name, hp.l2_name, hp.l3_name, hp.l4_name, 
    hp.l5_name, hp.l6_name, hp.l7_name, hp.l8_name,
    (SELECT mr.size_range_id
     FROM matching_ranges mr
     WHERE mr.l0_name = hp.l0_name
     AND mr.l1_name = hp.l1_name
     AND mr.l2_name = hp.l2_name
     AND mr.l3_name = hp.l3_name
     AND mr.l4_name = hp.l4_name
     AND mr.l5_name = hp.l5_name
     AND mr.l6_name = hp.l6_name
     AND mr.l7_name = hp.l7_name
     AND mr.l8_name = hp.l8_name
     LIMIT 1) AS size_range_id
FROM 
    (SELECT DISTINCT l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name 
     FROM size_smart.stg_hierarchy_size_mapping) hp
WHERE EXISTS (
    SELECT 1
    FROM matching_ranges mr
    WHERE mr.l0_name = hp.l0_name
    AND mr.l1_name = hp.l1_name
    AND mr.l2_name = hp.l2_name
    AND mr.l3_name = hp.l3_name
    AND mr.l4_name = hp.l4_name
    AND mr.l5_name = hp.l5_name
    AND mr.l6_name = hp.l6_name
    AND mr.l7_name = hp.l7_name
    AND mr.l8_name = hp.l8_name)
WITH DATA;

-- Create only essential indexes for the materialized view
CREATE UNIQUE INDEX idx_mv_hierarchy_size_ranges_id ON size_smart.mv_hierarchy_size_ranges(id);
-- This compound index will support common query patterns 
CREATE INDEX idx_mv_hierarchy_size_ranges_l0_l1_l2_l3_l4 
ON size_smart.mv_hierarchy_size_ranges(l0_name, l1_name, l2_name, l3_name, l4_name); 
-- Keep this index for queries filtering by size_range_id
CREATE INDEX idx_mv_hierarchy_size_ranges_size_range_id ON size_smart.mv_hierarchy_size_ranges(size_range_id);

COMMENT ON MATERIALIZED VIEW size_smart.mv_hierarchy_size_ranges IS 
'Maps product hierarchies (l0-l8) to their corresponding size range configurations. Uses -1 as size_range_id when not all sizes in the hierarchy exactly match a size range.';

