--liquibase formatted sql
--changeset liquibase:estimate_user_reserve_and_instock_list_download runOnChange:true stripComments:false splitStatements:false context:MTP-MTP-94820 ,MTP-95045
--comment: MTP-94820 - FIX TO HANDLE RETAIL_REGION FOR APAC ,MTP-95045
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_user_reserve_and_instock_list_download(input refcursor, jsonb, jsonb, jsonb, boolean, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_user_reserve_and_instock_list_download(input refcursor, jsonb, jsonb, jsonb, boolean, boolean)
	RETURNS refcursor
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
    _user_reserve boolean := $5;
    _allocated_reserve boolean := $6;
	_filter_having text;
    _filter_where text;
    _ph_sort text ;
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
    _unique_clause := replace(_unique_clause, 'unique_key', 'CONCAT(product_code, ''|'', dc_code, ''|'', channel, ''|'', pack_type_id)');

    SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;

	IF _user_reserve THEN
        _filter_where := 'AND user_reserve > 0 ';
    ELSE
        _filter_where := '';
    END IF;

    IF _allocated_reserve THEN
        _filter_where := _filter_where || 'AND allocated_reserve > 0';
    END IF;

    IF _limit != 0 THEN
        _query_table_filters =  _overall_search || global.form_table_query($4);
    END IF;

    IF _unique_clause != '' THEN
        _unique_clause := replace(_unique_clause, 'WHERE', 'AND');
    END IF;

    _query_combine := '
        WITH product_attributes_filter AS (
            SELECT * FROM global.product_attributes_filter ' || _query_pa || _ph_search || ' AND active
        ),
        results AS (
            SELECT
                paf.product_code,
                foo.dc_code,
                dc_name,
                foo.channel,
                CONCAT(paf.product_code, ''|'', foo.dc_code, ''|'', foo.channel) AS unique_key,
                foo.type,
                paf.product_description,
                paf.model_description,
                paf.article,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.size,
                paf.style_color_id,
				paf.brand,
                oh AS dc_oh,
                COALESCE(ur.quantity, 0) AS total_units_reserved,
                COALESCE(ur.quantity, 0) AS user_reserve,
                COALESCE(sdau.quantity, 0) AS allocated_reserve,
                oh - COALESCE(sdau.quantity, 0) AS dc_available,
                oh - COALESCE(sdau.quantity, 0) - COALESCE(ur.quantity, 0) AS net_available,
                ROUND(
                    CASE WHEN (oh - COALESCE(sdau.quantity, 0)) = 0
                    THEN 0
                    ELSE (COALESCE(ur.quantity, 0) / (oh - COALESCE(sdau.quantity, 0)) * 100.0)::NUMERIC
                    END,
                    2
                ) AS user_reserve_percentage,
                reservation_till_date,
                (select string_agg(user_name, '','') from "global".user_master um where um.user_code = any(ur.updated_by)) updated_by,
                TO_CHAR(ur.created_at AT TIME ZONE ''' || inventory_smart.get_tenant_timezone() || ''', ''mm-dd-yyyy hh:mi:ss'') AS updated_at,
                comment
            FROM product_attributes_filter paf
            LEFT JOIN (
                SELECT sdau.*, dc_name
                FROM inventory_smart.sku_dc_available_units(''{}'', (SELECT ARRAY_AGG(article) FROM product_attributes_filter)) sdau
                JOIN (SELECT dc_code, dc_name FROM "global".store_attributes_filter ' || _query_sa || ' AND special_classification = ''WHS'' ) dc USING (dc_code)
                 WHERE oh > 0
            ) foo USING(product_code, article, size)
            LEFT JOIN inventory_smart.sku_dc_allocated_units sdau USING(article, size, dc_code, channel)
            LEFT JOIN (
                SELECT
                    product_code,
                    dc_code,
                    channel,
                    ARRAY_AGG(DISTINCT updated_by::float::int) AS updated_by,
                    MAX(created_at) AS created_at,
                    SUM(quantity) AS quantity,
                    STRING_AGG(DISTINCT comment, '','') AS comment,
                    MIN(reservation_till_date) AS reservation_till_date
                FROM inventory_smart.dc_reserve_quantity
                GROUP BY 1, 2, 3
            ) ur on (ur.product_code = paf.product_code and ur.dc_code = foo.dc_code and ur.channel = foo.channel)
            WHERE ur.quantity>0 or oh>0
        )
        SELECT count(*) as total_count FROM results WHERE TRUE ' 
        ||_unique_clause || _filter_where ||_query_table_filters;

    RAISE NOTICE '%', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;
    RETURN $1;
END;
$function$
;