--liquibase formatted sql
--changeset adesh.kumar@impactanalytics.co:user_reserve_and_instock_list_pack_generic_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-106365 labels:MTP-106365
--comment: MTP-106365:generic-implementation-for-pack-based-clients
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list_pack(refcursor, jsonb, jsonb, jsonb, text, boolean, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.user_reserve_and_instock_list_pack(
    input refcursor, 
    product_attributes jsonb, 
    store_attributes jsonb, 
    table_filters jsonb,
    additional_columns text DEFAULT '',
    user_reserve_flag boolean DEFAULT true,
    allocated_reserve_flag boolean DEFAULT true
)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: inventory_smart.user_reserve_and_instock_list_pack
  * Created by: Adesh Kumar
  * Created at: 2025-10-10
  * Purpose: Generic function for pack-based user reserve and instock list
  * 
  * This function handles the common pack-based pattern used by:
  * - Carters (additional_columns: '')
  * - Cracker Barrel (additional_columns: 'primary_trait_desc, l5_name')
  * - Coach NA (additional_columns: 'l5_name, l6_name, l7_name, l8_name, factory_type, assortment_indicator, article_orig')
  * - VS (additional_columns: '', user_reserve_flag: true, allocated_reserve_flag: true)
  * - VS International (additional_columns: '', user_reserve_flag: true, allocated_reserve_flag: true)
  * 
  * Parameters:
  *   - additional_columns: text (default: '') - All columns to include in SELECT from product_attributes_filter
  *   - user_reserve_flag: boolean (default: true) - Include user reserve data
  *   - allocated_reserve_flag: boolean (default: true) - Include allocated reserve data
  * 
  * For Pack-based implementations 
  */
 	declare
 	_query_combine text := '';
 	_channel text := inventory_smart.get_channel_from_input($2);
 	_query_pa text := global.form_main_table_filters('product_attributes_filter', $2);
 	_query_table_filters text := '';
 	_unique_key jsonb;
 	_product_attr jsonb;
 	_unique_clause text := '';
 	_filter_having text;
    _filter_where text;
    _ph_sort text;
    _ph_search text;
    _overall_search text;
    _limit int := 0;
    _offset int;
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    
BEGIN

 	SELECT $2 - 'unique_key' INTO _product_attr;
 	SELECT $2->'unique_key' INTO _unique_key;

    _unique_key := json_build_object('unique_key', _unique_key);

    _query_pa := global.form_main_table_filters('product_attributes_filter', _product_attr);
    _unique_clause := global.form_main_table_filters('product_attributes_filter', _unique_key);
    _unique_clause := replace(_unique_clause, 'unique_key', 'CONCAT(article::text, ''|'', dc_code::text, ''|'', pack_type_id::text)');
    
    SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
    _query_table_filters := _overall_search || replace(global.form_table_query($4), 'WHERE', 'AND');
    
    IF _unique_clause != '' THEN
        _unique_clause := replace(_unique_clause, 'WHERE', 'AND');
    END IF;
    -- Build the dynamic SQL
    _query_combine := '
    WITH product_attributes_filter AS (
        SELECT 
            article,
            product_code,
            product_description,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name'
            || CASE WHEN additional_columns IS NOT NULL AND additional_columns <> '' THEN
                ', ' || additional_columns
            ELSE '' END || '
        FROM "global".product_attributes_filter
        ' || _query_pa || ' ' || _ph_search || '
    ),
    results AS (
        SELECT
            dc.dc_code,
            dc.dc_code_display,
            sdav.channel,
            CONCAT(paf.article, ''|'', dc.dc_code, ''|'', sdav.pack_type_id) AS unique_key,
            paf.product_description,
            paf.article,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            sdav.pack_type_id,
            CASE
                WHEN sdav.pack_type = ''packs'' THEN ''MIX''
                ELSE sdav.size
            END AS size,
            ur.incoming_po_30,
            ur.incoming_po_31_60,
            ur.incoming_po_61_90,
            sdav.oh_packs AS dc_oh,
            COALESCE(ur.quantity, 0) AS user_reserve,
            COALESCE(sdau.packs_allocated, 0) AS allocated_reserve,
            COALESCE(ur.quantity, 0) + COALESCE(sdau.packs_allocated, 0) AS total_units_reserved,
            sdav.oh_packs - COALESCE(sdau.packs_allocated, 0) AS dc_available,
            sdav.oh_packs - COALESCE(sdau.packs_allocated, 0) - COALESCE(ur.quantity, 0) AS net_dc_available,
            ROUND(
                CASE
                    WHEN (COALESCE(sdav.oh_packs,0) - COALESCE(sdau.packs_allocated,0)) = 0
                    THEN 0
                    ELSE (COALESCE(ur.quantity,0) / (sdav.oh_packs - COALESCE(sdau.packs_allocated,0)) * 100.0)::NUMERIC
                END,
                2
            ) AS user_reserve_percentage,
            ur.reservation_till_date,
            (
                SELECT STRING_AGG(user_name, '','')
                FROM "global".user_master um
                WHERE um.user_code = ur.updated_by::INT
            ) AS updated_by,
    TO_CHAR(ur.created_at AT TIME ZONE ''' || inventory_smart.get_tenant_timezone() || ''', ''yyyy-mm-dd hh:mi:ss'') AS updated_at,
            ur.comment'
            || CASE WHEN additional_columns IS NOT NULL AND additional_columns <> '' THEN
                ', ' || additional_columns
            ELSE '' END || ',
            SUM(sdav.units_in_pack) AS units_in_pack
        FROM product_attributes_filter paf
        LEFT JOIN inventory_smart.sku_dc_available_units sdav
            ON paf.product_code = sdav.product_code
        LEFT JOIN inventory_smart.sku_dc_allocated_units sdau
            ON sdav.article = sdau.article
            AND sdav.size = sdau.size
            AND sdav.dc_code = sdau.dc_code
            AND sdav.channel = sdau.channel
        LEFT JOIN (
            SELECT
                dc_code,
                REPLACE(linked_store_code, ''_dc'', '''') AS dc_code_display
            FROM "global".distribution_centres
        ) dc
            ON sdav.dc_code = dc.dc_code
        LEFT JOIN (
            SELECT
                pack_type_id,
                dc_code,
                channel,
                quantity,
                updated_by,
                created_at,
                comment,
                reservation_till_date,
                incoming_po_30,
                incoming_po_31_60,
                incoming_po_61_90
            FROM inventory_smart.dc_pack_reserve_quantity
        ) ur
            ON sdav.pack_type_id = ur.pack_type_id
            AND sdav.channel = ur.channel
            AND sdav.dc_code = ur.dc_code
        WHERE ur.quantity > 0 OR sdav.oh_packs > 0
        GROUP BY
            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28'
            || CASE WHEN additional_columns IS NOT NULL AND additional_columns <> '' THEN
                ', ' || REPLACE(additional_columns, ',', ', ')
            ELSE '' END || '
    )
    SELECT DISTINCT * FROM results WHERE TRUE '||_unique_clause ||_query_table_filters;

    -- Debug
    RAISE NOTICE 'Final Query: %', _query_combine;

    open $1 for execute _query_combine;
    perform global.sp_log(v_gen_random_uuid, 'inventory_smart.user_reserve_and_instock_list_pack', 'Before Return',_query_combine,jsonb_build_object('$2', $2, '$3', $3, '$4', $4, '$5', $5));	
    RETURN $1;
END;
$function$
;
