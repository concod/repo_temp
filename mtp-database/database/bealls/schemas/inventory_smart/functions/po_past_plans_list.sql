--liquibase formatted sql
--changeset karthikeswar.saravanana@impactanalytics.co:po_past_plans_list runOnChange:true stripComments:false splitStatements:false context:MTP-99893 labels:MTP-99893
--comment: MTP-99893
--rollback: SELECT 1
--this function is to persist all the past and new entries from plan_master, plan_attribute tables, added no_allocated_products
DROP FUNCTION IF EXISTS inventory_smart.po_past_plans_list(
    input refcursor,
    plan_attributes jsonb,
    plan_filter jsonb,
    filter_meta jsonb,
    _start_date character varying,
    end_date character varying
);
CREATE OR REPLACE FUNCTION inventory_smart.po_past_plans_list(
    input refcursor,
    plan_filter jsonb,
    plan_attributes jsonb,
    filter_meta jsonb,
    _start_date character varying,
    end_date character varying
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
    _query_combine TEXT := '';
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _cache_payload JSONB := jsonb_build_object(
        'plan_filter', plan_filter,
        'plan_attributes', plan_attributes,
        'start_date', _start_date,
        'end_date', end_date
    );
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.po_past_plans_list';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := '{inventory_smart.plan_master, inventory_smart.plan_attributes, inventory_smart.create_allocation_result_flat_gurobi, inventory_smart.po_master}';
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
    ELSE
        -- For current date, expand by one day in each direction
        _tz_start_date := (_tz_current_date - INTERVAL '1 day');
        _tz_end_date := (_tz_current_date + INTERVAL '1 day');

        _date_filter := format(' AND (created_at::timestamptz AT TIME ZONE %L)::date = %L',
                              timezone, _tz_current_date);

    END IF;

	_query_pa := inventory_smart.form_attribute_table_filters('plan_attributes', 'plan_code', plan_attributes);

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
        ',
        inventory_smart.form_main_table_filters('ph_master', plan_filter),
        _date_filter
    );
    _query_table_filters := global.form_table_query(filter_meta);
    _query_combine := format($$
        SELECT
            pm.name,
            pm.plan_code as allocation_code,
            pom.po_id,
            pom.receipt_id,
            pa2.no_allocated_articles,
            pa3.no_stores_allocated,
            pa4.total_allocated_qty,
            pom.method_of_allocation,
            pom.no_allocated_products,
            pm.created_at AT TIME ZONE %L AS created_at,
            um_created.name AS created_by,
            pm.updated_at AT TIME ZONE %L AS updated_at
        FROM
            (%s) pm
        JOIN
            (%s) pa ON pm.plan_code = pa.plan_code
        LEFT JOIN
        ( select po_id, receipt_id, max(method_of_allocation) as method_of_allocation, count(distinct product_code) as no_allocated_products from inventory_smart.po_master group by po_id, receipt_id) pom on pom.po_id = split_part(pm.plan_code , '_', 3) and pom.receipt_id = split_part(pm.plan_code , '_', 4)
        LEFT JOIN
			(select plan_code, attribute_value::numeric::integer as no_allocated_articles from inventory_smart.plan_attributes where attribute_name = 'no_allocated_articles') pa2 on pm.plan_code = pa2.plan_code
        LEFT JOIN
			(select plan_code, attribute_value::numeric::integer as no_stores_allocated from inventory_smart.plan_attributes where attribute_name = 'no_stores_allocated') pa3 on pm.plan_code = pa3.plan_code
        LEFT JOIN
			(select plan_code, attribute_value::numeric::integer as total_allocated_qty from inventory_smart.plan_attributes where attribute_name = 'total_allocated_qty') pa4 on pm.plan_code = pa4.plan_code
        LEFT JOIN
            global.user_master um_created ON pm.created_by = um_created.user_code
        LEFT JOIN
            global.user_master um_updated ON pm.updated_by = um_updated.user_code
        ORDER BY
            pa4.total_allocated_qty desc,
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
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.po_past_plans_list', 'Before returing output by function','SELECT * FROM "cache"."'||_cache_table_id||'" X '||_query_table_filters , jsonb_build_object(
        'plan_filter', plan_filter,
		'plan_attributes', plan_attributes,
		'filter_meta',filter_meta,
        'start_date', _start_date,
        'end_date', end_date
    )) ;
    RETURN input;
END
$function$
;