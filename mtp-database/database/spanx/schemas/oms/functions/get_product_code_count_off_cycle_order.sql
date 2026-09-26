--liquibase formatted sql
--changeset nikhil.dhoot:get_product_code_count_off_cycle_order runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-116711
--comment: Get count of distinct product codes for off-cycle orders
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_product_code_count_off_cycle_order(input refcursor, article_loc_mapping jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_product_code_count_off_cycle_order(input refcursor, article_loc_mapping jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
    Returns count of distinct product_code for products that are:
    - Required for ordering (status = 'required for ordering')
    - Match the article and loc_code combinations provided in article_loc_mapping
    
    Expected format: article_loc_mapping = '[{"article": "ART1", "loc_code": "DC1"}, {"article": "ART2", "loc_code": "DC2"}]'
    
    SELECT * FROM inventory_smart.get_product_code_count_off_cycle_order('result', '[{"article": "ART1", "loc_code": "DC1"}]'::jsonb);
    FETCH ALL FROM result;
*/
DECLARE
    v_query text := '';
    v_article_loc_mapping jsonb := article_loc_mapping;
BEGIN
    v_query := '
    WITH article_loc_input AS (
        SELECT 
            (elem::jsonb->>''article'')::varchar AS article,
            (elem::jsonb->>''loc_code'')::varchar AS loc_code
        FROM jsonb_array_elements(' || quote_literal(v_article_loc_mapping::text) || '::jsonb) AS elem
    )
    SELECT COUNT(DISTINCT pm.product_code) AS product_code_count
    FROM 
        global.product_master pm
    JOIN 
        global.product_attributes_filter paf
        ON pm.product_code = paf.product_code
    JOIN 
        article_loc_input ali
        ON paf.article = ali.article
    JOIN 
        inventory_smart.oms_constraints_status rs 
        ON pm.product_code = rs.product_code
    JOIN 
        global.product_dc_mapping pdm 
        ON pm.product_code = pdm.product_code
    WHERE 
        rs.status = ''required for ordering''
    ';
    RAISE NOTICE 'v_query= %', v_query;
    OPEN input FOR EXECUTE v_query;
    RETURN input;
END;
$function$
;

