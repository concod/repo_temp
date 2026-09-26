--liquibase formatted sql
--changeset liquibase:product_supersession_get_mapped_products runOnChange:true stripComments:false splitStatements:false context:MTP-136932 labels:MTP-136932
--comment: MTP-136932 Enhancements to Supersession Mapping: Smart Size Mapping - Priority 1 maps same sizes between old and new product (S->S, M->M), Priority 2 handles non-matching sizes.
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
AS $function$
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
    v_merged_config := v_default_config;
    
    IF v_tenant_config IS NOT NULL THEN
        v_merged_config := v_merged_config || v_tenant_config;
        RAISE NOTICE 'Loaded product_supersession config from tenant_workflow_config';
    ELSE
        RAISE NOTICE 'No tenant-specific config found, using default config';
    END IF;
    
    IF config IS NOT NULL AND config <> '{}'::jsonb THEN
        v_merged_config := v_merged_config || config;
        RAISE NOTICE 'Applied runtime config overrides';
    END IF;
    
    -- Load configuration from merged JSONB
    join_on_article := COALESCE((v_merged_config->>'join_on_article')::boolean, false);
    created_by_join_type := COALESCE(v_merged_config->>'created_by_join_type', 'old');
    enable_query_logging := COALESCE((v_merged_config->>'enable_query_logging')::boolean, true);
    
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
    
    use_crosstab := (array_length(crosstab_attributes, 1) > 0);
    include_user_master_join := (created_by_join_type IS NOT NULL AND created_by_join_type != '');
    
    -- Extract filters
    old_filter := filters->0;
    new_filter := filters->1;
    
    IF new_filter IS NULL OR new_filter = '{}'::jsonb THEN
        new_filter := old_filter;
    END IF;
    
    -- Build meta filter query
    meta_cls := '';
    IF meta <> '{}' THEN
        meta_cls := global.form_table_query(meta);
    END IF;
    
    -- Build old product filter
    old_pa_sql := '';
    IF old_filter IS NOT NULL AND old_filter <> '{}' THEN
        old_pa_sql := inventory_smart.form_main_table_filters('ph_master', old_filter);
        IF use_crosstab THEN
            IF old_pa_sql IS NOT NULL AND old_pa_sql <> '' THEN
                old_pa_sql := REPLACE(old_pa_sql, 'paf.', 'old_paf.');
            END IF;
            old_pa_sql := REGEXP_REPLACE(old_pa_sql, '\(([a-z0-9_]+)::', '(old_paf.\1::', 'g');
        END IF;
    END IF;
    
    -- Build new product filter
    new_pa_sql := '';
    IF new_filter IS NOT NULL AND new_filter <> '{}' THEN
        new_pa_sql := inventory_smart.form_main_table_filters('ph_master', new_filter);
        IF use_crosstab THEN
            IF new_pa_sql IS NOT NULL AND new_pa_sql <> '' THEN
                new_pa_sql := REPLACE(new_pa_sql, 'paf.', 'new_paf.');
            END IF;
            new_pa_sql := REGEXP_REPLACE(new_pa_sql, '\(([a-z0-9_]+)::', '(new_paf.\1::', 'g');
        END IF;
    END IF;
    
    use_separate_old_new_filters := TRUE;
    
    -- Build SKU type filter
    IF array_length(sku_type_filter, 1) > 0 THEN
        sku_filter_sql := ' AND paf.sku_type IN (''' || array_to_string(sku_type_filter, ''',''') || ''')';
        
        IF old_pa_sql IS NOT NULL AND old_pa_sql <> '' THEN
            old_pa_sql := old_pa_sql || sku_filter_sql;
        ELSE
            old_pa_sql := ' WHERE paf.sku_type IN (''' || array_to_string(sku_type_filter, ''',''') || ''')';
        END IF;
        
        IF new_pa_sql IS NOT NULL AND new_pa_sql <> '' THEN
            new_pa_sql := new_pa_sql || sku_filter_sql;
        ELSE
            new_pa_sql := ' WHERE paf.sku_type IN (''' || array_to_string(sku_type_filter, ''',''') || ''')';
        END IF;
    END IF;
    
    sku_filter_sql := '';
    
    -- Build hierarchy column selects
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
    -- Subquery SELECT order:
    --   1..N   → hierarchy levels
    --   N+1    → article
    --   N+2    → product_description
    --   N+3    → product_name
    --   N+4..  → additional_columns (if any)
    old_group_by := '';
    FOR i IN 1..array_length(hierarchy_levels, 1) LOOP
        IF old_group_by != '' THEN
            old_group_by := old_group_by || ', ';
        END IF;
        old_group_by := old_group_by || i::text;
    END LOOP;
    -- article
    old_group_by := old_group_by || ', ' || (array_length(hierarchy_levels, 1) + 1)::text;
    -- additional columns
    IF array_length(additional_old_columns, 1) > 0 THEN
        FOR i IN 1..array_length(additional_old_columns, 1) LOOP
            old_group_by := old_group_by || ', ' || (array_length(hierarchy_levels, 1) + 1 + i)::text;
        END LOOP;
    END IF;

    new_group_by := '';
    FOR i IN 1..array_length(hierarchy_levels, 1) LOOP
        IF new_group_by != '' THEN
            new_group_by := new_group_by || ', ';
        END IF;
        new_group_by := new_group_by || i::text;
    END LOOP;
    -- article
    new_group_by := new_group_by || ', ' || (array_length(hierarchy_levels, 1) + 1)::text;
    -- additional columns
    IF array_length(additional_new_columns, 1) > 0 THEN
        FOR i IN 1..array_length(additional_new_columns, 1) LOOP
            new_group_by := new_group_by || ', ' || (array_length(hierarchy_levels, 1) + 1 + i)::text;
        END LOOP;
    END IF;
    
    -- Build query
    IF use_crosstab THEN
        -- Crosstab pattern
        crosstab_attributes_quoted := '''' || array_to_string(crosstab_attributes, ''', ''') || '''';
        
        crosstab_column_list := 'ps_code int';
        FOREACH attr IN ARRAY crosstab_attributes
        LOOP
            crosstab_column_list := crosstab_column_list || ', "' || attr || '" text';
        END LOOP;
        
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
        IF use_separate_old_new_filters THEN
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

                -- Old hierarchy + flat fields
                '    old_paf.old_' || array_to_string(hierarchy_levels, '_name, old_paf.old_') || '_name, ' ||
                '    old_paf.old_article, ' ||
				CASE WHEN array_length(additional_old_columns, 1) > 0
				    THEN (
				        SELECT string_agg('old_paf.old_' || c, ', ')
				        FROM unnest(additional_old_columns) AS c
				    ) || ', '
				    ELSE '' END ||

                -- Smart-ordered old_sizes: exact matches first (by ast."order"), then unmatched
                '    ARRAY( ' ||
                '      SELECT op.size ' ||
                '      FROM unnest(old_paf.old_sizes, old_paf.old_product_codes, old_paf.old_orders) ' ||
                '        AS op(size, code, ord) ' ||
                '      WHERE op.size IN (SELECT ns FROM unnest(new_paf.new_sizes) AS ns) ' ||
                '      ORDER BY op.ord ASC NULLS LAST ' ||
                '    ) || ' ||
                '    ARRAY( ' ||
                '      SELECT op.size ' ||
                '      FROM unnest(old_paf.old_sizes, old_paf.old_product_codes, old_paf.old_orders) ' ||
                '        AS op(size, code, ord) ' ||
                '      WHERE op.size NOT IN (SELECT ns FROM unnest(new_paf.new_sizes) AS ns) ' ||
                '      ORDER BY op.ord ASC NULLS LAST ' ||
                '    ) AS old_sizes, ' ||

                -- Smart-ordered old_product_codes aligned to old_sizes
                '    ARRAY( ' ||
                '      SELECT op.code ' ||
                '      FROM unnest(old_paf.old_sizes, old_paf.old_product_codes, old_paf.old_orders) ' ||
                '        AS op(size, code, ord) ' ||
                '      WHERE op.size IN (SELECT ns FROM unnest(new_paf.new_sizes) AS ns) ' ||
                '      ORDER BY op.ord ASC NULLS LAST ' ||
                '    ) || ' ||
                '    ARRAY( ' ||
                '      SELECT op.code ' ||
                '      FROM unnest(old_paf.old_sizes, old_paf.old_product_codes, old_paf.old_orders) ' ||
                '        AS op(size, code, ord) ' ||
                '      WHERE op.size NOT IN (SELECT ns FROM unnest(new_paf.new_sizes) AS ns) ' ||
                '      ORDER BY op.ord ASC NULLS LAST ' ||
                '    ) AS old_product_codes, ' ||

                -- New hierarchy + flat fields
                '    new_paf.new_' || array_to_string(hierarchy_levels, '_name, new_paf.new_') || '_name, ' ||
                '    new_paf.new_article, ' ||
				CASE WHEN array_length(additional_new_columns, 1) > 0
				    THEN (
				        SELECT string_agg('new_paf.new_' || c, ', ')
				        FROM unnest(additional_new_columns) AS c
				    ) || ', '
				    ELSE '' END ||

                -- Smart-ordered new_sizes: exact matches aligned to old, then unmatched
                '    ARRAY( ' ||
                '      SELECT np.size ' ||
                '      FROM unnest(new_paf.new_sizes, new_paf.new_product_codes, new_paf.new_orders) ' ||
                '        AS np(size, code, ord) ' ||
                '      WHERE np.size IN (SELECT os FROM unnest(old_paf.old_sizes) AS os) ' ||
                '      ORDER BY np.ord ASC NULLS LAST ' ||
                '    ) || ' ||
                '    ARRAY( ' ||
                '      SELECT np.size ' ||
                '      FROM unnest(new_paf.new_sizes, new_paf.new_product_codes, new_paf.new_orders) ' ||
                '        AS np(size, code, ord) ' ||
                '      WHERE np.size NOT IN (SELECT os FROM unnest(old_paf.old_sizes) AS os) ' ||
                '      ORDER BY np.ord ASC NULLS LAST ' ||
                '    ) AS new_sizes, ' ||

                -- Smart-ordered new_product_codes aligned to new_sizes
                '    ARRAY( ' ||
                '      SELECT np.code ' ||
                '      FROM unnest(new_paf.new_sizes, new_paf.new_product_codes, new_paf.new_orders) ' ||
                '        AS np(size, code, ord) ' ||
                '      WHERE np.size IN (SELECT os FROM unnest(old_paf.old_sizes) AS os) ' ||
                '      ORDER BY np.ord ASC NULLS LAST ' ||
                '    ) || ' ||
                '    ARRAY( ' ||
                '      SELECT np.code ' ||
                '      FROM unnest(new_paf.new_sizes, new_paf.new_product_codes, new_paf.new_orders) ' ||
                '        AS np(size, code, ord) ' ||
                '      WHERE np.size NOT IN (SELECT os FROM unnest(old_paf.old_sizes) AS os) ' ||
                '      ORDER BY np.ord ASC NULLS LAST ' ||
                '    ) AS new_product_codes ' ||

                '  FROM inventory_smart.product_supersession_mapping psm ' ||
                '  INNER JOIN (' ||
                '    SELECT ' ||
                '      ' || old_hierarchy_cols ||
                '      paf.article as old_article, ' ||
                '      ' || old_additional_cols ||
                -- DISTINCT ON deduplicates ast by product_code
                '      ARRAY_AGG(paf.size         ORDER BY ast."order" ASC NULLS LAST) AS old_sizes, ' ||
                '      ARRAY_AGG(paf.product_code ORDER BY ast."order" ASC NULLS LAST) AS old_product_codes, ' ||
                '      ARRAY_AGG(ast."order"      ORDER BY ast."order" ASC NULLS LAST) AS old_orders ' ||
                '    FROM global.product_attributes_filter paf ' ||
                '    LEFT JOIN ( ' ||
                '      SELECT DISTINCT ON (product_code) product_code, "order" ' ||
                '      FROM inventory_smart.article_status_tag ' ||
                '      ORDER BY product_code, "order" ASC NULLS LAST ' ||
                '    ) ast ON ast.product_code = paf.product_code ' ||
                COALESCE(old_pa_sql, '') || sku_filter_sql ||
                '    GROUP BY ' || old_group_by ||
                '  ) old_paf ON old_paf.old_article = psm.old_article ' ||
                '  INNER JOIN (' ||
                '    SELECT ' ||
                '      ' || new_hierarchy_cols ||
                '      paf.article as new_article, ' ||
                '      ' || new_additional_cols ||
                -- DISTINCT ON deduplicates ast by product_code
                '      ARRAY_AGG(paf.size         ORDER BY ast."order" ASC NULLS LAST) AS new_sizes, ' ||
                '      ARRAY_AGG(paf.product_code ORDER BY ast."order" ASC NULLS LAST) AS new_product_codes, ' ||
                '      ARRAY_AGG(ast."order"      ORDER BY ast."order" ASC NULLS LAST) AS new_orders ' ||
                '    FROM global.product_attributes_filter paf ' ||
                '    LEFT JOIN ( ' ||
                '      SELECT DISTINCT ON (product_code) product_code, "order" ' ||
                '      FROM inventory_smart.article_status_tag ' ||
                '      ORDER BY product_code, "order" ASC NULLS LAST ' ||
                '    ) ast ON ast.product_code = paf.product_code ' ||
                COALESCE(new_pa_sql, '') || sku_filter_sql ||
                '    GROUP BY ' || new_group_by ||
                '  ) new_paf ON new_paf.new_article = psm.article ' ||
                ') updated_data ' ||
                CASE WHEN include_user_master_join AND created_by_join_type = 'old'
                    THEN 'INNER JOIN global.user_master um ON updated_data.created_by_id::int = um.user_code '
                    ELSE '' END ||
                COALESCE(meta_cls, '');
        ELSE
            -- Same filter for both old and new
            final_query :=
                'SELECT * ' ||
                'FROM inventory_smart.product_supersession_mapping psm ' ||
                'INNER JOIN global.product_attributes_filter paf ' ||
                '  ON paf.product_code = psm.product_code ' ||
                COALESCE(old_pa_sql, '') || sku_filter_sql || ' ' ||
                COALESCE(meta_cls, '');
        END IF;
    END IF;
    
    IF enable_query_logging THEN
        RAISE NOTICE 'Generated Query: %', final_query;
    END IF;
    
    OPEN $1 FOR EXECUTE final_query;
    RETURN $1;

END;
$function$
;
