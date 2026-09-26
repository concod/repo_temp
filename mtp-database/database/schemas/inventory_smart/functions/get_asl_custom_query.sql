--liquibase formatted sql
--changeset nibeel.yunus:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-95638 labels:MTP-95638
--comment: MTP-95638
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.get_asl_custom_query(text);
CREATE OR REPLACE FUNCTION inventory_smart.get_asl_custom_query(
    p_alloc_type text,
    p_client_config jsonb DEFAULT '{}'::jsonb
) 
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _custom_query text := '';
        _cte_list jsonb;
        _cte_name text;
        _allocation_rule text := '';
        _inventory_stock_stats text := '';

    BEGIN

        -- Get the list of CTEs for this allocation type
        _cte_list := COALESCE(
            p_client_config->'custom_ctes'->p_alloc_type,
            p_client_config->'custom_ctes'->'default',
            '[]'::jsonb
        );

        _allocation_rule := '
            ,allocation_rule as (
				select 
                    dc_store_policy.ph_code, 
                    dspur.rule_code, 
                    dspur.values as alloc_rules
				from %5$s dc_store_policy
				join inventory_smart.dc_store_policy_user_rule dspur 
				on dc_store_policy.dc_store_rule = dspur.rule_code
            )';

        _inventory_stock_stats := '
            ,inventory_stock_stats as (
                select
                    ph.ph_code,
                    ROUND(CAST(CASE WHEN sum(total_count) != 0 THEN cast(sum(in_stock_count) as float)/cast(sum(total_count) as float) else 0 end as NUMERIC) ,4) AS in_stock_perc,
                    ROUND(CAST(CASE WHEN sum(dc_instock_total_count) != 0 THEN cast(sum(dc_instock_count) as float)/cast(sum(dc_instock_total_count) as float) else 0 end as NUMERIC) * 100,2) AS dc_instock
                FROM inventory_smart.article_instock
                join %4$s ph using (article)
                group by 1
            )';

        -- Build custom query by adding CTEs based on the list
        FOR _cte_name IN SELECT jsonb_array_elements_text(_cte_list)
        LOOP
            CASE _cte_name
                WHEN 'allocation_rule' THEN
                    _custom_query := _custom_query || _allocation_rule;
                WHEN 'inventory_stock_stats' THEN
                    _custom_query := _custom_query || _inventory_stock_stats;
                -- Add more CTEs here as needed
            END CASE;
        END LOOP;

        RETURN _custom_query;

    END
 $function$
;