--liquibase formatted sql
--changeset ppconfig_driven:rule_list_product_only-MTP133408 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:optimization_Sp rule_list_product_only
--comment: optimization for sp rule_list_product_only
--rollback: SELECT 1

drop function if exists global.rule_list_product_only(refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS global.rule_list_product_only(refcursor, jsonb, jsonb, text, jsonb);

CREATE OR REPLACE FUNCTION global.rule_list_product_only(refcursor, jsonb, jsonb, text, jsonb DEFAULT '{}'::jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_query_pa text;
_query_sa text;
_final varchar;
_query_meta_filters text;
_where_clause text;
_levels text[];
_meta_columns text[];
filtered_keys jsonb;
_module_code text;
_use_store_counts_str text;
_use_product_attributes_str text;
_validity_check_str text;
_store_count_filter_str text;
_rcl_filter_level_str text;
_use_store_counts boolean := false;
_use_product_attributes boolean := false;
_validity_check boolean := false;
_store_count_filter boolean := false;
_rcl_filter_level text := 'product'; -- Default to product level
_active_filter jsonb := '{"active": [{"type": "list", "operator": "in", "values": [true]}]}';

/*
Configuration-driven function that reads client requirements from tenant_attribute_master.
Supports all client-specific functionality based on configuration.

Configuration Structure in tenant_attribute_master:
{
  "use_store_attributes_filter": "true",
  "use_product_attributes_filter": "false", 
  "use_validity_check": "true",
  "use_store_count_filter": "true",
  "rcl_filter_level": "article"
}

Note: rcl_filter_level defaults to "product" if not specified in TAM table.
Only set "rcl_filter_level": "article" in TAM when article-level filtering is required.

Sample calls:
select * from global.rule_list_product_only('cur', '{"l1_name": [{"type": "list", "operator": "in", "values": ["CLOTHING"]}]}', '{"limit":{"limit":10, "page":1}}', 'global.rcl_product_mapping_product_store_rule');
*/

BEGIN
    _query_meta_filters := global.form_table_query($3);
    
    -- Read configuration from tenant_attribute_master using requested format
    BEGIN
        SELECT 
            attribute_value->>'use_store_attributes_filter',
            attribute_value->>'use_product_attributes_filter',
            attribute_value->>'use_validity_check',
            attribute_value->>'use_store_count_filter',
            attribute_value->>'rcl_filter_level'
        INTO 
            _use_store_counts_str,
            _use_product_attributes_str,
            _validity_check_str,
            _store_count_filter_str,
            _rcl_filter_level_str
        FROM global.tenant_attribute_master tam 
        WHERE name = 'rule_list_config';

        -- Convert string values to boolean
        _use_store_counts := COALESCE(_use_store_counts_str::boolean, false);            -- for fetching store_counts in the list api
        _use_product_attributes := COALESCE(_use_product_attributes_str::boolean, false);-- if join with PAF is required
        _validity_check := COALESCE(_validity_check_str::boolean, false);                -- check for validity in rules table if it is > today's date
        _store_count_filter := COALESCE(_store_count_filter_str::boolean, false);        -- to filter if store_counts is > 0
        _rcl_filter_level := COALESCE(_rcl_filter_level_str, 'product');                 -- filter level: 'product' (default) or 'article'
	
	raise notice 'Config found: store_attributes=%, product_attributes=%, validity_check=%, store_count_filter=%, rcl_filter_level=%', 
	_use_store_counts, _use_product_attributes, _validity_check, _store_count_filter, _rcl_filter_level;
            
    END;

    -- Generate query based on configuration
    IF _use_product_attributes THEN
        BEGIN
            select distinct module_code 
            from global.module_master 
            join global.rcl_master using (module_code) 
            where module_name = 'Product Mapping' and application_code = 1 
            limit 1 into _module_code;
        END;

        -- Extract column names from search and sort arrays in meta JSON
        SELECT array_agg(DISTINCT elem->>'column')
        INTO _meta_columns
        FROM jsonb_array_elements(
            COALESCE($3->'search', '[]'::jsonb) || COALESCE($3->'sort', '[]'::jsonb)
        ) AS elem
        WHERE elem->>'column' IS NOT NULL
          AND elem->>'column' NOT LIKE '%->%'
          AND elem->>'column' NOT LIKE '%>>%';
        
        raise notice 'Extracted meta columns for search/sort: %', _meta_columns;

        -- Apply article level filtering if configured
        IF _rcl_filter_level = 'article' THEN
            -- For article level: filter by distinct articles
            select * from global.form_attribute_table_filters_rcl_level('product_attributes', 'article', $2, '', _module_code, COALESCE(_meta_columns, '{}'::text[])) into _query_part;
        ELSE
            -- For product level: use product_code as before
            select * from global.form_attribute_table_filters_rcl_level('product_attributes', 'product_code', $2, '', _module_code, COALESCE(_meta_columns, '{}'::text[])) into _query_part;
        END IF;

		raise notice '_query_part: %', _query_part;

    ELSE
        -- Use traditional RCL-based filtering (fallback implementation)
        select array_agg(distinct lev) into _levels 
        from global.rcl_master, unnest(level) as lev
        where not is_deleted
        and module_code in (select distinct module_code from global.module_master join global.rcl_master using (module_code) where module_name = 'Product Mapping' limit 1)
        group by is_deleted;

        SELECT jsonb_object_agg(key, value) FROM jsonb_each($2) WHERE key = ANY(_levels) into filtered_keys;
        select * from global.form_rcl_product_validity_filter(filtered_keys::jsonb, '{}'::text[]) into _where_clause;
        
        IF _where_clause is not null and length(_where_clause) > 0 THEN
            _query_part := 'SELECT * FROM ' || $4 || ' r ' || _where_clause;
        ELSE
            _query_part := 'SELECT * FROM ' || $4 || ' r ';
        END IF;
    END IF;
    
    -- Build the final query with conditional CTEs based on configuration
    IF _use_store_counts THEN
        -- version with store counts and filtering
        $5 := $5 || _active_filter;
        IF $5 != '{}'::jsonb THEN
            _query_sa := global.form_attribute_table_filters_v3('store_attributes', 'store_code', $5);
        END IF;
        
        _query_combine := 'WITH rule_data AS materialized (SELECT * FROM (' || _query_part || ') p),
        filtered_stores AS materialized (
            SELECT store_code
            FROM ' || CASE WHEN $5 != '{}'::jsonb
                          THEN '(' || _query_sa || ')'
                          ELSE 'global.store_attributes_filter'
                     END || ' saf
        ),
        store_counts AS (
            SELECT rule_code, COUNT(DISTINCT psa_name) as store_count
            FROM global.rcl_product_mapping_product_store rpmps
            WHERE rpmps.validity IS NOT NULL';
            
        -- Add validity date check if configured
        IF _validity_check THEN
            _query_combine := _query_combine || ' AND rpmps.validity @> current_date';
        END IF;
        
        _query_combine := _query_combine || 
        CASE WHEN $5 != '{}'::jsonb THEN
            ' AND psa_name IN (SELECT store_code FROM filtered_stores)'
        ELSE
            ''
        END || '
            GROUP BY rule_code
        )';
        
        -- Add DISTINCT for article level to avoid duplicates
        IF _rcl_filter_level = 'article' THEN
            _query_combine := _query_combine || '
        SELECT DISTINCT ON (A.rcl_dimension) A.*, COALESCE(s.store_count, 0) as store_count
        FROM (
            SELECT DISTINCT rd.*
            FROM rule_data rd
            JOIN global.rcl_master rm USING (rcl_code)
            WHERE NOT rm.is_deleted
        ) AS A
        LEFT JOIN store_counts s USING (rule_code)';
        ELSE
            _query_combine := _query_combine || '
        SELECT A.*, COALESCE(s.store_count, 0) as store_count
        FROM (
            SELECT rd.*
            FROM rule_data rd
            JOIN global.rcl_master rm USING (rcl_code)
            WHERE NOT rm.is_deleted
        ) AS A
        LEFT JOIN store_counts s USING (rule_code)';
        END IF;
        
        -- Add store count filter if configured
        IF _store_count_filter THEN
            _query_combine := _query_combine || ' WHERE COALESCE(s.store_count, 0) > 0';
        END IF;
            
    ELSE
        -- Basic version (fallback to current implementation)
        IF _rcl_filter_level = 'article' THEN
            _query_combine := 'SELECT DISTINCT ON (p.rcl_dimension) p.*
            FROM (
                SELECT DISTINCT *
                FROM (' || _query_part || ') r
            ) p';
        ELSE
            _query_combine := 'SELECT p.*
            FROM (
                SELECT *
                FROM (' || _query_part || ') r
            ) p';
        END IF;
    END IF;
    
    _query_combine := _query_combine || ' ' || _query_meta_filters;
    
    raise notice 'Final query: %', _query_combine;
    -- open $1 for execute _query_combine;
    	execute 'drop table if exists "' || $1 || '"; create temp table "' || $1 || '" as select * from (' || _query_combine || ') x;';
    open $1 for execute 'select * from "' || $1 || '";';
    return _query_combine;
END
$function$
;