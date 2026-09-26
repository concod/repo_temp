--liquibase formatted sql
--changeset liquibase:product_supersession_get_mapped_products runOnChange:true stripComments:false splitStatements:false context:MTP-130838 labels:MTP-130838
--comment: MTP-130838 Generic product supersession mapping function with configurable parameters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_mapped_products(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_mapped_products(
    ref refcursor,
    filters jsonb,
    meta jsonb,
    config jsonb
)
RETURNS refcursor
LANGUAGE plpgsql
AS $$
DECLARE
    -- Configuration variables
    use_crosstab boolean;
    use_separate_old_new_filters boolean;
    include_user_master_join boolean;
    join_on_article boolean;
    created_by_join_type text;
    hierarchy_levels text[];
    crosstab_attributes text[];
    additional_old_columns text[];
    additional_new_columns text[];
    sku_type_filter text[];
    enable_query_logging boolean;
    
    -- Config loading variables
    v_tenant_config jsonb;
    v_default_config jsonb;
    v_merged_config jsonb;
    
    -- Query building variables
    old_filter jsonb;
    new_filter jsonb;
    old_pa_sql text;
    new_pa_sql text;
    meta_cls text;
    final_query text;
    
    -- Crosstab specific variables
    crosstab_select_list text;
    crosstab_column_list text;
    crosstab_attributes_quoted text;
    
    -- Helper variables
    old_hierarchy_cols text;
    new_hierarchy_cols text;
    old_additional_cols text;
    new_additional_cols text;
    old_group_by text;
    new_group_by text;
    sku_filter_sql text;
    
    -- Loop variables
    hierarchy_level text;
    col text;
    attr text;
    i int;
BEGIN
    -- Define default configuration
    v_default_config := '{
        "join_on_article": false,
        "created_by_join_type": "old",
        "hierarchy_levels": ["l1", "l2", "l3", "l4"],
        "crosstab_attributes": [],
        "additional_old_columns": [],
        "additional_new_columns": [],
        "sku_type_filter": [],
        "enable_query_logging": true
    }'::jsonb;
    
    -- Load client-specific config from tenant_workflow_config
    SELECT tenant_workflow_config.config INTO v_tenant_config
    FROM inventory_smart.tenant_workflow_config
    WHERE identifier = 'product_supersession'
      AND attribute_key = 'product_supersession_config'
    LIMIT 1;
    
    -- Merge configs: default <- tenant_config <- passed config parameter
    -- This allows: default values, then tenant overrides, then runtime overrides
    v_merged_config := v_default_config;
    
    IF v_tenant_config IS NOT NULL THEN
        v_merged_config := v_merged_config || v_tenant_config;
        RAISE NOTICE 'Loaded product_supersession config from tenant_workflow_config';
    ELSE
        RAISE NOTICE 'No tenant-specific config found, using default config';
    END IF;
    
    -- If config parameter is provided and not empty, merge it as final override
    IF config IS NOT NULL AND config <> '{}'::jsonb THEN
        v_merged_config := v_merged_config || config;
        RAISE NOTICE 'Applied runtime config overrides';
    END IF;
    
    -- Now use v_merged_config instead of config for all subsequent operations
    -- Load configuration from merged JSONB
    join_on_article := COALESCE((v_merged_config->>'join_on_article')::boolean, false);
    created_by_join_type := COALESCE(v_merged_config->>'created_by_join_type', 'old');
    enable_query_logging := COALESCE((v_merged_config->>'enable_query_logging')::boolean, true);
    
    -- Load array configurations from merged config
    hierarchy_levels := COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_merged_config->'hierarchy_levels')),
        ARRAY['l1', 'l2', 'l3', 'l4', 'l5']
    );
    
    crosstab_attributes := COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_merged_config->'crosstab_attributes')),
        ARRAY[]::text[]
    );
    
    additional_old_columns := COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_merged_config->'additional_old_columns')),
        ARRAY[]::text[]
    );
    
    additional_new_columns := COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_merged_config->'additional_new_columns')),
        ARRAY[]::text[]
    );
    
    sku_type_filter := COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_merged_config->'sku_type_filter')),
        ARRAY[]::text[]
    );
    
    -- Auto-detect use_crosstab: if crosstab_attributes array has values, use crosstab pattern
    use_crosstab := (array_length(crosstab_attributes, 1) > 0);
    
    -- Auto-detect include_user_master_join: if created_by_join_type is specified, include the join
    include_user_master_join := (created_by_join_type IS NOT NULL AND created_by_join_type != '');
    
    -- Extract filters
    old_filter := filters->0;
    new_filter := filters->1;
    
    -- If only one filter is provided, use it for both old and new
    IF new_filter IS NULL OR new_filter = '{}'::jsonb THEN
        new_filter := old_filter;
    END IF;
    
    -- Build meta filter query
    meta_cls := '';
    IF meta <> '{}' THEN
        meta_cls := global.form_table_query(meta);
    END IF;
    
    -- Build old product filter using form_main_table_filters
    old_pa_sql := '';
    IF old_filter IS NOT NULL AND old_filter <> '{}' THEN
        old_pa_sql := inventory_smart.form_main_table_filters('ph_master', old_filter);
        -- Replace 'paf' alias with 'old_paf' for crosstab pattern ONLY
        -- For simple join pattern, keep paf alias as-is since it's used inside subqueries
        IF use_crosstab THEN
            IF old_pa_sql IS NOT NULL AND old_pa_sql <> '' THEN
                old_pa_sql := REPLACE(old_pa_sql, 'paf.', 'old_paf.');
            END IF;
            -- Add old_paf alias to bare column names to avoid ambiguity
            old_pa_sql := REGEXP_REPLACE(old_pa_sql, '\(([a-z0-9_]+)::', '(old_paf.\1::', 'g');
        END IF;
    END IF;
    
    -- Build new product filter using form_main_table_filters
    new_pa_sql := '';
    IF new_filter IS NOT NULL AND new_filter <> '{}' THEN
        new_pa_sql := inventory_smart.form_main_table_filters('ph_master', new_filter);
        -- Replace 'paf' alias with 'new_paf' for crosstab pattern ONLY
        -- For simple join pattern, keep paf alias as-is since it's used inside subqueries
        IF use_crosstab THEN
            IF new_pa_sql IS NOT NULL AND new_pa_sql <> '' THEN
                new_pa_sql := REPLACE(new_pa_sql, 'paf.', 'new_paf.');
            END IF;
            -- Add new_paf alias to bare column names to avoid ambiguity
            new_pa_sql := REGEXP_REPLACE(new_pa_sql, '\(([a-z0-9_]+)::', '(new_paf.\1::', 'g');
        END IF;
    END IF;
    
    -- Auto-detect use_separate_old_new_filters based on whether filters are different
    use_separate_old_new_filters := TRUE;
    
    -- Build SKU type filter if specified and append to product filters
    IF array_length(sku_type_filter, 1) > 0 THEN
        sku_filter_sql := ' AND paf.sku_type IN (''' || array_to_string(sku_type_filter, ''',''') || ''')';
        
        -- Append SKU filter to old_pa_sql
        IF old_pa_sql IS NOT NULL AND old_pa_sql <> '' THEN
            old_pa_sql := old_pa_sql || sku_filter_sql;
        ELSE
            old_pa_sql := ' WHERE paf.sku_type IN (''' || array_to_string(sku_type_filter, ''',''') || ''')';
        END IF;
        
        -- Append SKU filter to new_pa_sql
        IF new_pa_sql IS NOT NULL AND new_pa_sql <> '' THEN
            new_pa_sql := new_pa_sql || sku_filter_sql;
        ELSE
            new_pa_sql := ' WHERE paf.sku_type IN (''' || array_to_string(sku_type_filter, ''',''') || ''')';
        END IF;
    END IF;
    
    -- Set sku_filter_sql to empty since it's now incorporated into old_pa_sql and new_pa_sql
    sku_filter_sql := '';
    
    -- Build hierarchy column selects for old and new
    old_hierarchy_cols := '';
    new_hierarchy_cols := '';
    i := 1;
    FOREACH hierarchy_level IN ARRAY hierarchy_levels
    LOOP
        old_hierarchy_cols := old_hierarchy_cols || format('paf.%I as %I, ', hierarchy_level || '_name', 'old_' || hierarchy_level || '_name');
        new_hierarchy_cols := new_hierarchy_cols || format('paf.%I as %I, ', hierarchy_level || '_name', 'new_' || hierarchy_level || '_name');
        i := i + 1;
    END LOOP;
    
    -- Build additional column selects
    old_additional_cols := '';
    IF array_length(additional_old_columns, 1) > 0 THEN
        FOREACH col IN ARRAY additional_old_columns
        LOOP
            old_additional_cols := old_additional_cols || format('paf.%I as old_%I, ', col, col);
        END LOOP;
    END IF;
    
    new_additional_cols := '';
    IF array_length(additional_new_columns, 1) > 0 THEN
        FOREACH col IN ARRAY additional_new_columns
        LOOP
            new_additional_cols := new_additional_cols || format('paf.%I as new_%I, ', col, col);
        END LOOP;
    END IF;
    
    -- Build GROUP BY clauses
    -- Group by all hierarchy levels + article + additional columns
    -- Start with positions for hierarchy levels
    old_group_by := '';
    FOR i IN 1..array_length(hierarchy_levels, 1) LOOP
        IF old_group_by != '' THEN
            old_group_by := old_group_by || ', ';
        END IF;
        old_group_by := old_group_by || i::text;
    END LOOP;
    
    -- Add article position (hierarchy_count + 1)
    old_group_by := old_group_by || ', ' || (array_length(hierarchy_levels, 1) + 1)::text;
    
    -- Add additional columns positions
    IF array_length(additional_old_columns, 1) > 0 THEN
        FOR i IN 1..array_length(additional_old_columns, 1) LOOP
            old_group_by := old_group_by || ', ' || (array_length(hierarchy_levels, 1) + 1 + i)::text;
        END LOOP;
    END IF;
    
    -- Same for new_group_by
    new_group_by := '';
    FOR i IN 1..array_length(hierarchy_levels, 1) LOOP
        IF new_group_by != '' THEN
            new_group_by := new_group_by || ', ';
        END IF;
        new_group_by := new_group_by || i::text;
    END LOOP;
    
    -- Add article position (hierarchy_count + 1)
    new_group_by := new_group_by || ', ' || (array_length(hierarchy_levels, 1) + 1)::text;
    
    -- Add additional columns positions
    IF array_length(additional_new_columns, 1) > 0 THEN
        FOR i IN 1..array_length(additional_new_columns, 1) LOOP
            new_group_by := new_group_by || ', ' || (array_length(hierarchy_levels, 1) + 1 + i)::text;
        END LOOP;
    END IF;
    
    -- Build query based on pattern (crosstab vs simple join)
    IF use_crosstab THEN
        -- Crosstab pattern (for Figs, Carters, Victoria's Secret, etc.)
        -- Build crosstab attributes quoted array
        crosstab_attributes_quoted := '''' || array_to_string(crosstab_attributes, ''', ''') || '''';
        
        -- Build crosstab column definitions
        crosstab_column_list := 'ps_code int';
        FOREACH attr IN ARRAY crosstab_attributes
        LOOP
            crosstab_column_list := crosstab_column_list || ', "' || attr || '" text';
        END LOOP;
        
        -- Build SELECT list for crosstab attributes
        crosstab_select_list := '"' || array_to_string(crosstab_attributes, '", "') || '"';
        
        final_query := 
            'SELECT ' ||
            '    smt.supersession_id, ' ||
            '    smt.article as new_article, ' ||
            '    smt.old_article, ' ||
            '    smt.product_code as new_product_code, ' ||
            '    smt.old_product_code, ' ||
            '    smt.start_date, ' ||
            '    smt.end_date, ' ||
            '    COALESCE(smt.priority, 1) priority, ' ||
            crosstab_select_list || ', ' ||
            '    ARRAY_AGG(DISTINCT old_paf.product_code) as old_product_codes, ' ||
            '    ARRAY_AGG(DISTINCT old_paf.size) as old_sizes, ' ||
            '    ARRAY_AGG(DISTINCT new_paf.product_code) as new_product_codes, ' ||
            '    ARRAY_AGG(DISTINCT new_paf.size) as new_sizes ' ||
            '  FROM inventory_smart.product_supersession_mapping smt ' ||
            '  JOIN global.product_attributes_filter new_paf ' ||
            '    ON new_paf.product_code = smt.product_code ' ||
            CASE WHEN new_pa_sql IS NOT NULL AND new_pa_sql != '' 
                THEN REPLACE(new_pa_sql, ' WHERE ', ' AND ') 
                ELSE '' END ||
            '  JOIN global.product_attributes_filter old_paf ' ||
            '    ON old_paf.product_code = smt.old_product_code ' ||
            CASE WHEN old_pa_sql IS NOT NULL AND old_pa_sql != '' 
                THEN REPLACE(old_pa_sql, ' WHERE ', ' AND ') 
                ELSE '' END ||
            '  LEFT JOIN (' ||
            '    SELECT * FROM crosstab(' ||
            '      $crosstab$ ' ||
            '      SELECT ps_code, attribute_name, MAX(attribute_value) as attribute_value ' ||
            '      FROM inventory_smart.product_supersession_attribute ' ||
            '      GROUP BY 1,2 ORDER BY 1, 2 ' ||
            '      $crosstab$, ' ||
            '      $crosstab$ ' ||
            '      SELECT unnest(ARRAY[' || crosstab_attributes_quoted || ']) ' ||
            '      $crosstab$ ' ||
            '    ) AS ct(' || crosstab_column_list || ') ' ||
            '  ) supersession_attributes ' ||
            '  ON supersession_attributes.ps_code = smt.ps_code ' ||
            sku_filter_sql ||
            '  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8' ||
            CASE WHEN crosstab_select_list != '' THEN ', ' || crosstab_select_list ELSE '' END ||
            '  ORDER BY smt.supersession_id ' ||
            COALESCE(meta_cls, '');
    ELSE
        -- Simple join pattern (for Bealls, Tapestry, Crackerbarrel, etc.)
        IF use_separate_old_new_filters THEN
            -- Use separate old and new filters (Dollar General, Crackerbarrel pattern)
            final_query := 
                'SELECT ' ||
                CASE WHEN include_user_master_join AND created_by_join_type = 'old' 
                    THEN 'updated_data.*, um.name as created_by' 
                    ELSE 'updated_data.*' END ||
                ' FROM (' ||
                '  SELECT DISTINCT ' ||
                '    psm.old_article, ' ||
                '    psm.article, ' ||
                '    psm.priority, ' ||
                '    psm.start_date, ' ||
                '    psm.end_date, ' ||
                '    psm.has_store_exception, ' ||
                '    psm.created_by as created_by_id, ' ||
                '    psm.created_at, ' ||
                '    old_paf.*, ' ||
                '    new_paf.* ' ||
                '  FROM inventory_smart.product_supersession_mapping psm ' ||
                '  INNER JOIN (' ||
                '    SELECT ' ||
                '      ' || old_hierarchy_cols ||
                '      paf.article as old_article, ' ||
                '      ' || old_additional_cols ||
                '      ARRAY_AGG(paf.size) as old_sizes, ' ||
                '      ARRAY_AGG(paf.product_code) as old_product_codes ' ||
                '    FROM global.product_attributes_filter paf ' ||
                COALESCE(old_pa_sql, '') || sku_filter_sql ||
                '    GROUP BY ' || old_group_by ||
                '  ) old_paf ON old_paf.old_article = psm.old_article ' ||
                '  INNER JOIN (' ||
                '    SELECT ' ||
                '      ' || new_hierarchy_cols ||
                '      paf.article as new_article, ' ||
                '      ' || new_additional_cols ||
                '      ARRAY_AGG(paf.size) as new_sizes, ' ||
                '      ARRAY_AGG(paf.product_code) as new_product_codes ' ||
                '    FROM global.product_attributes_filter paf ' ||
                COALESCE(new_pa_sql, '') || sku_filter_sql ||
                '    GROUP BY ' || new_group_by ||
                '  ) new_paf ON new_paf.new_article = psm.article ' ||
                ') updated_data ' ||
                CASE WHEN include_user_master_join AND created_by_join_type = 'old' 
                    THEN 'INNER JOIN global.user_master um ON updated_data.created_by_id::int = um.user_code '
                    ELSE '' END ||
                COALESCE(meta_cls, '');
        ELSE
            -- Use same filter for both old and new (simpler pattern - not commonly used)
            final_query := 
                'SELECT * ' ||
                'FROM inventory_smart.product_supersession_mapping psm ' ||
                'INNER JOIN global.product_attributes_filter paf ' ||
                '  ON paf.product_code = psm.product_code ' ||
                COALESCE(old_pa_sql, '') || sku_filter_sql || ' ' ||
                COALESCE(meta_cls, '');
        END IF;
    END IF;
    
    -- Log query if enabled
    IF enable_query_logging THEN
        RAISE NOTICE 'Generated Query: %', final_query;
    END IF;
    
    -- Open cursor with final query
    OPEN $1 FOR EXECUTE final_query;
    
    RETURN $1;
    
END;
$$;