--liquibase formatted sql
--changeset karish:user_reserve_and_instock_list runOnChange:true stripComments:false splitStatements:false context:MTP-71177 labelsMTP-71177
--comment: MTP-71177 added style_name
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb, jsonb, boolean, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb, jsonb, boolean, boolean) 
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text := '';
    _channel text := inventory_smart.get_channel_from_input($2);
    _query_pa text := global.form_main_table_filters('product_attributes_filter', $2);
    _query_sa text := global.form_main_table_filters('store_attributes_filter', $3);
    _query_table_filters text := '';
    _unique_key jsonb;
    _product_attr jsonb; 
    _unique_clause text := '';
    _filter_having text;
    _ph_sort text;
    _ph_search text;
    _overall_search text;
    _limit int := 0;
    _offset int;
BEGIN
    SELECT $2 - 'unique_key' INTO _product_attr;
    SELECT $2->'unique_key' INTO _unique_key;

    _unique_key := json_build_object('unique_key', _unique_key);

    RAISE NOTICE '%', _unique_key;

    _query_pa := global.form_main_table_filters('product_attributes_filter', _product_attr);
    _unique_clause := global.form_main_table_filters('product_attributes_filter', _unique_key);
    _unique_clause := replace(_unique_clause, 'unique_key', 'CONCAT(product_code, ''|'', dc_code, ''|'', channel)');

    SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;

    _query_table_filters := _overall_search || replace(global.form_table_query($4), 'WHERE', 'AND');

    IF _unique_clause != '' THEN
        _unique_clause := replace(_unique_clause, 'WHERE', 'AND');
    END IF;

    _query_combine := '
        WITH product_attributes_filter AS (
            SELECT * FROM global.product_attributes_filter ' || _query_pa || _ph_search || ' AND active
        ),
        sku_dc_available AS (
            SELECT sdau.*, dc_name
            FROM inventory_smart.sku_dc_available_units(''{}'', (SELECT ARRAY_AGG(article) FROM product_attributes_filter)) sdau
            JOIN (SELECT dc_code, name AS dc_name FROM "global".distribution_centres) dc USING (dc_code)
            ' || _query_sa || ' AND oh > 0
        ),
        user_reserve_type_u AS (
            SELECT
                product_code,
                type,
                dc_code, 
                channel,
                reservation_till_date,
                instock_inclusion,
                comment,
                drq.updated_by,
                drq.updated_at,
                SUM(quantity) AS user_reserve
            FROM
                inventory_smart.dc_reserve_quantity drq
            JOIN global.distribution_centres dc USING (dc_code)
            JOIN product_attributes_filter paf USING (product_code)
            WHERE dc.is_active AND type = ''U''
            GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
        ),
        user_reserve_type_esn AS (
            SELECT 
                product_code,
                dc_code,
                channel,
                COALESCE(SUM(CASE WHEN type = ''E'' THEN quantity ELSE 0 END), 0) AS ecom_reserve,
                COALESCE(SUM(CASE WHEN type = ''S'' THEN quantity ELSE 0 END), 0) AS system_reserve,
                COALESCE(SUM(CASE WHEN type = ''N'' THEN quantity ELSE 0 END), 0) AS new_store_reserve
            FROM (
                SELECT
                    product_code,
                    channel,
                    type,
                    dc_code, 
                    SUM(quantity) AS quantity
                FROM
                    inventory_smart.dc_reserve_quantity drq
                JOIN global.distribution_centres dc USING (dc_code)
                JOIN product_attributes_filter paf USING (product_code)
                WHERE dc.is_active AND type != ''U''
                GROUP BY 1, 2, 3, 4
            ) x
            GROUP BY 1, 2, 3
        ),
        po AS (
            SELECT 
                product_code, 
                dc_code,
                SUM(CASE WHEN (not_before_date > current_date + 1 AND not_before_date < current_date + interval ''30'' day) THEN allocated_qty ELSE 0 END) AS po_oo_next_30_days,
                SUM(CASE WHEN (not_before_date > current_date + 31 AND not_before_date < current_date + interval ''60'' day) THEN allocated_qty ELSE 0 END) AS po_oo_next_60_days,
                SUM(CASE WHEN (not_before_date > current_date + 61 AND not_before_date < current_date + interval ''90'' day) THEN allocated_qty ELSE 0 END) AS po_oo_next_90_days
            FROM inventory_smart.po_master pm
            GROUP BY 1, 2
        )
        ,coalesce_result AS (
            SELECT
                CONCAT(product_code, ''|'', dc_code, ''|'', channel) AS unique_key,
                product_code,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.style_name,
                paf.article,
                paf.size,
                channel,
                oh AS dc_oh,
                it,
                oo,
                COALESCE(ecom_reserve, 0) as ecom_reserve,
                COALESCE(system_reserve, 0) as system_reserve,
                COALESCE(new_store_reserve, 0) as new_store_reserve,
                nsr.reservation_date,
                COALESCE(po_oo_next_30_days, 0) AS po_oo_next_30_days,
                COALESCE(po_oo_next_60_days, 0) AS po_oo_next_60_days,
                COALESCE(po_oo_next_90_days, 0) AS po_oo_next_90_days,
                COALESCE(user_reserve, 0) as user_reserve,
                ur.reservation_till_date,
                ur.instock_inclusion,
                dc_code,
                dc_name,
                paf.product_description,
                COALESCE(u.name, ''-'') AS updated_by,
                ur.updated_at,
                COALESCE(comment, ''-'') as comment
            FROM product_attributes_filter paf
            LEFT JOIN sku_dc_available foo USING (product_code, article, size)
            LEFT JOIN user_reserve_type_u ur USING (product_code, dc_code, channel)
            LEFT JOIN user_reserve_type_esn uresn USING (product_code, dc_code, channel)
            LEFT JOIN global.user_master u ON ur.updated_by::int = u.user_code
            LEFT JOIN (SELECT product_code, MAX(reservation_date) AS reservation_date FROM global.new_store_reserve GROUP BY 1) nsr USING (product_code)
            LEFT JOIN po USING (product_code, dc_code)
            WHERE ur.user_reserve > 0 OR oh > 0
        )
        ,final_result as (
          select 
          	*, 
          	COALESCE((dc_oh - (ecom_reserve + system_reserve + new_store_reserve + user_reserve)), 0) AS net_available,
            COALESCE((dc_oh - (ecom_reserve + system_reserve + new_store_reserve)), 0) AS net_available_without_user_reserve,
        		COALESCE(ROUND((CASE WHEN (dc_oh - (ecom_reserve + system_reserve + new_store_reserve)) = 0 THEN 0 ELSE (user_reserve / (dc_oh - (ecom_reserve + system_reserve + new_store_reserve)) * 100.0) END), 2), 0) AS user_reserve_percentage,
            COALESCE((ecom_reserve + system_reserve + new_store_reserve + user_reserve), 0) AS total_units_reserved          
          from coalesce_result
          order by unique_key
        )
        SELECT * FROM final_result WHERE TRUE '
        || _unique_clause || _query_table_filters;

    RAISE NOTICE '%', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;
    RETURN _query_combine;
END;
$function$
;