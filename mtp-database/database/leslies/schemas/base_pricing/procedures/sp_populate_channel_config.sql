--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_populate_channel_config_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_populate_channel_config

DROP PROCEDURE IF EXISTS base_pricing.sp_populate_channel_config;

CREATE OR REPLACE PROCEDURE base_pricing.sp_populate_channel_config()
LANGUAGE plpgsql
AS $$
DECLARE
    v_hierarchy_level INTEGER;
    v_hierarchy_id_col VARCHAR(50);
    v_hierarchy_cid_col VARCHAR(50);
    v_hierarchy_name_col VARCHAR(50);
    v_sql TEXT;
    v_record_count INTEGER;
BEGIN
    -- Get the hierarchy level for 'channel' from bp_store_hierarchy_level
    SELECT store_hierarchy_level_id 
    INTO v_hierarchy_level
    FROM base_pricing.bp_store_hierarchy_level 
    WHERE store_hierarchy_level_label = 'channel';
    
    -- Check if hierarchy level was found
    IF v_hierarchy_level IS NULL THEN
        RAISE EXCEPTION 'Hierarchy level for ''channel'' not found in bp_store_hierarchy_level table';
    END IF;
    
    RAISE NOTICE 'Found hierarchy level % for channel', v_hierarchy_level;
    
    -- Construct column names based on hierarchy level
    v_hierarchy_id_col := 's' || v_hierarchy_level || '_id';
    v_hierarchy_cid_col := 's' || v_hierarchy_level || '_cid';
    v_hierarchy_name_col := 's' || v_hierarchy_level || '_name';
    
    -- Validate that the columns exist in bp_store_master
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'base_pricing' 
        AND table_name = 'bp_store_master' 
        AND column_name = v_hierarchy_id_col
    ) THEN
        RAISE EXCEPTION 'Hierarchy level % does not exist in bp_store_master', v_hierarchy_level;
    END IF;
    
    -- First, delete existing records for this hierarchy level
    TRUNCATE TABLE base_pricing.bp_channel_config;
    
    -- Insert unique channel records
    v_sql := '
        INSERT INTO base_pricing.bp_channel_config 
            (hierarchy_level, channel_id, channel_cid, channel_name, is_store_editable)
        SELECT DISTINCT
            $1 as hierarchy_level,
            ' || quote_ident(v_hierarchy_id_col) || ' as channel_id,
            ' || quote_ident(v_hierarchy_cid_col) || ' as channel_cid,
            ' || quote_ident(v_hierarchy_name_col) || ' as channel_name,
            false as is_store_editable
        FROM base_pricing.bp_store_master
        WHERE ' || quote_ident(v_hierarchy_id_col) || ' IS NOT NULL
          AND ' || quote_ident(v_hierarchy_cid_col) || ' IS NOT NULL
          AND ' || quote_ident(v_hierarchy_name_col) || ' IS NOT NULL
          AND active = true';
    
    -- Execute the dynamic SQL
    EXECUTE v_sql 
    USING 
        's' || v_hierarchy_level,
        v_hierarchy_level;
    
    -- Get the number of records inserted/updated
    GET DIAGNOSTICS v_record_count = ROW_COUNT;
    
    RAISE NOTICE 'Successfully processed % unique records for hierarchy level s%', v_record_count, v_hierarchy_level;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in sp_populate_channel_config: %', SQLERRM;
END;
$$;