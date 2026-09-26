-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:rebuild_size_config_tables_03 runOnChange:true stripComments:false splitStatements:false context:rebuild_size_config_tables_03 labels:rebuild_size_config_tables_03
-- comment: function to rebuild size config master and size config tables 03

-- PostgreSQL function to rebuild size configuration tables
-- This function rebuilds tb_size_config_mst and tb_size_config tables
-- based on data from tb_source and tb_source_size tables
--
-- Usage: SELECT size_smart.rebuild_size_config_tables();
-- Returns: TEXT (success/error message)
--
-- The function performs the following operations:
-- 1. Truncates and rebuilds tb_size_config_mst from source data with hash generation
-- 2. Truncates and rebuilds tb_size_config based on the new master data
--
-- Note: This function will delete all existing data in both tables
-- Use with caution in production environments

DROP FUNCTION IF EXISTS size_smart.rebuild_size_config_tables();

CREATE OR REPLACE FUNCTION size_smart.rebuild_size_config_tables()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    mst_record_count INTEGER := 0;
    config_record_count INTEGER := 0;
    result_message TEXT;
BEGIN
    -- Step 1: Rebuild tb_size_config_mst table
    RAISE NOTICE 'Starting rebuild of tb_size_config_mst table...';
    
    -- Truncate and reset identity for size config master table
    -- TRUNCATE TABLE size_smart.tb_size_config_mst RESTART IDENTITY CASCADE;
    
    -- Insert data into tb_size_config_mst
    INSERT INTO size_smart.tb_size_config_mst (
        name,
        hash,
        created_at,
        updated_at
    )
    SELECT 
        a.name,
        string_agg(b.size_id::text, '' ORDER BY b.order) as hash,
        now() as created_at,
        now() as updated_at
    FROM size_smart.tb_source a
    JOIN size_smart.tb_source_size b ON a.id = b.source_id
    GROUP BY a.name, a.label;
    
    GET DIAGNOSTICS mst_record_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % records into tb_size_config_mst', mst_record_count;
    
    -- Step 2: Rebuild tb_size_config table
    RAISE NOTICE 'Starting rebuild of tb_size_config table...';
    
    -- Truncate and reset identity for size config table
    -- TRUNCATE TABLE size_smart.tb_size_config RESTART IDENTITY CASCADE;
    
    -- Insert data into tb_size_config
    INSERT INTO size_smart.tb_size_config (
        size_master_id,
        source_id,
        size_id,
        "order",
        created_at,
        updated_at
    )
    SELECT DISTINCT 
        c.id as size_master_id,
        b.source_id,
        b.size_id,
        b.order,
        now() as created_at,
        now() as updated_at
    FROM size_smart.tb_size_config_mst c
    JOIN (
        SELECT 
            a.name,
            a.id,
            string_agg(b.size_id::text, '' ORDER BY b.order) as hash
        FROM size_smart.tb_source a
        JOIN size_smart.tb_source_size b ON a.id = b.source_id
        GROUP BY a.name, a.label, a.id
    ) s ON c.name = s.name AND c.hash = s.hash
    JOIN size_smart.tb_source_size b ON s.id = b.source_id
    ORDER BY c.id, b.order;
    
    GET DIAGNOSTICS config_record_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % records into tb_size_config', config_record_count;
    
    -- Prepare success message
    result_message := format(
        'Size config tables rebuilt successfully. tb_size_config_mst: %s records, tb_size_config: %s records',
        mst_record_count,
        config_record_count
    );
    
    RAISE NOTICE '%', result_message;
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback will happen automatically due to transaction failure
        result_message := format('Error rebuilding size config tables: %s', SQLERRM);
        RAISE EXCEPTION '%', result_message;
        RETURN result_message;
END;
$$;

-- Grant execute permission to the application role (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION size_smart.rebuild_size_config_tables() TO your_app_role;

