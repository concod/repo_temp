--liquibase formatted sql
--changeset disha.a@impactanalytics.co:sync_pp_attributes_from_fc_mapping runOnChange:true stripComments:false splitStatements:false context:MTP-133859 labels:MTP-133859
--comment: MTP-133859 Trigger to sync product_profile_attributes_list from filter_configurations_mapping and rebuild product_profile_attributes_filter
--rollback: SELECT 1

-- =============================================================================
-- MTP-133859: Auto-sync product profile attributes from 'Create Product Profile'
--            filter configuration (fc_code=167)
--
-- Overview:
--   When columns are added, renamed, deleted, or their dimension changes in
--   global.filter_configurations_mapping for the 'Create Product Profile' filter,
--   this trigger automatically:
--     1. Syncs inventory_smart.product_profile_attributes_list
--     2. Rebuilds inventory_smart.product_profile_attributes_filter
-- =============================================================================
-- -----------------------------------------------------------------------------
-- Helper Function: fn_rebuild_pp_attributes_filter
-- Drops and recreates product_profile_attributes_filter with dynamic columns
-- based on current product_profile_attributes_list, then populates it
-- using crosstab from product_profile_attributes JSONB data.
-- Equivalent to: CALL inventory_smart.build_product_profile_attributes_filter(0)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS inventory_smart.fn_rebuild_pp_attributes_filter();
CREATE OR REPLACE FUNCTION inventory_smart.fn_rebuild_pp_attributes_filter()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $fn$
DECLARE
    _pcols text;  -- product column defs for CREATE TABLE, e.g. "l0_name text[],l1_name text[]"
    _scols text;  -- store column defs for CREATE TABLE
    _plist text;  -- product column name list for INSERT/SELECT, e.g. "l0_name,l1_name"
    _slist text;  -- store column name list for INSERT/SELECT
    _ctes text[]; -- array of CTE definitions (product_cte, store_cte)
    _from text;   -- FROM clause: join strategy based on available hierarchies
    _q text;      -- final dynamic INSERT query
BEGIN
    -- Build column definitions and column lists from product_profile_attributes_list
    SELECT string_agg(attribute_name, ' text[],'), string_agg(attribute_name, ',')
    INTO _pcols, _plist
    FROM inventory_smart.product_profile_attributes_list WHERE hierarchy_level = 'product';

    SELECT string_agg(attribute_name, ' text[],'), string_agg(attribute_name, ',')
    INTO _scols, _slist
    FROM inventory_smart.product_profile_attributes_list WHERE hierarchy_level = 'store';

    IF _pcols IS NULL AND _scols IS NULL THEN
        RAISE WARNING 'fn_rebuild_pp_attributes_filter: no columns found, skipping';
        RETURN;
    END IF;

    -- Clear any cached responses that depend on product_profile_attributes_filter
    DELETE FROM "cache".request_tracker WHERE req_code IN (
        SELECT req_code FROM cache.request_dependencies WHERE dep_name LIKE '%product_profile_attributes_filter%'
    );

    -- Drop and recreate table with dynamic columns matching current attributes
    DROP TABLE IF EXISTS inventory_smart.product_profile_attributes_filter;
    EXECUTE format('CREATE TABLE inventory_smart.product_profile_attributes_filter (pp_code int4 PRIMARY KEY, %s)',
        concat_ws(', ',
            CASE WHEN _pcols IS NOT NULL THEN _pcols || ' text[]' END,
            CASE WHEN _scols IS NOT NULL THEN _scols || ' text[]' END
        )
    );

    -- Each CTE extracts hierarchy filter values from product_profile_attributes
    IF _pcols IS NOT NULL THEN
        _ctes := array_append(_ctes, format(
            'product_cte AS (SELECT * FROM crosstab(
                ''SELECT pp_code,key,array_agg(value) FROM (
                    SELECT key,pp_code,TRIM(BOTH ''''"'''' FROM jsonb_array_elements(jsonb_array_elements(value)::jsonb->''''values'''')::text) AS value
                    FROM inventory_smart.product_profile_attributes CROSS JOIN LATERAL jsonb_each(attribute_value::jsonb)
                    WHERE attribute_name=''''product_hierarchy_filters'''' GROUP BY 1,2,3) y
                GROUP BY 1,2 ORDER BY 1,2'',
                ''SELECT unnest(array_agg(attribute_name))::text FROM inventory_smart.product_profile_attributes_list WHERE hierarchy_level=''''product''''''
            ) AS ct(pp_code int,%s text[]))', _pcols));
    END IF;

    IF _scols IS NOT NULL THEN
        _ctes := array_append(_ctes, format(
            'store_cte AS (SELECT * FROM crosstab(
                ''SELECT pp_code,key,array_agg(value) FROM (
                    SELECT key,pp_code,TRIM(BOTH ''''"'''' FROM jsonb_array_elements(jsonb_array_elements(value)::jsonb->''''values'''')::text) AS value
                    FROM inventory_smart.product_profile_attributes CROSS JOIN LATERAL jsonb_each(attribute_value::jsonb)
                    WHERE attribute_name=''''store_hierarchy_filters'''' GROUP BY 1,2,3) y
                GROUP BY 1,2 ORDER BY 1,2'',
                ''SELECT unnest(array_agg(attribute_name))::text FROM inventory_smart.product_profile_attributes_list WHERE hierarchy_level=''''store''''''
            ) AS ct("pp_code" int,%s text[]))', _scols));
    END IF;

    -- Determine join strategy based on which hierarchies have columns
    IF _pcols IS NOT NULL AND _scols IS NOT NULL THEN
        _from := 'product_cte FULL JOIN store_cte USING(pp_code)';
    ELSIF _pcols IS NOT NULL THEN _from := 'product_cte';
    ELSE _from := 'store_cte';
    END IF;

    -- Assemble and execute the final INSERT query
    _q := format('WITH %s INSERT INTO inventory_smart.product_profile_attributes_filter(pp_code,%s) SELECT pp_code,%s FROM %s',
        array_to_string(_ctes, ','), concat_ws(',', _plist, _slist), concat_ws(',', _plist, _slist), _from);

    RAISE NOTICE '%', _q;
    EXECUTE _q;
END;
$fn$;


-- -----------------------------------------------------------------------------
-- Trigger Function: sync_pp_attributes_from_fc_mapping
-- Detects changes in 'Create Product Profile' filter columns, syncs them
-- to product_profile_attributes_list, and triggers a full rebuild of
-- product_profile_attributes_filter. Skips if no actual change detected.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS inventory_smart.sync_pp_attributes_from_fc_mapping() CASCADE;
CREATE OR REPLACE FUNCTION inventory_smart.sync_pp_attributes_from_fc_mapping()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _fc_code_target int;    
    _current_attrs text[];  
    _new_attrs text[];      
BEGIN
    -- Resolve fc_code dynamically by filter name 
    SELECT fc_code INTO _fc_code_target
    FROM global.filter_configurations
    WHERE name = 'Create Product Profile' AND COALESCE(is_deleted, false) = false
    LIMIT 1;

    IF _fc_code_target IS NULL THEN
        RAISE NOTICE 'sync_pp_attributes_from_fc_mapping: Create Product Profile filter not found, skipping';
        RETURN NULL;
    END IF;

    -- Compare current attributes with new fc_mapping columns 
    SELECT array_agg(column_name ORDER BY column_name) INTO _new_attrs
    FROM global.filter_configurations_mapping
    WHERE fc_code = _fc_code_target AND COALESCE(is_deleted, false) = false;

    SELECT array_agg(attribute_name ORDER BY attribute_name) INTO _current_attrs
    FROM inventory_smart.product_profile_attributes_list;

    -- Skip if no actual change in attribute names 
    IF _current_attrs IS NOT DISTINCT FROM _new_attrs THEN
        RAISE NOTICE 'sync_pp_attributes_from_fc_mapping: no change detected, skipping';
        RETURN NULL;
    END IF;

    -- Sync: replace all rows in product_profile_attributes_list with current fc_mapping data
    TRUNCATE TABLE inventory_smart.product_profile_attributes_list;
    INSERT INTO inventory_smart.product_profile_attributes_list (
        attribute_name, is_hierarchy, is_attribute, is_main_col, hierarchy_level, datatype
    )
    SELECT column_name, true, true, false, dimension, 'str'
    FROM global.filter_configurations_mapping
    WHERE fc_code = _fc_code_target AND COALESCE(is_deleted, false) = false;

    -- Rebuild filter table 
    PERFORM inventory_smart.fn_rebuild_pp_attributes_filter();

    RAISE NOTICE 'sync_pp_attributes_from_fc_mapping: sync and rebuild complete';
    RETURN NULL;
END;
$function$;

-- Clean up old trigger definitions from previous versions
DROP TRIGGER IF EXISTS sync_pp_attributes_from_fc_mapping_trigger ON global.filter_configurations_mapping;
DROP TRIGGER IF EXISTS sync_pp_attributes_from_fc_mapping_ins_upd ON global.filter_configurations_mapping;

-- Trigger: fires when a new row is inserted for 'Create Product Profile'
CREATE OR REPLACE TRIGGER sync_pp_attributes_from_fc_mapping_ins
    AFTER INSERT ON global.filter_configurations_mapping
    FOR EACH ROW
    WHEN (NEW.fc_code = 167)
    EXECUTE FUNCTION inventory_smart.sync_pp_attributes_from_fc_mapping();

-- Trigger: fires when column_name, dimension, or is_deleted changes for 'Create Product Profile'
CREATE OR REPLACE TRIGGER sync_pp_attributes_from_fc_mapping_upd
    AFTER UPDATE ON global.filter_configurations_mapping
    FOR EACH ROW
    WHEN (NEW.fc_code = 167 AND (
        OLD.column_name IS DISTINCT FROM NEW.column_name OR
        OLD.dimension IS DISTINCT FROM NEW.dimension OR
        OLD.is_deleted IS DISTINCT FROM NEW.is_deleted
    ))
    EXECUTE FUNCTION inventory_smart.sync_pp_attributes_from_fc_mapping();

-- Trigger: fires when a row is deleted from 'Create Product Profile'
CREATE OR REPLACE TRIGGER sync_pp_attributes_from_fc_mapping_del
    AFTER DELETE ON global.filter_configurations_mapping
    FOR EACH ROW
    WHEN (OLD.fc_code = 167)
    EXECUTE FUNCTION inventory_smart.sync_pp_attributes_from_fc_mapping();
