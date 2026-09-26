--liquibase formatted sql
--changeset liquibase:rcl_dc_store_policy_list runOnChange:true stripComments:false splitStatements:false context:MTP-71907 labels:MTP-71907
--comment: MTP-71907 Used to list all rcl dc store policy rules
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_dc_store_policy_list(refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.rcl_dc_store_policy_list(refcursor, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_dc_store_policy_list(
    input refcursor, 
    jsonb, 
    jsonb,
    _is_rule_store_level_configuration boolean default false
)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
_query_part text := '';
_query_combine text := '';
_where text := '';
_query_meta_filters text := '';
_hash_cols text;
_rcl_codes integer[];
_pa_query text := '';
_default_auto_allocation_rule_code int4;
_default_auto_allocation_rule_name text;
_default_dc_store_rule_rule_code int4;
_default_dc_store_rule_rule_name text;
_default_auto_allocation_scheduler_code int4;
_default_auto_allocation_scheduler_name text;
_default_product_profile_code int4;
_default_product_profile_name text;
_store_group_ids text;
_store_group_names text;
_default_store_groups_mapped text;
_l0_name text[];
_l1_name text[];
json_fields TEXT[] := ARRAY['auto_allocation_schedular_name']; -- Add other JSON field filters here
json_field TEXT;
matches TEXT[];
pattern TEXT;
v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin   
    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    select
        array_agg(rcl_code),
        'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
    from global.rcl_master 
    where not is_deleted
    and module_code = '10003'
    group by is_deleted;

    raise notice '_pa_query: %', _pa_query;
   
    SELECT replace(replace(value::json->>'values', '[', '{'), ']', '}')
    INTO _l0_name
    FROM jsonb_array_elements($2->'l0_name') AS elem
    WHERE (elem->>'type')::text = 'list' AND (elem->>'operator')::text = 'in';
    
    SELECT replace(replace(value::json->>'values', '[', '{'), ']', '}')
    INTO _l1_name
    FROM jsonb_array_elements($2->'l1_name') AS elem
    WHERE (elem->>'type')::text = 'list' AND (elem->>'operator')::text = 'in';

    RAISE NOTICE '_l0_name: %', _l0_name;
    RAISE NOTICE '_l1_name: %', _l1_name;
   
    WITH filtered_stores AS (
        SELECT store_code
        FROM global.store_attributes_filter
        WHERE planning_group_name::varchar = any(_l0_name)
    ),
    store_group_counts AS (
        SELECT
            COUNT(DISTINCT sgm.store_code) AS store_codes_count,
            array_agg(DISTINCT sgm.sg_code) AS store_group_ids,
            COUNT(DISTINCT sgm.sg_code) AS store_group_count,
            STRING_AGG(DISTINCT sg.name, ',') AS store_group_names
        FROM
            global.store_groups_mapping sgm
        JOIN
            filtered_stores fs
        ON
            sgm.store_code = fs.store_code
        JOIN
            global.tenant_attribute_master tam
        ON
            tam.attribute_code = 1501
        CROSS JOIN
            LATERAL jsonb_each_text(tam.attribute_value->'default_store_group'->'default') jt
        JOIN
            global.store_groups sg
        ON
            sg.sg_code = sgm.sg_code
        WHERE
            sgm.sg_code = jt.value::int
            AND jt.key = any(_l0_name)
    )
    SELECT 
        coalesce(store_codes_count || '/' || store_group_count),
        COALESCE(store_group_ids, '{}') AS _store_group_ids,
        COALESCE(store_group_names, '') AS _store_group_names
    INTO _default_store_groups_mapped, _store_group_ids, _store_group_names
    FROM store_group_counts;
   
    raise notice '_default_store_groups_mapped: %', _default_store_groups_mapped;
    raise notice '_store_group_ids: %', _store_group_ids;

    _where := ' join (
                    with paf as materialized (
                        select rcl_hash, display_article
                        from (
                            select unnest(rcl_hashes) as rcl_hash, display_article
                            from (
                                select ' || _hash_cols || ', display_article
                                from global.product_attributes_filter ' || _pa_query || ' and active
                            ) x
                        ) y
                        where rcl_hash is not null
                        group by 1,2
                    )
                    select 
                        rcl_code, 
                        rule_code, 
                        rule_name, 
                        md5(rcl_dimension::text) as rcl_hash,
                        CASE 
                            WHEN rcl_dimension ? ''article''
                            THEN jsonb_set(rcl_dimension, ''{display_article}'', to_jsonb(paf.display_article))
                            ELSE rcl_dimension
                        END as rcl_dimension
                    from inventory_smart.rcl_dc_store_policy_rule r
                    join paf 
                        on md5(r.rcl_dimension::text) = paf.rcl_hash
                    where r.rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
                    group by 1,2,3,4,5
                ) r 
                on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

    raise notice '_where: %', _where;

    _query_meta_filters := inventory_smart.form_rcl_table_query($3);
    raise notice 'before _query_meta_filters: %', _query_meta_filters;
    -- sample output: 
    -- WHERE (c_rule_code::text ILIKE '%28832%') AND (auto_allocation_scheduler_name::text ILIKE '%daily%') LIMIT 100 OFFSET 0
	-- Loop through each JSON field to check for its presence in _query_meta_filters
    FOREACH json_field IN ARRAY json_fields LOOP
        -- Find and capture the pattern in the ILIKE clause for the JSON field
		-- Case 1: Single ILIKE clause
        matches := regexp_matches(_query_meta_filters, '\(' || json_field || '::text ILIKE ''%([^'']*)%''\)', 'g');
        
        -- If there’s a match, use the captured pattern for replacement
        IF array_length(matches, 1) IS NOT NULL THEN
            pattern := matches[1]; -- Extract the pattern from the match array

            -- Replace the matched pattern with the EXISTS clause
            _query_meta_filters := regexp_replace(
                _query_meta_filters,
                '\(' || json_field || '::text ILIKE ''%([^'']*)%''\)',
                'EXISTS (
                    SELECT 1 FROM jsonb_array_elements(store_details) AS details
                    WHERE details->>' || quote_literal(json_field) || ' ILIKE ''%' || pattern || '%''
                )',
                'g' -- Global replacement flag
            );
		ELSE 
	        -- Case 2: ILIKE ANY clause
	        matches := regexp_matches(_query_meta_filters, '\(' || json_field || '::text ILIKE any\(''(\{[^}]*\})''\)\)', 'g');
	        
	        -- If `ILIKE ANY` clause is found, handle it
	        IF array_length(matches, 1) IS NOT NULL THEN
	            RAISE NOTICE 'found a match for ILIKE ANY';
	            pattern := matches[1]; -- Extract the ANY patterns as a string, e.g., '{%hello%,%rule%}'
	            RAISE NOTICE 'Pattern: %', pattern;
	            
	            -- Replace the matched `ILIKE ANY` clause with an EXISTS clause
	            _query_meta_filters := regexp_replace(
	                _query_meta_filters,
	                '\(' || json_field || '::text ILIKE any\(''(\{[^}]*\})''\)\)',
	                'EXISTS (
	                    SELECT 1 FROM jsonb_array_elements(store_details) AS details
	                    WHERE details->>' || quote_literal(json_field) || ' ILIKE any(''' || pattern || ''')
	                )',
	                'g' -- Global replacement flag
	            );
	        END IF;
        END IF;
    END LOOP;
	raise notice 'after _query_meta_filters: %', _query_meta_filters;
    -- sample output: 
    -- WHERE (c_rule_code::text ILIKE '%28832%') AND EXISTS (
    --     SELECT 1 FROM jsonb_array_elements(store_details) AS details
    --     WHERE details->>'auto_allocation_schedular_name' ILIKE '%daily%'
    -- ) LIMIT 100 OFFSET 0

    _query_part := '
        SELECT 
            c.rule_code as c_rule_code,
            c.rcl_code as c_rcl_code,
            r.rule_name as rule_name,
            r.rcl_dimension,
            null as _default_auto_allocation_rule_code,
            ' || quote_literal('No Rule') || ' as _default_auto_allocation_rule_name,
            null as _default_dc_store_rule_rule_code,
            ' || quote_literal('Default Rule') || ' as _default_dc_store_rule_rule_name,
            null as _default_auto_allocation_scheduler_code,
            ' || quote_literal('No Rule') || ' as _default_auto_allocation_scheduler_name,
            ' || quote_literal(_store_group_ids::text) || '::integer[] as _store_group_ids,
            ' || quote_literal(_default_store_groups_mapped) || ' as _default_store_groups_mapped,
            ' || quote_literal(_store_group_names::text) || ' as _store_groups_names,
            null as _default_product_profile_code,
            ' || quote_literal('ia-recommended') || ' as _default_product_profile_name,
            jsonb_agg(jsonb_build_object(
                ''start_date'', lower(c.validity),
                ''end_date'', (upper(c.validity)-1),
                ''created_at'', c.created_at,
                ''updated_at'', c.updated_at,
                ''updated_by'', c.updated_by,
                ''created_by'', c.created_by,
                ''user_code'', u.user_code,
                ''user'', u.email,
		        ''store_store_groups_mapped'', 
		            CASE 
		                WHEN COALESCE(sg.store_codes_count || ''/'' || array_length(c.default_store_groups, 1), ''0/0'') = ''0/0'' 
		                THEN ' || quote_literal(_default_store_groups_mapped) || '
		                ELSE sg.store_codes_count || ''/'' || array_length(c.default_store_groups, 1)
		            END,
		        ''default_store_groups'', 
		            CASE 
		                WHEN COALESCE(sg.store_codes_count || ''/'' || array_length(c.default_store_groups, 1), ''0/0'') = ''0/0''
		                THEN ' || quote_literal(_store_group_ids) || '::integer[] 
		                ELSE c.default_store_groups
		            END,
                ''store_groups_names'', 
                    CASE 
                        WHEN COALESCE(sg.store_codes_count || ''/'' || array_length(c.default_store_groups, 1), ''0/0'') = ''0/0'' 
                        THEN ' || quote_literal(_store_group_names) || '
                        ELSE sg.store_group_names
                    END,
                ''product_profile'', CASE 
                    WHEN c.default_product_profile IS NULL 
                        THEN ''ia-recommended'' 
                    WHEN pp.special_classification = ''user-defined'' 
                        THEN pp.name 
                    ELSE ''ia-recommended'' 
                END,
                ''default_product_profile'', pp.pp_code,
                ''auto_allocation_rule_name'', CASE 
                    WHEN dspaa.rule_name IS NOT NULL AND NOT dspaa.is_deleted 
                    THEN dspaa.rule_name 
                    ELSE ''No Rule'' 
                END,
                ''auto_allocation_rule'', dspaa.rule_code,
                ''dc_store_rule_name'', CASE 
                    WHEN dspsr.rule_name IS NOT NULL AND NOT dspsr.is_deleted 
                    THEN dspsr.rule_name 
                    ELSE ''Default Rule'' 
                END,
                ''dc_store_rule'', dspsr.rule_code,
                ''auto_allocation_schedular_name'', CASE 
                    WHEN aas.sh_code IS NOT NULL AND NOT aas.is_deleted 
                    THEN aas.sh_name 
                    ELSE ''No Rule'' 
                END,
                ''auto_allocation_schedular'', aas.sh_code
            )
		) as store_details 
        FROM 
            inventory_smart.rcl_dc_store_policy c
            LEFT JOIN global.user_master u on u.user_code = coalesce(c.updated_by, c.created_by)
            LEFT JOIN inventory_smart.product_profile_master pp ON pp.pp_code = c.default_product_profile
            LEFT JOIN inventory_smart.dc_store_policy_user_rule dspaa ON dspaa.rule_code = c.auto_allocation_rule
            LEFT JOIN inventory_smart.dc_store_policy_user_rule dspsr ON dspsr.rule_code = c.dc_store_rule
            LEFT JOIN inventory_smart.auto_allocation_scheduler aas ON aas.sh_code = c.auto_allocation_schedular
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(DISTINCT store_code) AS store_codes_count,
                    STRING_AGG(DISTINCT sg.name, '','') AS store_group_names
                FROM
                    global.store_groups_mapping sgm
                    JOIN global.store_groups sg ON sg.sg_code = sgm.sg_code
                WHERE
                    sgm.sg_code = ANY (c.default_store_groups)
            ) sg ON true

            ' || _where || ' 

		where current_date < upper(c.validity) and not c.is_deleted

        GROUP BY c.rule_code, c.rcl_code, r.rcl_dimension, r.rule_name';

    _query_combine := '
    select A.*
    from         
    (
        SELECT 
            p.*, rm.is_default
        FROM
            (' || _query_part || ') p
            JOIN global.rcl_master rm ON p.c_rcl_code = rm.rcl_code
        WHERE NOT rm.is_deleted) as A ' || _query_meta_filters;

    raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.rcl_dc_store_policy_list', 'Before returning function value',_query_combine,jsonb_build_object('product_attributes_filter',$2,'form_rcl_table',$3)) ;		

    return $1;

END;
$function$
;
