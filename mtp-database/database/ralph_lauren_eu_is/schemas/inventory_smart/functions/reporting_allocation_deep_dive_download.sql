--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:change date format runOnChange:true stripComments:false splitStatements:false context:MTP-95887 labels:MTP-95887
--comment:MTP-95887
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_allocation_deep_dive_download(input refcursor, jsonb, jsonb, date, date, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_allocation_deep_dive_download(input refcursor, jsonb, jsonb, date, date, text, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    declare
        _query_pa text := '';
        _query_sa text := '';
        _query_min_max_date_and_allocation_plan_codes_format text := '';
        _query_combine_format text := '';
        _query_combine_count_format text := '';
        _ph_sort text ;
        _ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
        _sub_limit int;
        _sub_offset int;
        _dummy text;
        _sa_search text;
        _formatter jsonb;
        _plan_codes_formatter jsonb;
        _query_filter text := '';
        json_key text := '';
        json_value text := '';
        filter_key text := '';
        filter_value text := '';
        _allocation_type_filter text := '';
        _min_created_at timestamp;
        _max_created_at timestamp;
        _allocation_plan_codes varchar[];
        _allocation_plan_codes_str text := '';
    begin
        SELECT * FROM inventory_smart.form_search_sort_clause($7, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
        SELECT * FROM inventory_smart.form_search_sort_clause($7, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);

        RAISE NOTICE 'Test-Start';
        IF $6 != '' THEN
            _allocation_type_filter = 'AND pm.type in ' || $6;
       END IF;
        FOR json_key, json_value IN SELECT * FROM jsonb_each($7) LOOP
            IF json_key = 'custom_filters' then
                FOR filter_key, filter_value in SELECT * FROM jsonb_each_text(json_value::jsonb) loop
                    _query_filter = _query_filter || ' AND ' || filter_value;
                    RAISE NOTICE 'filter_key: %, filter_value: %', filter_key, filter_value;
                end LOOP;
                EXIT;
            end if;
        END LOOP;
        RAISE NOTICE '_query_filter: %', _query_filter;
        RAISE NOTICE 'Test-END';

        _query_min_max_date_and_allocation_plan_codes_format := $$
            SELECT
                (min(created_at)::date)::timestamp,
                (max(created_at)::date)::timestamp + interval '23 hours 59 minutes',
                array_agg(pa.plan_code)
            from inventory_smart.plan_master pm
            join (SELECT * FROM inventory_smart.plan_attributes WHERE attribute_name = 'parent_allocation') pa
                on pm.plan_code = pa.plan_code
            WHERE ((pm.updated_at AT TIME ZONE 'UTC')::date BETWEEN '{start_date}' AND '{end_date}') and status = 3 {_allocation_type_filter}
        $$;
        _plan_codes_formatter = json_build_object(
            'start_date', $4,
            'end_date', $5,
            '_allocation_type_filter', _allocation_type_filter
        );
        execute inventory_smart.format_with_json(_query_min_max_date_and_allocation_plan_codes_format, _plan_codes_formatter)
        into _min_created_at, _max_created_at, _allocation_plan_codes;

        if cardinality(_allocation_plan_codes) > 0 then
            _allocation_plan_codes_str := '{' || array_to_string(_allocation_plan_codes::varchar[], ',') || '}';
        ELSE
            _allocation_plan_codes_str := '{}';
        END IF;

        RAISE NOTICE 'Min created at: %, Max created at: %, Allocation Plan codes: %', _min_created_at, _max_created_at, _allocation_plan_codes;
        _query_combine_count_format := $$
            SELECT COUNT(*)
            FROM
            (
                SELECT * FROM global.product_attributes_filter {pa_filter} {pa_search}
                {limit_final}
            ) sq
        $$;
        _query_combine_format := $$
            WITH
            product_status_mapping AS (
                SELECT
                    plan_code,
                    json_array_elements(pa.attribute_value::json)->>'product_code' AS product_code,
                    json_array_elements(pa.attribute_value::json)->>'status_tag' AS status_tag
                FROM inventory_smart.plan_attributes pa
                WHERE pa.plan_code = any('{_allocation_plan_codes}'::varchar[])
                AND pa.attribute_name = 'product_status_mapping'
            )
            ,allocation as (
                select
                allocation_code, article, store, pack_dc_allocation,retail_size_cd, pack_dc_allocation_original, round(original_forecast) as original_forecast, allocated_total, inventory_source,
                case
                       when original_forecast > max then max
                       when original_forecast < min then min
                       else original_forecast
                   end as constrained_demand_initial,
                max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag
                FROM inventory_smart.create_allocation_result_flat_gurobi
                where created_at between '{_min_created_at}' and '{_max_created_at}'
                and allocation_code = any('{_allocation_plan_codes}'::varchar[])
                and allocated_total > 0
                {query_filter}
            )
           ,paf1 as materialized (
                 SELECT
                l0_id,
                    l0_name,
                    l1_id,
                    l1_name,
                    l2_id,
                    l2_name,
                    l3_id,
                    l3_name,
                    l4_id,
                    l4_name,
                    color_id_og,
                    color_name_og,
                    style_og,
                    item_desc_og,
                    style_color_id_og,
                    size,
                    size_name,
                    season,
                    article,
                    product_code,
                    vendor,
                    brand,
                    vendor_case_pack,
                    upc,
                    sku,
                    model_description,
                    supersede_flag
                FROM global.product_attributes_filter
                {pa_filter} {pa_search}
                and upc is NOT NULL
                AND article IN (SELECT article FROM allocation)
                and (active and (not is_deleted))
            )
            ,allocation_filtered as (
                SELECT *, retail_size_cd size FROM allocation
                WHERE article IN (SELECT article FROM paf1)
                    AND store IN (SELECT store_code FROM global.store_attributes_filter {sa_filter} {sa_search} )
            )
            ,flat1 AS MATERIALIZED (
                SELECT allocation_code, article, store,
                       js.key dc_code,
                       inventory_source,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
                       UNNEST((TRANSLATE((ac.value::json->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_total_orig
                FROM allocation_filtered,  JSONB_EACH(pack_dc_allocation) js, JSONB_EACH(COALESCE(pack_dc_allocation_original::jsonb, pack_dc_allocation)) ac
                GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
            )
            ,flat as (
                SELECT flat1.*,max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag, original_forecast, allocated_total,
                   case when constrained_demand_initial - oh_oo_intransit < 0 then 0 else round(constrained_demand_initial - oh_oo_intransit) end as constrained_demand
                FROM flat1
                LEFT JOIN allocation_filtered USING(allocation_code, article, store, size)
            )
            ,store_priorities as (
                 select
                   plan_code,
                   article,
                   dc_data.key store_code,
                   (
                     json_each_text(dc_data.value :: json)
                   ).key as dc_code,
                   (
                     json_each_text(dc_data.value :: json)
                   ).value as priority_code
                 from
                   (
                     select
                       plan_code,
                       product_store_data.key as article,
                       product_store_data.value :: json as store_code,
                       product_store_data.value :: json as dc_data
                     from
                       inventory_smart.plan_attributes a,
                       JSON_EACH_TEXT(
                         (a.attribute_value :: JSON)-> 'product_store_priorities'
                       ) as product_store_data
                     where
                       plan_code in (
                         select
                           distinct allocation_code
                         from
                           allocation
                       )
                       and attribute_name = 'product_level_data'
                   ) dc,
                   JSON_EACH_TEXT(dc_data) as dc_data
               )
            ,result as (
                SELECT
                    um.name as updated_by,
                    TO_CHAR(
                        CASE
                            WHEN (
                                EXTRACT(MONTH FROM pm.updated_at) BETWEEN 3 AND 11
                                and
                                date_trunc('week',
                                    date_trunc('month', CONCAT(EXTRACT(YEAR FROM pm.updated_at), '-03-01')::date ) + interval '1 week' + interval '5 days'
                                )::date <= pm.updated_at
                                and
                                (date_trunc('week',
                                    date_trunc('month', CONCAT(EXTRACT(YEAR FROM pm.updated_at), '-11-01')::date ) + interval '5 days'
                                )::date - INTERVAL '1 day') >= pm.updated_at
                            )
                            THEN
                                (pm.updated_at AT TIME ZONE '$$ || inventory_smart.get_tenant_timezone() || $$' + INTERVAL '1 hour')
                            ELSE
                                (pm.updated_at AT TIME ZONE '$$ || inventory_smart.get_tenant_timezone() || $$')
                        end, 'DD-MM-YYYY HH24:MI:SS'
                    ) AS updated_at,
                    pm.plan_code,
                    inventory_source,
                    l1_id,
                    l1_name,
                    l2_id,
                    l2_name,
                    l3_id,
                    l3_name,
                    l4_id,
                    l4_name,
                    vendor,
                    color_id_og,
                    color_name_og,
                    style_og,
                    item_desc_og,
                    paf.article,
                    style_color_id_og,
                    ''''||paf.size as size,
                    size_name,
                    saf.retail_facility_code,
                    saf.store_name,
                    model_description,
                    COALESCE(sp.priority_code, coalesce(pcc.priority_code, '')) priority_code,
                    COALESCE(dc.retail_facility_code, flat.dc_code::character varying) dc_code,
                    available_qty,
                    CASE WHEN flat.dc_code in ('8880', '8882', '8883', '8884', '8004')
                        THEN 0
                        ELSE available_qty - allocated_qty
                    END AS current_available,
                    allocated_qty,
                    paf.brand,
                    CASE WHEN flat.dc_code in ('8880', '8882', '8883', '8884', '8004')
                        THEN 'Placeholder'
                        ELSE 'RESERVED'
                   END  AS merch_status_desc,
                    vendor_case_pack,
                    (case when vendor_case_pack='NO INFO' then 1 else vendor_case_pack::int end) case_pack_qty,
                    season,
                    max_supression_flag,
                    coalesce(oh_oo_intransit, 0) as oh_oo_intransit,
                    coalesce(max, 0) as max,
                    coalesce(min, 0) as min,
                    original_forecast,
                    constrained_demand,
                    case
                       when constrained_demand > allocated_total then 'DC Inventory Constrained'
                       else '-'
                    end as order_rejection_reason,
                    CASE
                        WHEN pm.type = '1' THEN 'Manual Allocation'
                        WHEN pm.type = '2' THEN 'Auto Allocation - Review and Release'
                        WHEN pm.type = '3' THEN 'Auto Allocation - Auto Release'
                        WHEN pm.type = '4' THEN 'PO'
                        WHEN pm.type = '5' THEN 'Uploaded Allocation'
                        WHEN pm.type = '6' THEN 'New Store Manual Allocation'
                        WHEN pm.type = '7' THEN 'New Store Auto Allocation'
                        ELSE 'Draft plan'
                    end as allocation_type,
                    allocated_total_orig,
                    is_edited,
                    min_influenced_allocation,
                    paf.upc,
                    paf.sku,
                    ssd.wos_predicted,
                    unedited_max,
                    unedited_min,
                    paf.supersede_flag,
                    status_tag,
                    concat(pm.plan_code, paf.article, paf.size, dc.retail_facility_code) key
                FROM flat
                LEFT JOIN inventory_smart.plan_master pm on pm.plan_code = flat.allocation_code
                left join paf1 paf on paf.article = flat.article and paf.size = flat.size
                left join product_status_mapping psm on psm.plan_code=pm.plan_code and paf.product_code=psm.product_code
                LEFT JOIN global.store_attributes_filter saf on saf.store_code = flat.store
                LEFT JOIN store_priorities sp on sp.plan_code = flat.allocation_code and sp.dc_code = flat.dc_code and sp.store_code = flat.store and sp.article = flat.article
                LEFT JOIN (
                    SELECT dc_code::text, retail_facility_code
                    FROM global.store_attributes_filter
                    WHERE dc_code::text in (select dc_code from flat)
                ) dc on flat.dc_code = dc.dc_code
                left join global.user_master um on (um.user_code = pm.updated_by)
                left join inventory_smart.store_stock_drilldown ssd on md5(
                     ssd.store_code || '-' || ssd.article || '-' || ssd.product_code
                   ) = (
                     saf.store_code || '-' || paf.article || '-' || paf.product_code
                   )
                left join inventory_smart.priority_code_configuration pcc on pcc.article = flat.article and pcc.store_code = saf.store_code
                ORDER BY article, retail_facility_code, size_name
            )
            SELECT * FROM result where allocated_qty > 0
        $$;

        _formatter = json_build_object(
            'pa_filter', _query_pa,
            'sa_filter', _query_sa,
            'pa_search', _ph_search,
            'sa_search', _sa_search,
            'limit', _limit,
            'sub_limit', _sub_limit,
            'offset', _offset,
            'sub_offset', _sub_offset,
            '_min_created_at', _min_created_at,
            '_max_created_at', _max_created_at,
            'query_filter', _query_filter,
            '_allocation_plan_codes', _allocation_plan_codes_str
        );

        RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;