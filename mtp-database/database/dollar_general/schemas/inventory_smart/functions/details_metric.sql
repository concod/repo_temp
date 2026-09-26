--liquibase formatted sql
--changeset adesh:details_metric_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 dynamic KPI columns support
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, dynamic_kpi_config jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
 /*
  * 
  * Article Inventory Dashboard -SP
  * -------------------------
  * 
  * Dashboard Details table
  * 
  * Inputs :-
  * -------
  * $1 - refcursor
  * $2 - product attributes
  * $3 - store attributes
  * $4 - table - search sort limit
  * $5 - dynamic_kpi_config - array of KPI column names
  * 
  * SP Call :-
  * ---------
   	begin;
  	select * from inventory_smart.details_metric
  	    ('my_cur',
 		'{"l0_name": [{"operator": "in", "type": "list", "values": ["CHILDRENS"]}], "l1_name": [{"operator": "in", "type": "list", "values": ["BABY"]}], "article_status_tag": [{"operator": "not in", "type": "list", "values": ["Old"]}]}',
 		'{"channel": [{"operator": "in", "type": "list", "values": ["PFS"]}, {"operator": "not in", "type": "list", "values": ["WHS"]}]}',
 		'{}',
  	    '{"search": [], "sort": [], "range": [], "limit": null}');
  	 FETCH ALL IN "my_cur";
  	commit;
  */
    _query_pa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _channel text := inventory_smart.get_channel_from_input($3);
    _cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
    _cache_table_id text;
    _cache_schema text := 'inventory_smart';
    _cache_sp text := '.details_metric';
    _cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies text[] := '{inventory_smart.article_inventory_dashboard}';
    -- Dynamic KPI variables
    _dynamic_kpi_columns text := '';
    _kpi_name text;
begin
    raise notice '%', $3->>'channel';
    $2 := $2 || jsonb_build_object('channel',  $3->>'channel');
    _query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
    _query_table_filters := global.form_table_query($4);
    
    -- Build dynamic KPI columns from the passed dynamic_kpi_config parameter
    -- Expected format: ["kpi_name_1", "kpi_name_2", ...] - array of KPI names (column names)
    IF dynamic_kpi_config IS NOT NULL AND jsonb_array_length(dynamic_kpi_config) > 0 THEN
        FOR _kpi_name IN SELECT jsonb_array_elements_text(dynamic_kpi_config)
        LOOP
            _dynamic_kpi_columns := _dynamic_kpi_columns || ', ' || quote_ident(_kpi_name);
        END LOOP;
    END IF;
    raise notice 'Dynamic KPI columns --> %', _dynamic_kpi_columns;

    -- Update cache payload to include dynamic KPI config for proper cache differentiation
    _cache_payload := _cache_payload || jsonb_build_object('dynamic_kpi_config', dynamic_kpi_config);

    _query_combine := '
    WITH product_attributes AS (
        SELECT article, set_date, inner_pack_size, pdq_flag
        FROM global.product_attributes_filter
    )
    SELECT * FROM (
        SELECT 
            inv.article,
            primary_sku,
            product_description,
            l0_code,
            l0_name,
            l1_name,
            l3_name,
            l4_name,
            aat.updated_at AS last_allocated,
            coalesce(lw_revenue, 0) as lw_revenue,
            coalesce(lw_margin,0) as lw_margin,
            coalesce(promo_percentage, 0) as promo_percentage,
            coalesce(price_point, 0) as price_point,
            coalesce(dc_oh,0) as dc_oh,
            coalesce(oh, 0) as oh,
            coalesce(oo, 0) as oo,
            coalesce(it, 0) as it,
            coalesce(total_inv,0) as total_inv,
            coalesce(std_actual_st_percentage,0) as std_actual_st_percentage,
            coalesce(stockout,0) as stockout,
            coalesce(shortfall,0) as shortfall,
            coalesce(normal,0) as normal,
            coalesce(excess,0) as excess,
            stockout + shortfall + normal + excess as total,
            pa.set_date,
            pa.inner_pack_size,
            pa.pdq_flag as invalid_allocation
            ' || _dynamic_kpi_columns || '
        FROM 
            inventory_smart.article_inventory_dashboard AS inv
        LEFT JOIN
            (SELECT
                article, MAX(updated_at) AS updated_at
            FROM
                inventory_smart.article_allocation_tracker
            GROUP BY article) aat
        ON inv.article = aat.article
        LEFT JOIN
            product_attributes pa
        ON inv.article = pa.article
        ' || _query_pa || '
    ) as subquery
';
    raise notice 'query --> %',_query_combine ;
    select * from cache.wrap_sp(
        _cache_schema,
        _cache_sp,
        _cache_payload,
        _query_combine,
        _cache_dependencies,
        _cache_key_pattern) into _cache_table_id;
    _query_table_filters := global.form_table_query($4);
    perform set_config('myvars.cache_table_id', _cache_table_id, true);
    raise notice '%', _query_combine;
    open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
    RETURN $1;
end
$function$
;