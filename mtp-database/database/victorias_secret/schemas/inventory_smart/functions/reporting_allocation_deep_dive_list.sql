--liquibase formatted sql
--changeset suba:19470-opt runOnChange:true stripComments:false splitStatements:false context:code-cleanup-2 labels:liquibase_project_start
--comment: Code cleanup-2
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_allocation_deep_dive_list(input refcursor, jsonb, jsonb, date, date, text);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_allocation_deep_dive_list(input refcursor, jsonb, jsonb, date, date, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    declare
        _query_pa text := '';
        _query_sa text := '';
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
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin         
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
    
        _query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
                SELECT * FROM global.product_attributes_filter {pa_filter} {pa_search}
                {limit_final}
			) sq
        $$;
        _query_combine_format := $$
            WITH paf as (
                SELECT * FROM global.product_attributes_filter
                {pa_filter} {pa_search}
                {limit_final}
            )
            , allocation as (
                SELECT * FROM inventory_smart.create_allocation_result_flat_gurobi
                WHERE allocation_code IN (
                    SELECT plan_code from inventory_smart.plan_master pm WHERE ((pm.updated_at AT TIME ZONE 'EST')::date BETWEEN '{start_date}' AND '{end_date}') and status = 3
                    AND EXISTS (SELECT * FROM inventory_smart.plan_attributes WHERE plan_code = pm.plan_code and attribute_name = 'parent_allocation')
                )
            )
            , allocation_filtered as (
                SELECT * FROM allocation
                WHERE article IN (SELECT article FROM paf)
                    AND store IN (SELECT store_code FROM global.store_attributes_filter {sa_filter} {sa_search})
            )
            , flat1 AS MATERIALIZED (
                SELECT allocation_code, article, store, max_supression_flag, oh_oo_intransit, max, min,
                       js.key::int dc_code, 
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty
                FROM allocation_filtered,  JSONB_EACH(pack_dc_allocation) js
                GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
            )
            ,flat AS MATERIALIZED (
                SELECT *, ROW_NUMBER () OVER () as sub_offset
				FROM flat1
                WHERE (article, size) IN (SELECT article, size FROM paf)
                {sub_limit_final}
            )
            ,store_priorities as (
                SELECT plan_code, store_code, dc_data.key::int dc_code, dc_data.value::text as priority_code
                FROM (
                    SELECT plan_code, store_data.key as store_code, store_data.value::json as dc_data
                    FROM inventory_smart.plan_attributes a, JSON_EACH_TEXT((a.attribute_value::JSON)->'store_priorities') as store_data
                    WHERE plan_code IN (SELECT allocation_code FROM flat) AND attribute_name = 'store_level_data'
                ) dc, JSON_EACH_TEXT(dc_data) as dc_data
            )
            ,result as (
                SELECT 
					{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					sub_offset,
                    um.name as updated_by,
                    TO_CHAR(pm.updated_at AT TIME ZONE 'EST', 'YYYY-MM-DD HH:MI:SS') AS updated_at,
                    pm.plan_code,
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
                    paf.size,
                    size_name,
                    saf.retail_facility_code,
                    saf.store_name,
                    COALESCE(sp.priority_code, CASE WHEN saf.channel = 'RLS' THEN 'R' ELSE 'S' END) priority_code,
                    dc.retail_facility_code dc_code,
                    available_qty,
                    current_available,
                    allocated_qty,
                    paf.brand,
                    'RESERVED' merch_status_desc,
                    vendor_case_pack,
                    pfs_season_id,
                    pfs_season,
					dtc_season,
					max_supression_flag,
					oh_oo_intransit,
					max,
                    min,
                    paf.upc,
                    paf.sku,
                    concat(pm.plan_code, paf.article, paf.size, dc.retail_facility_code) key
                FROM flat
                LEFT JOIN inventory_smart.plan_master pm on pm.plan_code = flat.allocation_code
                LEFT JOIN (SELECT * FROM global.product_attributes_filter {pa_filter} {pa_search} ) paf on paf.article = flat.article and paf.size = flat.size
                LEFT JOIN global.store_attributes_filter saf on saf.store_code = flat.store
                LEFT JOIN store_priorities sp on sp.plan_code = flat.allocation_code and sp.dc_code = flat.dc_code and sp.store_code = flat.store
                LEFT JOIN (
                    SELECT product_code, sum(oh) current_available
                    FROM inventory_smart.latest_inventory li 
                    WHERE product_code IN (SELECT product_code FROM global.product_attributes_filter {pa_filter} {pa_search} AND article IN (SELECT article FROM flat))
                        AND li.store_code IN (SELECT linked_store_code FROM global.distribution_centres)
                    GROUP BY 1
                ) au on au.product_code = paf.product_code
                LEFT JOIN (
                    SELECT dc_code, retail_facility_code
                    FROM global.store_attributes_filter
                    WHERE dc_code in (select dc_code from flat)
                ) dc on flat.dc_code = dc.dc_code
                left join global.user_master um on (um.user_code = pm.updated_by)
                ORDER BY sub_offset
            )
            SELECT {select} FROM result
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
            'start_date', $4,
            'end_date', $5
        );
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_allocation_deep_dive_list', 'Before _formatter ',_query_combine_format,jsonb_build_object('$2', $2, '$3', $3,'$4', $4,'$5', $5,'$6', $6));	
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_allocation_deep_dive_list', 'Before _query_combine_format',_query_combine_count_format,jsonb_build_object('$2', $2, '$3', $3,'$4', $4,'$5', $5,'$6', $6));	
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_allocation_deep_dive_list', 'Before Return',_formatter,jsonb_build_object('$2', $2, '$3', $3,'$4', $4,'$5', $5,'$6', $6));
        RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;

