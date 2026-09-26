--liquibase formatted sql
--changeset karthikeswar.saravanana@impactanalytics.co:past_plans_list runOnChange:true stripComments:false splitStatements:false context:MTP-99893 labels:MTP-99893
--comment: MTP-99893
--rollback: SELECT 1
--this function is to persist all the past and new entries from plan_master, plan_attribute tables, fix issues
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
    _gurobi_date_filter TEXT := '';
    _extra_conditions TEXT := '';
    _query_combine TEXT := '';
    _query_recent_plans TEXT := '';
    _has_exclude_pairs BOOLEAN := false;
    _has_include_batching BOOLEAN := false;
    _exclude_pairs_condition TEXT := '';
    _exclude_pairs_status_type_pairs TEXT := '';
    _include_batching_days TEXT := '';
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
    _cache_dependencies TEXT[] := '{inventory_smart.plan_master, inventory_smart.plan_attributes, inventory_smart.create_allocation_result_flat_gurobi}';
    _tz_start_date date;
    _tz_end_date date;
    _tz_current_date date;
begin
	-- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

    -- Precalculate timezone-adjusted dates for partition pruning
    _tz_current_date := (now() at time zone timezone)::date;

    IF _start_date IS NOT NULL AND _start_date != '' AND end_date IS NOT NULL AND end_date != '' THEN
        -- Convert string dates to date objects with timezone applied
        _tz_start_date := (_start_date::date - INTERVAL '1 day');
        _tz_end_date := (end_date::date + INTERVAL '1 day');

        _date_filter := format('AND (created_at::timestamptz AT TIME ZONE %L)::date BETWEEN %L AND %L',
                              timezone, _start_date, end_date);

        -- Use precalculated dates directly for the gurobi query
        _gurobi_date_filter := format('carfg.created_at >= %s AND carfg.created_at < %s',
                                     quote_literal(_tz_start_date), quote_literal(_tz_end_date));
    ELSE
        -- For current date, expand by one day in each direction
        _tz_start_date := (_tz_current_date - INTERVAL '1 day');
        _tz_end_date := (_tz_current_date + INTERVAL '1 day');

        _date_filter := format(' AND (created_at::timestamptz AT TIME ZONE %L)::date = %L',
                              timezone, _tz_current_date);

        -- Use precalculated dates directly for the gurobi query
        _gurobi_date_filter := format('carfg.created_at >= %s AND carfg.created_at < %s',
                                     quote_literal(_tz_start_date), quote_literal(_tz_end_date));
    END IF;

	_query_pa := inventory_smart.form_attribute_table_filters('plan_attributes', 'plan_code', plan_attributes);

    IF check_parent_allocation THEN
        _extra_conditions := _extra_conditions || ' AND parent_allocation IS NOT NULL';
    END IF;

    -- Process filter conditions but now separate the exclude pairs and include batching logic
    IF additional_filter_config IS NOT NULL AND additional_filter_config != '{}'::jsonb THEN
        -- Check if we need to exclude status-type pairs
        IF additional_filter_config ? 'exclude_status_type_pairs' THEN
            _has_exclude_pairs := true;
            -- Extract pairs only once and store in a variable
            SELECT string_agg(format('(%s, %s)',
                   (value->>'status')::int,
                   (value->>'type')::int), ', ')
            INTO _exclude_pairs_status_type_pairs
            FROM jsonb_array_elements(additional_filter_config->'exclude_status_type_pairs');

            _exclude_pairs_condition := format(' AND (status, type) NOT IN (%s)', _exclude_pairs_status_type_pairs);
            _extra_conditions := _extra_conditions || _exclude_pairs_condition;
        END IF;

        -- Check if we need to include recent order batching plans
        IF additional_filter_config ? 'include_order_batching_plans_for_days' THEN
            _has_include_batching := true;
            -- Extract days value once
            _include_batching_days := additional_filter_config->>'include_order_batching_plans_for_days';
        END IF;
    END IF;

    -- Build main query for regular plans
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
        AND is_deleted = false
        %s
        ',
        inventory_smart.form_main_table_filters('ph_master', plan_filter),
        _date_filter,
        _extra_conditions
    );

    -- If we need to include recent order batching plans, build that query separately
    IF _has_include_batching THEN
        _query_recent_plans := format(
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
            WHERE
              status = 2
              AND created_at::timestamptz AT TIME ZONE %L >= (now() at time zone %L) - interval ''%s days''
              AND is_deleted = false
            ',
            timezone,
            timezone,
            _include_batching_days
        );

        -- Combine the two queries with UNION
        _query_pm := format(
            'WITH main_plans AS (%s),
            recent_batching_plans AS (%s)
            SELECT * FROM main_plans
            UNION
            SELECT * FROM recent_batching_plans',
            _query_pm,
            _query_recent_plans
        );
    END IF;

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
            pa.*,
            pa2.total_allocated_qty as sort_total_allocated_key,
            pa3.inventory_source as _inventory_source,
            pa4.no_allocated_articles as _no_allocated_articles,
            pa5.no_stores_allocated as _no_stores_allocated,
            pa6.article as _article
        FROM
            (%s) pm
        JOIN
            (%s) pa ON pm.plan_code = pa.plan_code
        LEFT JOIN
			(select plan_code, attribute_value::numeric::integer as total_allocated_qty from inventory_smart.plan_attributes where attribute_name = 'total_allocated_qty') pa2 on pm.plan_code = pa2.plan_code
		LEFT JOIN
			(select plan_code, (attribute_value::varchar[])[1] as inventory_source from inventory_smart.plan_attributes where attribute_name = 'inventory_source') pa3 on pm.plan_code = pa3.plan_code
		LEFT JOIN
			(select plan_code, attribute_value::numeric::integer as no_allocated_articles from inventory_smart.plan_attributes where attribute_name = 'no_allocated_articles') pa4 on pm.plan_code = pa4.plan_code
		LEFT JOIN
			(select plan_code, attribute_value::numeric::integer as no_stores_allocated from inventory_smart.plan_attributes where attribute_name = 'no_stores_allocated') pa5 on pm.plan_code = pa5.plan_code
		LEFT JOIN
			(select plan_code, attribute_value::varchar[] as article from inventory_smart.plan_attributes where attribute_name = 'article') pa6 on pm.plan_code = pa6.plan_code
        LEFT JOIN
            global.user_master um_created ON pm.created_by = um_created.user_code
        LEFT JOIN
            global.user_master um_updated ON pm.updated_by = um_updated.user_code
        ORDER BY
            sort_total_allocated_key desc,
            pm.created_at
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