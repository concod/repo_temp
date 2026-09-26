--liquibase formatted sql
--changeset liquibase:past_plans_list_finalize runOnChange:true stripComments:false splitStatements:false context:MTP-111966 labels:MTP-111966 SP added
--comment: introduced new SP to handle finalize
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.past_plans_list_finalize(refcursor, jsonb, jsonb, jsonb, varchar, varchar, bool);


CREATE OR REPLACE FUNCTION inventory_smart.past_plans_list_finalize(input refcursor, plan_filter jsonb, plan_attributes jsonb, filter_meta jsonb, _start_date character varying, end_date character varying, check_parent_allocation boolean DEFAULT false)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_table_filters TEXT := '';
    _date_filter TEXT := '';
    _extra_conditions TEXT := '';
    _query_combine TEXT := '';
    _cache_payload JSONB := jsonb_build_object(
        'plan_attributes', plan_attributes,
        'plan_filter', plan_filter,
        'start_date', _start_date,
        'end_date', end_date
    );
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.past_plans_list_finalize';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := '{inventory_smart.plan_master, inventory_smart.plan_attributes}';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
begin
	_query_pa := inventory_smart.form_attribute_table_filters('plan_attributes', 'plan_code', plan_attributes);
	raise notice '_query_pa --> %', _query_pa;
	IF _start_date IS NOT NULL AND _start_date != '' AND end_date IS NOT NULL AND end_date != '' THEN
        _date_filter := format('AND created_at BETWEEN %L AND %L', _start_date, end_date);
    ELSE
        _date_filter := '';
        --_date_filter := ' and (created_at)::date = current_date::date';
    END IF;
    
    IF check_parent_allocation THEN
        _extra_conditions := ' AND parent_allocation IS NOT NULL';
    END IF;

    _query_pm := format(
        'SELECT 
          plan_code,
          name, 
          status, 
          type, 
          description, 
          created_at, 
          updated_at, 
          created_by, 
          updated_by 
        FROM 
          inventory_smart.plan_master
        %s %s %s and is_deleted = false',
        inventory_smart.form_main_table_filters('ph_master', plan_filter),
        _date_filter, 
        _extra_conditions
    );
   	raise notice '_query_pm --> %', _query_pm;
    _query_table_filters := inventory_smart.form_table_query(filter_meta);
    _query_combine := format($$
        SELECT
            pm.name,
            pm.status,
            pm.type,
            pm.description,
            TO_CHAR(pm.created_at AT TIME ZONE 'Pacific/Auckland', 'MM-DD-YYYY') AS created_at,
            TO_CHAR(pm.updated_at AT TIME ZONE 'Pacific/Auckland', 'MM-DD-YYYY') AS updated_at,
            um_created.name AS created_by,
            um_updated.name AS updated_by,
            pa.*
        FROM
            (%s) pm
        JOIN
            (%s) pa ON pm.plan_code = pa.plan_code
        LEFT JOIN
            global.user_master um_created ON pm.created_by = um_created.user_code
        LEFT JOIN
            global.user_master um_updated ON pm.updated_by = um_updated.user_code
        ORDER BY
            pm.created_at DESC
        $$, 
        _query_pm, 
        _query_pa
    );
    raise notice 'query combine --> %', _query_combine;
    select
      * 
    from 
      cache.wrap_sp(
        _cache_schema,
        _cache_sp, 
        _cache_payload, 
        _query_combine, 
        _cache_dependencies,
        _cache_key_pattern
      ) into _cache_table_id;
     raise notice '_cache_table_id --> %', _cache_table_id;
    perform set_config(
      'myvars.cache_table_id', _cache_table_id, 
      true
    );
    OPEN input FOR EXECUTE format('SELECT * FROM "cache"."%s" X %s', _cache_table_id, _query_table_filters);
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.past_plans_list_finalize', 'Before returing output by function','SELECT * FROM "cache"."'||_cache_table_id||'" X '||_query_table_filters , jsonb_build_object(
        'plan_filter', plan_filter,
		'plan_attributes', plan_attributes,
		'filter_meta',filter_meta,
        'start_date', _start_date,
        'end_date', end_date,
		'check_parent_allocation',check_parent_allocation
    )) ;
    RETURN input;
END
$function$
;
