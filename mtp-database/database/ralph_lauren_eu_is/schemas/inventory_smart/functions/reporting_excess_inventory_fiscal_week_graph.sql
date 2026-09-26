--liquibase formatted sql
--changeset liquibase:reporting_excess_inventory_fiscal_week_graph-fix runOnChange:true stripComments:false splitStatements:false context:MTP-75501-2,fix timeout labels:MTP-75501-2,fix timeout
--comment: MTP-75501-2,fix timeout
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inventory_fiscal_week_graph(jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inventory_fiscal_week_graph(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_inventory_fiscal_week_graph(jsonb, jsonb, jsonb)
 RETURNS TABLE(fiscal_week int2, fiscal_year int2, fiscal_year_week int4, excess_inv_sum int8, inv_sum int8, unit_sold_sum int8, excess_inv_cost_sum float8)
 LANGUAGE plpgsql
AS $function$
    declare
        _query_pa text := '';
        _query_sa text := '';
        _query_combine text:= '';
        _fiscal_year_weeks_str text := '';
    BEGIN
        _query_pa := global.form_main_table_filters(
          'product_attributes_filter',
          $1
        );
        _query_sa := global.form_main_table_filters(
          'store_attributes_filter',
          $2
        );
         _fiscal_year_weeks_str := (
            '(' || 
            string_agg(value, ', ') || 
            ')'
        ) FROM jsonb_array_elements_text($3) AS value;
        
        raise notice '%', _fiscal_year_weeks_str;
        _query_combine := $$
            SELECT
                    fiscal_week,
                    fiscal_year,
                    fiscal_year_week,
                    SUM(excess_inv) as excess_inv_sum,
                    SUM(tot_inv) as inv_sum,
                    SUM(week_qty) as unit_sold_sum,
                    ROUND(COALESCE(SUM(excess_inv_cost),0)::numeric, 2)::float8 as excess_inv_cost_sum
            FROM inventory_smart.excess_units eu
            where fiscal_year_week in $$||_fiscal_year_weeks_str||$$
            AND EXISTS
             (
                SELECT 1
                 FROM global.product_attributes_filter paf
                 $$||_query_pa||$$ and paf.article = eu.product_hierarchy
            ) 
            AND EXISTS
             (
                SELECT 1
                FROM global.store_attributes_filter saf
                 $$||_query_sa||$$ and saf.store_code = eu.store_code
            ) 
            group by fiscal_week, fiscal_year, fiscal_year_week;
            $$;
        raise notice ' %', _query_combine;
--      open $1 for execute _query_combine;
--      RETURN $1;
        RETURN QUERY EXECUTE _query_combine;
    END;
$function$
;