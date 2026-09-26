--liquibase formatted sql
--changeset tarun.tyagi:past_plans_list runOnChange:true stripComments:false splitStatements:false context:MTP-67185 labels:MTP-67185
--comment: change date to timestamp in past_plans_list
--rollback: SELECT 1
--this function is to persist all the past and new entries from plan_master, plan_attribute tables
DROP FUNCTION IF EXISTS inventory_smart.past_plans_list(
    input refcursor, 
    plan_attributes jsonb, 
    plan_filter jsonb, 
    filter_meta jsonb, 
    _start_date character varying, 
    end_date character varying, 
    check_parent_allocation boolean,
    additional_filter_config text
);
CREATE OR REPLACE FUNCTION inventory_smart.past_plans_list(
    input refcursor, 
    plan_filter jsonb, 
    plan_attributes jsonb, 
    filter_meta jsonb, 
    _start_date character varying, 
    end_date character varying, 
    check_parent_allocation boolean DEFAULT false,
    additional_filter_config jsonb DEFAULT '{}'::jsonb
)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
	timezone TEXT;
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_table_filters TEXT := '';
    _date_filter TEXT := '';
    _extra_conditions TEXT := '';
    _query_combine TEXT := '';
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _cache_payload JSONB := jsonb_build_object(
        'plan_filter', plan_filter,
        'plan_attributes', plan_attributes,
        'start_date', _start_date,
        'end_date', end_date,
        'check_parent_allocation', check_parent_allocation,
        'additional_filter_config', additional_filter_config
    );
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.past_plans_list';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := '{inventory_smart.plan_master, inventory_smart.plan_attributes}';
begin
	-- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

	_query_pa := inventory_smart.form_attribute_table_filters('plan_attributes', 'plan_code', plan_attributes);
	IF _start_date IS NOT NULL AND _start_date != '' AND end_date IS NOT NULL AND end_date != '' THEN
        _date_filter := format('AND (created_at::timestamptz AT TIME ZONE %L)::date BETWEEN %L AND %L', timezone, _start_date, end_date);
    ELSE
        _date_filter := format(' AND (created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', timezone, timezone);
    END IF;
    IF check_parent_allocation THEN
        _extra_conditions := _extra_conditions || ' AND parent_allocation IS NOT NULL';
    END IF;
    IF additional_filter_config IS NOT NULL AND additional_filter_config != '{}'::jsonb THEN
        -- this condition is added to exclude the status type pairs from the result
        IF additional_filter_config ? 'exclude_status_type_pairs' THEN
            _extra_conditions := _extra_conditions || format(' AND (status, type) NOT IN (%s)', 
                (SELECT string_agg(format('(%s, %s)', (value->>'status')::int, (value->>'type')::int), ', ') 
                 FROM jsonb_array_elements(additional_filter_config->'exclude_status_type_pairs') AS value));
        END IF;
        -- this OR condition is added to include the order batching plans for the given days
        -- this should always be added at the end of the query since it is an OR condition and should not affect the other conditions
        IF additional_filter_config ? 'include_order_batching_plans_for_days' THEN
            _extra_conditions := _extra_conditions || format(' OR (status = 2 AND created_at::timestamptz AT TIME ZONE %L >= (now() at time zone %L) - interval ''%s days'')', timezone, timezone, additional_filter_config->>'include_order_batching_plans_for_days');
        END IF;
    END IF;
    _query_pm := format(
        'SELECT 
          plan_code,
          name, 
          CASE 
            WHEN status = 0 THEN ''Draft''
            WHEN status = 1 THEN ''Created''
            WHEN status = 2 THEN ''Moved to Order Batching''
            WHEN status = 3 THEN ''Finalized''
            WHEN status = 4 THEN ''Failure''
            WHEN status = 5 THEN ''In Progress''
          END AS status, 
          description, 
		  status as plan_status,
          type,
		  created_by,
          updated_by,
		  created_at, 
          updated_at
        FROM 
          inventory_smart.plan_master
        %s 
        %s 
        and is_deleted = false
        %s
        -- second is_deleted is added in case the _extra_conditions has an OR condition then the is_deleted should be added to this clause as well
        and is_deleted = false
        ',
        inventory_smart.form_main_table_filters('ph_master', plan_filter),
        _date_filter, 
        _extra_conditions
    );
    _query_table_filters := global.form_table_query(filter_meta);
    _query_combine := format($$
        SELECT
            pm.name,
            pm.status,
            pm.plan_status,
            pm.type,
            pm.type AS plan_type,
            pm.description,
            pm.created_at AT TIME ZONE %L AS created_at,
            pm.updated_at AT TIME ZONE %L AS updated_at,
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
		timezone,
		timezone,
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
    perform set_config(
      'myvars.cache_table_id', _cache_table_id, 
      true
    );
    OPEN input FOR EXECUTE format('SELECT * FROM "cache"."%s" X %s', _cache_table_id, _query_table_filters);
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.past_plans_list', 'Before returing output by function','SELECT * FROM "cache"."'||_cache_table_id||'" X '||_query_table_filters , jsonb_build_object(
        'plan_filter', plan_filter,
		'plan_attributes', plan_attributes,
		'filter_meta',filter_meta,
        'start_date', _start_date,
        'end_date', end_date,
		'check_parent_allocation',check_parent_allocation,
		'additional_filter_config',additional_filter_config
    )) ;
    RETURN input;
END
$function$
;