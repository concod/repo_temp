--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_constraints_lead_time_update_9 runOnChange:true stripComments:false splitStatements:false context:MTP-109382 commit:MTP-109382
--comment: added style_name to the query
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_lead_time(input refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_lead_time(
    input refcursor, 
    jsonb, 
    jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $function$
/*
 * Function: get_oms_constraints_lead_time
 * Purpose: Retrieves lead time constraints for OMS with filtering and pagination
 * 
 * Parameters:
 *   $1: Refcursor - Cursor for returning results
 *   $2: Product Filter - JSON filter for product attributes
 *   $3: Meta JSON - Pagination and sorting configuration
 * 
 * Returns: SQL query string for debugging purposes
 * 
 * Usage Example:
 *   SELECT * FROM inventory_smart.get_oms_constraints_lead_time(
 *       'my_cur',
 *       '{
 *           "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
 *           "l1_name": [],
 *           "l2_name": [],
 *           "product_description": [],
 *           "planning_ownership": [],
 *           "merchandise_category": [],
 *           "merchandise_brand": [],
 *           "product_channel_name": [],
 *           "vendor_code": [],
 *           "vendor_name": []
 *       }',
 *       '{
 *           "search": [],
 *           "sort": [],
 *           "range": [],
 *           "limit": {
 *               "limit": 10,
 *               "page": 2
 *           }
 *       }'
 *   );
 *   FETCH ALL IN "my_cur";
 */
DECLARE
    -- Variable declarations
    _query_pa                   text := '';
    _query_order                text := '';
    v_constraints_leadtime_sql  text := '';
    v_gen_random_uuid           text := gen_random_uuid()::varchar;
    
BEGIN
    -- Build product attribute filters
    _query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
    
    -- Build ordering and pagination query
    _query_order := global.form_table_query($3);
    _query_order := REPLACE(_query_order, 'article', 'oclt.article');

    -- Construct the main SQL query
    v_constraints_leadtime_sql := '
        SELECT
            oclt.id,
            paf.article,
            paf.style_name,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.vendor_desc,
            oclt.loc_code,
            oclt.vendor_code,
            COALESCE(oclt.po_to_order_processing, 1) as po_to_order_processing,
            oclt.lead_time,
            oclt.mode_shipment as shipment_mode,
            COALESCE(oclt.default_mode, ''1'') as default_mode,
            um.name AS updated_by,
            oclt.updated_at
        FROM
            inventory_smart.oms_constraints_lead_time oclt
            LEFT JOIN global.user_master um 
                ON oclt.updated_by = um.user_code
            LEFT JOIN global.user_master um2 
                ON oclt.created_by = um2.user_code
            INNER JOIN (
                SELECT
                    article,
                    style_name,
                    l0_name,
                    l1_name,
                    l2_name,
                    l3_name,
                    vendor_desc
                FROM
                    "global".product_attributes_filter ' || _query_pa || ' 
                AND active = true
                AND ordering = ''Y''
                GROUP BY 
                    1, 2, 3, 4, 5, 6, 7
            ) paf ON oclt.article = paf.article
        ' || _query_order || '';
    
    -- Debug logging
    RAISE NOTICE 'v_constraints_leadtime_sql %', v_constraints_leadtime_sql;
    
    -- Execute query and open cursor
    OPEN $1 FOR EXECUTE v_constraints_leadtime_sql;
    
    -- Log function execution
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'inventory_smart.get_oms_constraints_lead_time', 
        'Before Return',
        v_constraints_leadtime_sql,
        jsonb_build_object(
            'product_filter', $2, 
            'Meta JSON for pagination', $3
        )
    ); 
    
    -- Return SQL for debugging
    RETURN v_constraints_leadtime_sql;
    
END
$function$;
