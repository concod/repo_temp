--liquibase formatted sql
--changeset rahul.mishra@impactanalytics.co:store_product_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start : ticket-id : MTP-76641
--comment: initial changeset for store_product_mapping_list : added materialzied view for store_metrics to improve query performance : ticket-id : MTP-76641
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.store_product_mapping_list(refcursor, jsonb, jsonb, jsonb, boolean);

CREATE OR REPLACE FUNCTION global.store_product_mapping_list(
    input refcursor,
    jsonb, -- $2: store_master filters (unused in logic below)
    jsonb, -- $3: store_attributes filters
    jsonb, -- $4: meta (search/sort)
    boolean -- $5: isCount
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_sa_whs text := '';
    _query_sa_non_whs text := '';
    _query_combine text := '';
    _query_table_filters text := '';
    _final_query text := '';
    _projection_cols text[] := array['store_name', 'store_description'];
    _key text;
    _whs_filters jsonb := '{}'::jsonb;
    _retail_region_values text := '';
    _retail_region_array text := '';
    _channel_values text := '';
    _channel_array text := '';
    _channel_not_in_values text := '';
    _channel_not_in_array text := '';
    _channel_condition text := '';
BEGIN
    -- Ensure projection fields are present in filters
    FOREACH _key IN ARRAY _projection_cols LOOP
        IF NOT $3 ? _key THEN
            $3 := $3 || jsonb_build_object(_key, '[]');
        END IF;
    END LOOP;

    -- Extract retail_region filter for WHS stores
    -- The filter structure: "retail_region": [{"type": "list", "operator": "in", "values": ["GCSEA"]}]
    IF $3 ? 'retail_region' THEN
        SELECT COALESCE(string_agg('"' || region_value || '"', ','), '') INTO _retail_region_values
        FROM jsonb_array_elements_text($3->'retail_region'->0->'values') AS region_value;
        
        IF _retail_region_values IS NOT NULL AND _retail_region_values != '' THEN
            _retail_region_array := '{' || _retail_region_values || '}';
        ELSE
            _retail_region_array := '{}';
        END IF;
    ELSE
        _retail_region_array := '{}';
    END IF;

    -- Extract channel filter dynamically
    -- Handle both positive (operator: "in") and negative (operator: "not in") channel filters
    IF $3 ? 'channel' THEN
        -- Extract positive channel filters (operator: "in")
        SELECT COALESCE(string_agg('"' || channel_value || '"', ','), '') INTO _channel_values
        FROM jsonb_array_elements($3->'channel') AS channel_filter,
             jsonb_array_elements_text(channel_filter->'values') AS channel_value
        WHERE channel_filter->>'operator' = 'in';
        
        -- Extract negative channel filters (operator: "not in") 
        SELECT COALESCE(string_agg('"' || channel_value || '"', ','), '') INTO _channel_not_in_values
        FROM jsonb_array_elements($3->'channel') AS channel_filter,
             jsonb_array_elements_text(channel_filter->'values') AS channel_value
        WHERE channel_filter->>'operator' = 'not in';
        
        -- Build channel arrays
        IF _channel_values IS NOT NULL AND _channel_values != '' THEN
            _channel_array := '{' || _channel_values || '}';
        ELSE
            _channel_array := '{}';
        END IF;
        
        IF _channel_not_in_values IS NOT NULL AND _channel_not_in_values != '' THEN
            _channel_not_in_array := '{' || _channel_not_in_values || '}';
        ELSE
            _channel_not_in_array := '{}';
        END IF;
    ELSE
        _channel_array := '{}';
        _channel_not_in_array := '{}';
    END IF;

    -- Build channel condition dynamically
    _channel_condition := '';
    IF _channel_array != '{}' THEN
        _channel_condition := _channel_condition || 'channel::varchar = any(''' || _channel_array || '''::varchar[])';
    END IF;
    
    IF _channel_not_in_array != '{}' THEN
        IF _channel_condition != '' THEN
            _channel_condition := _channel_condition || ' AND ';
        END IF;
        _channel_condition := _channel_condition || 'NOT(channel::varchar = any(''' || _channel_not_in_array || '''::varchar[]))';
    END IF;
    
    -- If no channel filters provided, default to existing logic (exclude certain channels)
    IF _channel_condition = '' THEN
        _channel_condition := 'NOT(channel::varchar = any(''{RLE,RLW,CME,CMS,CMW,CMFS,CMCS,ECOM_DONT_USE,RLC}''::varchar[]))';
    END IF;

    -- Create WHS filters (only required projection cols)
    _whs_filters := '{}'::jsonb;
    FOREACH _key IN ARRAY _projection_cols LOOP
        IF NOT _whs_filters ? _key THEN
            _whs_filters := _whs_filters || jsonb_build_object(_key, '[]');
        END IF;
    END LOOP;

    -- Build WHS and non-WHS subqueries
    _query_sa_whs := '
        SELECT active, channel, dc_flag, store_name, currency_cd, retail_region, 
               store_description, retail_facility_code, store_code 
        FROM global.store_attributes_filter 
        WHERE (' || CASE WHEN _retail_region_array != '{}' THEN 'retail_region::varchar = any(''' || _retail_region_array || '''::varchar[])' ELSE '1=1' END || ')
          AND special_classification = ''WHS''
          AND (' || _channel_condition || ')
    ';

    _query_sa_non_whs := '
        SELECT active, channel, dc_flag, store_name, currency_cd, retail_region, 
               store_description, retail_facility_code, store_code 
        FROM global.store_attributes_filter 
        WHERE (active::bool = any(''{true}''::bool[]) AND
               (' || _channel_condition || ') AND
               NOT(dc_flag::bool = any(''{true}''::bool[])) AND
               (' || CASE WHEN _retail_region_array != '{}' THEN 'retail_region::varchar = any(''' || _retail_region_array || '''::varchar[])' ELSE '1=1' END || ') AND
               COALESCE(special_classification, '''') != ''WHS'')
    ';

    -- Combine WHS + non-WHS using UNION
    _query_combine := '
        SELECT * FROM (
            (' || _query_sa_whs || ')
            UNION
            (' || _query_sa_non_whs || ')
        ) X
    ';

    -- Apply sort/limit only when $5 = false
    IF NOT $5 THEN
        _query_table_filters := global.form_table_query($4);
        _final_query := _query_combine || _query_table_filters;
    ELSE
        _final_query := 'SELECT COUNT(*) FROM (' || _query_combine || ') temp';
    END IF;

    RAISE NOTICE 'final query %', _final_query;
    OPEN input FOR EXECUTE _final_query;
    RETURN _final_query;
END
$function$;
