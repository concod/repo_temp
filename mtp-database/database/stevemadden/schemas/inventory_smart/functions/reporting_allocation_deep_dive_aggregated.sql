--liquibase formatted sql
--changeset liquibase:reporting_allocation_deep_dive_aggregated runOnChange:true stripComments:false splitStatements:false context:MTP-19470 labels:liquibase_project_start
--comment: MTP-19470
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_allocation_deep_dive_aggregated(input refcursor, jsonb, jsonb, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_allocation_deep_dive_aggregated(input refcursor, jsonb, jsonb, date, date, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    declare
        _query_pa text := '';
        _query_sa text := '';
        _query_table_filters text := '';
        _query_combine text := '';
        _client_columns text;

        _query_combine_format text := '';
        _query_combine_count_format text := '';
        _query_combine_count text := '';
        _count int := 1;
        _batch_count int := 0;
        _ph_sort text ;
        _ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
        _sub_limit int;
        _sub_offset int;
    begin         
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
        _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
    
        _query_combine_format := $$
			WITH allocation_unit_sales AS (
				    SELECT 
				    	COALESCE(SUM(carfg.allocated_total), 0) AS allocated_total,
						COALESCE(COUNT(DISTINCT carfg.allocation_code), 0)  AS total_allocation_code 
                    FROM inventory_smart.create_allocation_result_flat_gurobi carfg
                    WHERE article in (SELECT article FROM global.product_attributes_filter %1$s %9$s)
                        AND store in (SELECT store_code FROM global.store_attributes_filter %2$s)
                        AND allocation_code in (SELECT plan_code from inventory_smart.plan_master pm WHERE ((pm.updated_at AT TIME ZONE 'EST')::date BETWEEN '%3$s' AND '%4$s') and status = 3)
                        AND allocated_total > 0 and pack_dc_allocation != '{}'
				)
			SELECT * FROM allocation_unit_sales
        $$;
        _query_combine = format(_query_combine_format, _query_pa, _query_sa, $4, $5, _limit, _offset, _sub_limit, _sub_offset, _ph_search, '*');    
        OPEN $1 FOR EXECUTE _query_combine ;
        RETURN $1;
    end
$function$
;
