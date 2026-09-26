--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_get_target_currency_ids runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: function to get all possible target currency ids based on source currencies

DROP FUNCTION IF EXISTS price_promo.fn_get_target_currency_ids;
CREATE OR REPLACE FUNCTION price_promo.fn_get_target_currency_ids(
    p_source_currency_ids integer[]  
)
RETURNS TABLE (
    target_currency_id integer,
    priority_number integer
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY 
        WITH source_currencies AS (
            SELECT DISTINCT unnest(p_source_currency_ids) as source_currency_id
        ),
        target_matches AS (
            SELECT 
                tcp.target_currency_id,
                MIN(tcp.priority_number) as priority_number
            FROM source_currencies sc
            JOIN global.tb_currency_priority tcp 
                ON sc.source_currency_id = tcp.source_currency_id
            GROUP BY tcp.target_currency_id
            HAVING COUNT(DISTINCT sc.source_currency_id) = (SELECT COUNT(*) FROM source_currencies)
        )
        SELECT 
            tm.target_currency_id,
            tm.priority_number
        FROM target_matches tm
        ORDER BY tm.priority_number;

END;
$function$;