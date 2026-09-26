--liquibase formatted sql
--changeset chandrashekar.s:reporting_store_daily_allocation_aggregated_data runOnChange:true stripComments:false splitStatements:false context:MTP-104544 labels:MTP-104544
--comment: Coach-specific aggregated data procedure with ES and ES Door store exclusion for total allocated quantity
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data(
    input refcursor,
    product_attributes jsonb,
    store_attributes jsonb,
    _current_date character varying
);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_aggregated_data(
    input refcursor,
    product_attributes jsonb,
    store_attributes jsonb,
    _current_date character varying
    ) RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_store_details TEXT := '';
    _query_reserve_units TEXT := '';
    _query_allocations TEXT := '';
    _query_product_details TEXT := '';
    _pm_filter TEXT := '';
    _query_combine TEXT := '';
    _channel text := inventory_smart.get_channel_from_input(store_attributes);
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    timezone TEXT;
BEGIN
    -- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

    RAISE NOTICE '%', store_attributes->>'channel';
    product_attributes := product_attributes || jsonb_build_object('channel', _channel);

    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE %L)::date = %L::date AND status = 3 AND is_deleted = false', timezone, _current_date);
    ELSE
        _pm_filter := format('WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', timezone, timezone);
    END IF;

    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);

    IF _query_pa = '' THEN
        _query_pa := 'WHERE paf.active = true';
    ELSE
        _query_pa := _query_pa || ' AND paf.active = true';
    END IF;
    IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;

    -- ES exclusion: exclude e-commerce stores (ES, ES Door) from allocated quantities
    IF TRIM(_query_sa) = 'WHERE TRUE' THEN
        _query_sa := 'WHERE cust_type NOT IN (''ES'', ''ES Door'')';
    ELSE
        _query_sa := _query_sa || ' AND cust_type NOT IN (''ES'', ''ES Door'')';
    END IF;

    RAISE NOTICE 'Product filter table --> %', _query_pa;
    RAISE NOTICE 'Store filter table --> %', _query_sa;

    _query_combine := '
        WITH plan_master AS -- (plan_code)
        (
            SELECT  distinct plan_code
                ,name
            FROM inventory_smart.plan_master
            WHERE (created_at AT TIME ZONE ' || quote_literal(timezone) || ')::date = (' || quote_literal(_current_date) || ')::date
            AND status = 3
            AND is_deleted = false 
        )
        -- SELECT * FROM plan_master;
        , product_details AS -- (article)
        (
            SELECT  DISTINCT  paf.article 
            FROM global.product_attributes_filter paf 
            ' || _query_pa || '
        )
        -- SELECT * FROM product_details;
        , store_details AS -- (store_code)
        (
            SELECT DISTINCT store_code
            FROM global.store_attributes_filter
            ' || _query_sa || '
        )
        -- SELECT * FROM store_details;
        , allocations_calc_base AS MATERIALIZED -- (allocation_code, article, size, store)
        (
            SELECT  1 AS id
                ,allocation_code
                ,article
                ,retail_size_cd
                ,store
                ,pack_dc_allocation
                ,COALESCE(allocated_total,0) AS allocated_total
                ,LEAST(COALESCE(allocated_total,0)::int,GREATEST(0,COALESCE(min,0)::int - COALESCE(updated_oh_oo_it,0)::int))                               AS min_units_allocated
                ,COALESCE(allocated_total,0) - LEAST(COALESCE(allocated_total,0)::int,GREATEST(0,COALESCE(min,0)::int - COALESCE(updated_oh_oo_it,0)::int)) AS wos_units_allocated
                ,oh
                ,oo
                ,it
            FROM inventory_smart.create_allocation_result_flat_gurobi carfg
            JOIN product_details USING (article)
            JOIN store_details ON store_details.store_code = carfg.store
            WHERE created_at >= (' || quote_literal(_current_date) || '::date - INTERVAL ''1 day'')
            AND created_at <= (' || quote_literal(_current_date) || '::date + INTERVAL ''1 day'')
            AND allocation_code IN ( SELECT plan_code FROM plan_master) 
        )
        -- SELECT * FROM allocations_calc_base;
        , flat_allocation AS -- (allocation_code, article, store, dc_code, pack_type_id)
        (
            SELECT  allocation_code
                ,article
                ,store
                ,js.key AS dc_code
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated'')::text,''[]'',''{}''))::text[]) pack_type_id
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated_qty'')::text,''[]'',''{}''))::numeric[]) packs_allocated_qty
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_available_qty'')::text,''[]'',''{}''))::numeric[]) packs_available_qty
            FROM allocations_calc_base, jsonb_each
            (allocations_calc_base.pack_dc_allocation
            ) AS js
            GROUP BY  1
                    ,2
                    ,3
                    ,4
                    ,5
                    ,6
                    ,7
        )
        -- SELECT * FROM flat_allocation;
        , eaches_and_packs AS -- (allocation_code, article, store, dc_code, pack_type_id, pack_type, size?)
        (
            SELECT  fa.allocation_code
                ,fa.article
                ,fa.store
                ,fa.dc_code
                ,fa.pack_type_id
                ,CASE WHEN dpc.units_in_pack IS NULL THEN ''eaches'' ELSE ''packs'' END AS pack_type
                ,packs_available_qty * COALESCE(dpc.units_in_pack,1)                    AS available_qty
                ,packs_allocated_qty * COALESCE(dpc.units_in_pack,1)                    AS allocated_qty
            FROM flat_allocation fa
            -- LEFT JOIN ensure we retain both eaches AND packs
            LEFT JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id)
        )
        -- SELECT * FROM eaches_and_packs;
        , dc_metrics AS 
        (
            SELECT 1 AS id
                ,SUM(available_qty) AS available_qty
                ,SUM(allocated_qty) AS allocated_qty
            FROM 
            (
                SELECT  article
                    ,pack_type_id
                    ,dc_code
                    ,MAX(available_qty) AS available_qty
                    ,SUM(allocated_qty) AS allocated_qty
                FROM eaches_and_packs
                GROUP BY pack_type_id, article, dc_code
            ) x
            GROUP BY 1
        )
        , allocation_metrics AS 
        (
            SELECT  1 as id
                ,COUNT(distinct article) AS style_color_count
                ,COUNT(distinct allocation_code) AS allocation_count
            FROM allocations_calc_base
        )
        , allocation_totals AS
        (
            SELECT 1 AS id
                ,SUM(COALESCE(allocated_total,0)) AS unit_allocated
            FROM allocations_calc_base
        )
        SELECT  id
            ,allocation_count
            ,style_color_count
            ,at.unit_allocated
            ,available_qty
            -- below 0 is the placeholder for reserve units
            ,available_qty - at.unit_allocated - 0 AS dc_available
        FROM allocation_metrics
        JOIN dc_metrics USING (id)
        JOIN allocation_totals at USING (id);
    ';
    
    RAISE NOTICE 'query combine --> %', _query_combine;

    OPEN input FOR EXECUTE _query_combine;
    perform  global.sp_log(v_gen_random_uuid,'inventory_smart.reporting_store_daily_allocation_aggregated_data', 'Before RETURN',_query_combine,jsonb_build_object('product_attributes', $2, 'store_attributes', $3, '_current_date',$4));
    RETURN input;
END
$function$
;
