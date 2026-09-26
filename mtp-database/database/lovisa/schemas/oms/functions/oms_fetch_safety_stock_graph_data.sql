--liquibase formatted sql
--changeset charan.reddy:fetch_safety_stock_graph_data runOnChange:true stripComments:false splitStatements:false context:MTP-95046 labels:oms_fetch_safety_stock_graph_data
--comment: Function to fetch safety stock graph data based on service level coefficients
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_fetch_safety_stock_graph_data(refcursor, varchar, varchar);

CREATE OR REPLACE FUNCTION inventory_smart.oms_fetch_safety_stock_graph_data(
    p_cursor refcursor,
    p_article varchar,
    p_loc_code varchar
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
/*
    * Function: inventory_smart.oms_fetch_safety_stock_graph_data
 * Purpose: Fetch safety stock graph data based on service level coefficients
 * Parameters:
 *   p_article (varchar): The article code to filter by
 *   p_loc_code (varchar): The location code to filter by
 * Returns: refcursor containing service_level and safety_stock columns
 * 
 * Usage:
 *   SELECT inventory_smart.oms_fetch_safety_stock_graph_data('my_cursor', 'ARTICLE_CODE', 'LOC_CODE');
 *   FETCH ALL FROM my_cursor;
 */
DECLARE
    v_query text;
begin
    RAISE NOTICE 'Executing safety stock graph data query with parameters: p_article=%, p_loc_code=%', p_article, p_loc_code;
    
    v_query := format('
        SELECT 
            osc.service_level,
            osc.coeff * (
                SELECT COALESCE(SUM(ok.ss_base), 0) 
                FROM inventory_smart.oms_kpi ok
                JOIN (
                    SELECT DISTINCT l4_name 
                    FROM global.product_attributes_filter 
                    WHERE ordering = ''Y'' 
                    AND l4_name = %L
                ) paf1 on ok.product_code = paf1.l4_name
                WHERE ok.loc_code = %L
            ) AS safety_stock  
        FROM inventory_smart.oms_sl_coeff osc
        ORDER BY osc.service_level
    ', p_article, p_loc_code);
    
    RAISE NOTICE 'SQL Query: %', v_query;
    
    OPEN p_cursor FOR EXECUTE v_query;
    RETURN p_cursor;
end
$function$;
