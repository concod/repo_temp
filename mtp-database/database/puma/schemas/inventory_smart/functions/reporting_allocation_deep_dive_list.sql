--liquibase formatted sql
--changeset liquibase:reporting_allocation_deep_dive_list runOnChange:true stripComments:false splitStatements:false context:MTP-19470 labels:liquibase_project_start
--comment: MTP-19470
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_allocation_deep_dive_list(input refcursor, jsonb, jsonb, date, date, text);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_allocation_deep_dive_list(input refcursor, jsonb, jsonb, date, date, jsonb)
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
        -- _query_pa := _query_pa || _ph_search || _ph_sort || ' LIMIT %2$s OFFSET %1$s ';
        -- _query_sa := global.form_main_table_filters('store_attributes_filter', $3);
    
    
        _query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
				SELECT *
            	FROM inventory_smart.create_allocation_result_flat_gurobi
            	WHERE article in (SELECT article FROM global.product_attributes_filter %1$s %9$s)
            	    AND store in (SELECT store_code FROM global.store_attributes_filter %2$s)
            	      AND allocation_code in (SELECT plan_code from inventory_smart.plan_master pm WHERE ((pm.updated_at AT TIME ZONE 'EST')::date BETWEEN '%3$s' AND '%4$s') and status = 3)
            	    -- and (created_at AT TIME ZONE 'EST')::date between '2023-06-20' and '2023-06-22'
            	    AND allocated_total > 0 and pack_dc_allocation != '{}'
            	ORDER BY created_at, allocation_code, article, store
            	LIMIT %5$s OFFSET %6$s
			) sq
        $$;
        _query_combine_format := $$
            WITH flat1 AS MATERIALIZED (
                SELECT allocation_code, article, store store_code,
                       js.key::int dc_code, 
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty
                FROM (
                    SELECT *
                    FROM inventory_smart.create_allocation_result_flat_gurobi
                    WHERE article in (SELECT article FROM global.product_attributes_filter %1$s %9$s)
                        AND store in (SELECT store_code FROM global.store_attributes_filter %2$s)
                          AND allocation_code in (SELECT plan_code from inventory_smart.plan_master pm WHERE ((pm.updated_at AT TIME ZONE 'EST')::date BETWEEN '%3$s' AND '%4$s') and status = 3)
                        -- and (created_at AT TIME ZONE 'EST')::date between '2023-06-20' and '2023-06-22'
                        AND allocated_total > 0 and pack_dc_allocation != '{}'
                    ORDER BY created_at, allocation_code, article, store
                    LIMIT %5$s OFFSET %6$s
                ) sq,  JSONB_EACH(pack_dc_allocation) js
                GROUP BY 1, 2, 3, 4, 5, 6, 7
            )
            ,flat AS MATERIALIZED (
                SELECT *, ROW_NUMBER () OVER () as sub_offset
				FROM flat1
                LIMIT %7$s OFFSET %8$s
            )
            ,result as (
                SELECT 
					%5$s "limit",
					%6$s "offset",
					%7$s sub_limit,
					sub_offset,
					l0_name,
					l1_name,
					l2_name,
					l5_name,
					article,
					color,
					channel,
					size,
					saf.store_code,
					saf.store_id,
					saf.store_name,
					product_description,
					asg.grade,
					0 unit_sales,
					allocated_qty allocated_total
                FROM flat
                LEFT JOIN (
					SELECT article, l0_name, l1_name, l2_name, l5_name, color, size, product_description
					FROM global.product_attributes_filter WHERE article IN (SELECT DISTINCT article FROM flat)
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
				) paf using(article, size)
                LEFT JOIN global.store_attributes_filter saf using(store_code)
 				LEFT JOIN inventory_smart.article_store_grade asg using (store_code, article)
                ORDER BY sub_offset
            )
            SELECT %10$s FROM result
        $$;
        WHILE _count > 0 AND _batch_count = 0 loop
            _query_combine = format(_query_combine_format, _query_pa, _query_sa, $4, $5, _limit, _offset, _sub_limit, _sub_offset, _ph_search, '*');    
			raise notice '%', _query_combine;
            OPEN $1 FOR EXECUTE _query_combine ;
            EXECUTE format(_query_combine_format, _query_pa, _query_sa, $4, $5, _limit, _offset, _sub_limit, _sub_offset, _ph_search, 'COUNT(*)') into _batch_count;
            IF _batch_count = 0 THEN
            	_query_combine_count = format(_query_combine_count_format, _query_pa, _query_sa, $4, $5, _limit, _offset, _sub_limit, _sub_offset, _ph_search, '*');    
                EXECUTE _query_combine_count INTO _count;
            END IF;
            _offset := _offset + _limit;
            _limit := _limit + _limit;
            IF _batch_count = 0 AND _count > 0 THEN CLOSE $1; END IF;
        END LOOP;
        RETURN $1;
    end
$function$
;
