--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_get_promos_finalized_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_promos_finalized_stack

DROP FUNCTION if exists price_promo_opt.fn_get_promos_finalized_stack;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_promos_finalized_stack(p_promo_id integer)
 RETURNS TABLE(stackable_type_return text, promo_id_return integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY

    SELECT
        stackable_type AS stackable_type_return,
        
stacked_promo_id AS promo_id_return
    
FROM price_promo.fn_get_promo_stacked_offers_util(p_promo_id, false)  -- false → include drafts
    
WHERE start_date > current_date  -- keep future promos
   
ORDER BY 1 DESC;
END;
$function$
;

