--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:sync_rcl_defalt_rules runOnChange:true stripComments:false splitStatements:false context:sync_rcl_defalt_rules labels:project start
--comment: created procedure sync_rcl_defalt_rules
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_rcl_defalt_rules();
CREATE OR REPLACE PROCEDURE public.sync_rcl_defalt_rules()
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    v_levels TEXT;
    v_level_array VARCHAR[];
    v_jsonb_pairs TEXT;
    v_query TEXT;
    v_row RECORD;
    v_psa_codes TEXT[];
    v_row_jsonb JSONB;
    v_key TEXT;
    v_psa_query TEXT;
    v_value TEXT;
    v_key_count INT := 0;
    v_user_exists BOOLEAN;
    v_config_exists BOOLEAN;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_defalt_rules';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Validation 1: Check if admin user exists
    SELECT EXISTS(
        SELECT 1 
        FROM global.user_master 
        WHERE email = 'admin@impactanalytics.co'
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'Admin user with email ''admin@impactanalytics.co'' not found in global.user_master table';
    END IF;
    
    -- Validation 2: Check if psaf_config_level exists in tenant attributes
    SELECT EXISTS(
        SELECT 1 
        FROM global.tenant_attribute_master 
        WHERE name = 'psaf_config_level'
    ) INTO v_config_exists;
    
    IF NOT v_config_exists THEN
        RAISE EXCEPTION 'Configuration ''psaf_config_level'' not found in global.tenant_attribute_master table';
    END IF;
    
    RAISE NOTICE 'Validation passed. Starting RCL default rules sync...';
    
    -- Get configured levels from tenant attributes
    SELECT (attribute_value::json ->> 'value')
    INTO v_levels
    FROM global.tenant_attribute_master
    WHERE name = 'psaf_config_level';
    
    -- Convert comma-separated levels to array
    v_level_array := ARRAY(
        SELECT trim(unnest(string_to_array(v_levels, ',')))
    );
    
    -- Build JSONB pairs for dynamic query
    SELECT string_agg(
        format('''%s'', %I', col, col),
        ', '
    )
    INTO v_jsonb_pairs
    FROM unnest(v_level_array) AS col;
    
    -- Create temp table for level combinations
    v_query := format(
        'CREATE TEMP TABLE temp_level_combinations ON COMMIT DROP AS
         SELECT DISTINCT jsonb_build_object(%s) AS hierarchy_selections
         FROM global.product_attributes_filter
         WHERE active = true 
           AND (is_deleted IS NULL OR is_deleted = false)',
        v_jsonb_pairs
    );
    
    EXECUTE v_query;
    
    -- Create temp table for PSA codes
    CREATE TEMP TABLE temp_psa_codes (
        combination JSONB,
        psa_code TEXT
    )ON COMMIT DROP;
    
    -- Get distinct combinations as JSONB
    v_query := format(
        'SELECT DISTINCT row_to_json(sub)::jsonb AS combo 
         FROM (
             SELECT %s 
             FROM global.product_attributes_filter 
             WHERE active = true 
               AND (is_deleted IS NULL OR is_deleted = false)
         ) sub', 
        v_levels
    );

    -- Loop through each combination and collect PSA codes
    FOR v_row IN EXECUTE v_query LOOP
        v_row_jsonb := v_row.combo;
        RAISE NOTICE '--- Processing combination: %', v_row_jsonb;
        
        -- Build dynamic query for PSA codes
        v_psa_query := 'SELECT ARRAY_AGG(DISTINCT psa_code) 
                        FROM global.product_store_attributes_filter 
                        WHERE (store_hierarchy_level = ''{}'' 
                           OR ''All'' = ANY(store_hierarchy_level))';
        
        v_key_count := 0;
        
        -- Add condition for each key in the JSONB
        FOR v_key IN SELECT jsonb_object_keys(v_row_jsonb) LOOP
            v_key_count := v_key_count + 1;
            v_value := v_row_jsonb->>v_key;
            
            -- Handle NULL values properly
            IF v_value IS NULL OR v_value = 'null' THEN
                v_psa_query := v_psa_query || format(' AND %I IS NULL', v_key);
            ELSE
                v_psa_query := v_psa_query || format(' AND %I = %L', v_key, v_value);
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Query: %', v_psa_query;
        
        IF v_key_count > 0 THEN
            EXECUTE v_psa_query INTO v_psa_codes;
            RAISE NOTICE 'Found % psa_codes', COALESCE(array_length(v_psa_codes, 1), 0);
            
            -- Insert into temp table (unnest array to individual rows)
            IF v_psa_codes IS NOT NULL THEN
                INSERT INTO temp_psa_codes (combination, psa_code)
                SELECT v_row_jsonb, unnest(v_psa_codes);
            END IF;
        END IF;
    END LOOP;

    -- Insert into RCL master
    INSERT INTO global.rcl_master (
        module_code,
        level,
        hierarchy_selections,
        validity,
        priority,
        is_deleted,
        created_by,
        created_at,
        is_default
    )  
    WITH tenent_data AS (
        SELECT (attribute_value::json ->> 'value') AS level
        FROM global.tenant_attribute_master tam
        WHERE name = 'psaf_config_level'
    ),
    priority AS (
        SELECT 
            td.*,
            pm.module_code,
            pm.rcl_priority AS priority
        FROM tenent_data td
        JOIN global.rcl_priority_mapping pm 
            ON pm.level = ARRAY[td.level]::varchar[]
    ),
    final_data AS (
        SELECT 
            p.*, 
            um.user_code AS created_by
        FROM priority p 
        CROSS JOIN (
            SELECT user_code 
            FROM global.user_master 
            WHERE email = 'admin@impactanalytics.co'
        ) um
    )
    SELECT
        module_code,
        string_to_array(level, ',')::varchar[] AS level,
        '{}'::jsonb AS hierarchy_selections,
        datemultirange(daterange(now()::date, '2050-12-31'::date, '[)')) AS validity,
        priority,
        false AS is_deleted,
        created_by,
        now() AS created_at,
        true AS is_default
    FROM final_data 
    ON CONFLICT DO NOTHING;

    -- Insert into RCL constraint master rule
    INSERT INTO inventory_smart.rcl_constraint_master_rule (
        rcl_code,
        rcl_dimension,
        store_hierarchy_level,
        rule_name
    )
    WITH rcl_codes AS (
        SELECT rcl_code 
        FROM global.rcl_master 
        WHERE is_default = true 
          AND module_code = 170
    )
    SELECT 
        rcl_code,
        hierarchy_selections AS rcl_dimension,
        'All' AS store_hierarchy_level,
        'Default' AS rule_name
    FROM rcl_codes 
    CROSS JOIN temp_level_combinations 
    ON CONFLICT DO NOTHING;

    -- Insert into RCL constraint master
    INSERT INTO inventory_smart.rcl_constraint_master (
        rcl_code,
        rule_code,
        psa_code,
        validity,
        created_at
    )
    SELECT 
        rcmr.rcl_code,
        rcmr.rule_code,
        tpc.psa_code,
        datemultirange(daterange(now()::date, '2050-12-31'::date, '[)')) AS validity,
        now() AS created_at
    FROM inventory_smart.rcl_constraint_master_rule rcmr
    JOIN temp_psa_codes tpc 
        ON rcmr.rcl_dimension = tpc.combination
    WHERE rcmr.store_hierarchy_level = 'All' 
      AND rcmr.rule_name = 'Default' 
    ON CONFLICT DO NOTHING;


insert into inventory_smart.rcl_dc_store_policy_rule(
rcl_code,
rcl_dimension,
rule_name
)
    WITH rcl_codes AS (
        SELECT rcl_code 
        FROM global.rcl_master 
        WHERE is_default = true 
          AND module_code = 10003
    )
    SELECT 
        rcl_code,
        hierarchy_selections AS rcl_dimension,
        'Default' AS rule_name
    FROM rcl_codes 
    CROSS JOIN temp_level_combinations 
    ON CONFLICT DO NOTHING;

insert into inventory_smart.rcl_dc_store_policy(
rcl_code,
rule_code,
validity,
created_at
)
    SELECT 
        rcmr.rcl_code,
        rcmr.rule_code,
        datemultirange(daterange(now()::date, '2050-12-31'::date, '[)')) AS validity,
        now() AS created_at
    FROM inventory_smart.rcl_dc_store_policy_rule rcmr
      where rcmr.rule_name = 'Default' 
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'RCL default rules sync completed successfully';

    DROP TABLE IF EXISTS temp_psa_codes;
    DROP TABLE IF EXISTS temp_level_combinations;


 
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;