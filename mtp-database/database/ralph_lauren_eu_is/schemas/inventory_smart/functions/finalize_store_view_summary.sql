--liquibase formatted sql
--changeset liquibase:finalize_store_view_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-27504
--comment: MTP-27504 - user reserve case alloacted added, MTP-61001
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: inventory_smart.store_view_summary
 * Created by: Renugopal S
 * Created at: 21-July-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 *                             $3 = Ignore allocation code
							$4 = article filter
							$5 = type
 * Purpose:
 * This function is created to calculate Store View Allocation Summary which is displayed in the
 * Finalize screen of Allocate flow
 * Calling Statement:
    begin;
    select * from inventory_smart.finalize_store_view_summary
        ('my_cur',
         '6_155_PFS_20230519T071512',
        '',
       '',
      '');
     FETCH ALL IN "my_cur";
    commit;

 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
    declare
        _query_combine text;
        _article_filter text;
        _final_inv_query text;
        _article_filter2 text;
        _created_at timestamp;
    begin
        select (created_at::date)::timestamp into _created_at from inventory_smart.plan_master pm WHERE plan_code = REPLACE($2, 'edit_', '');
      	raise notice '_created_at: %', _created_at;
        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
            _article_filter2 = format($$WHERE article IN ('%s')$$, $4);
        END IF;

        IF ($5 = 'allocated')
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT dc_code, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                    FROM (
                    	SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                    ) a
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_available_units('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING(article, dc_code)
                    GROUP BY 1
                )
                -- select * from current_allocation
                --
                ,reserve_allocation as (
                    SELECT dc_code, SUM(COALESCE(quantity,0)) user_reserve_qty
                      FROM (
                        SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                      ) am
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_reserved_units('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING (dc_code, article)
                    GROUP BY 1
                )
                ,other_allocations as (
                    SELECT dc_code, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                        	SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                        ) am
                        JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article)
                    ) a
                    GROUP BY 1
                )
                ,final_inv as (
                    SELECT dc_code::text,
                           SUM(allocated_qty) allocated_qty,
                           SUM(oh) as dc_available,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           SUM(user_reserve_qty) as user_reserve_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available
                    FROM (
                         SELECT dc_code::int,
                                SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code)
                    LEFT JOIN reserve_allocation USING (dc_code)
                    LEFT JOIN other_allocations USING (dc_code)
                    GROUP BY 1
                )
			$$;
ELSIF ($5 = 'reserved')
        THEN
			_final_inv_query := $$
                ,reserve_allocation as (
                    SELECT dc_code, SUM(COALESCE(quantity,0)) user_reserve_qty
                      FROM (
                        SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                      ) am
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_reserved_units_no_purge('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                    ) b
                    USING (dc_code, article)
                    GROUP BY 1
                )
                ,other_allocations as (
                    SELECT dc_code, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                        	SELECT article, dc_code::int FROM packs_base GROUP BY 1, 2
                        ) am
                        JOIN inventory_smart.sku_dc_allocated_units
                        USING (dc_code, article)
                    ) a
                    GROUP BY 1
                )
                ,final_inv as (
                    SELECT dc_code::text,
                           SUM(allocated_qty) allocated_qty,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           SUM(user_reserve_qty) as user_reserve_qty,
                           COALESCE(SUM(user_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available
                    FROM (
                         SELECT dc_code::int,
                                SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1
                    ) foo
                    LEFT JOIN reserve_allocation USING (dc_code)
                    LEFT JOIN other_allocations USING (dc_code)
                    GROUP BY 1
                )
			$$;
	    ELSIF ($5 = 'po')
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT pb.dc_code, SUM(spau.oh) oh
                    FROM (
                    	SELECT article, dc_code, channel FROM packs_base GROUP BY 1, 2, 3
                    ) pb
                    LEFT JOIN inventory_smart.sku_po_available_units spau
                    ON pb.article = spau.article AND pb.channel = spau.channel AND pb.dc_code = spau.po_code
                    GROUP BY 1
                )
                ,other_allocations as (
                    SELECT dc_code, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                        	SELECT article, dc_code, channel FROM packs_base GROUP BY 1, 2, 3
                        ) am
                        JOIN inventory_smart.sku_po_allocated_units
                        USING (dc_code, article, channel)
                    ) a
                    GROUP BY 1
                )
                ,final_inv as (
                    SELECT dc_code,
                           SUM(allocated_qty) allocated_qty,
                           SUM(oh) as dc_available,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available
                    FROM (
                         SELECT dc_code,
                                SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code)
                    LEFT JOIN other_allocations USING (dc_code)
                    GROUP BY 1
                )
			$$;
		ELSE
			_final_inv_query := $$
				, packs_base_grouped as (
				    select
						article,
		            	size,
		            	dc_code,
		            	pack_type_id,
		            	SUM(allocated_qty) as allocated_qty,
		            	avg(available_qty) as available_qty
					from packs_base
					group by 1,2,3,4
				)
        		,final_inv as (
        		    SELECT dc_code::text,
        		           SUM(allocated_qty) as allocated_qty,
        		           SUM(available_qty) as dc_available,
        		       	   COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available
        		    FROM (
        		        SELECT
        		            article,
        		            size,
        		            dc_code,
        		            SUM(allocated_qty) as allocated_qty,
        		            sum(available_qty) as available_qty
						FROM packs_base_grouped
						GROUP BY 1, 2, 3
        		    ) a
					GROUP BY 1
        		)
			$$;
		END IF;
        _query_combine := format($$
            ----store summary
            WITH
            -- created as (
            --             select (created_at::date)::timestamp from inventory_smart.plan_master pm
            --             WHERE plan_code = REPLACE('%1$s', 'edit_', '')
            -- )
            -- ,
            base_table as materialized (
                SELECT carfs.*, channel, store store_code, retail_size_cd size FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
                where carfs.created_at between '%4$s'::timestamp and '%5$s'::timestamp
                and allocation_code = '%1$s'
            )
            ,flat_table as (
                SELECT article,
                       store_code,
                       js.key dc_code,
                       channel,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                   	   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty
                FROM (
                    SELECT article, store_code, channel, pack_dc_allocation FROM base_table
                    %6$s
                    GROUP BY 1, 2, 3, 4
                ) foo , JSONB_EACH(pack_dc_allocation) js
            )
            ,packs AS (
                SELECT article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       size,
                       channel,
					   available_qty,
                       allocated_qty packs_allocated_qty,
                       allocated_qty * units_in_pack::double precision AS allocated_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table USING (article, pack_type_id)
            )
            ,packs_base as (
                SELECT article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       pack_type_id as size,
                       allocated_qty,
                       channel,
					   available_qty,
                       allocated_qty as packs_allocated_qty,
                       'E' as type
                FROM flat_table
                WHERE NOT (pack_type_id IN ( SELECT pack_type_id FROM packs))
                UNION
                SELECT article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       size,
                       allocated_qty,
                       channel,
					   available_qty,
                       packs_allocated_qty,
                       'S' as type
               FROM packs
            )
            ,sales_aggregate as (
        		select
	             round(sum(lw_qty), 2) lw_qty,
	             round(sum(lw_revenue)::int, 2) as lw_revenue
	             from (
					select article,
							store_code,
							avg(aid.lw_qty) as lw_qty,--avg to consider all sizes
							avg(aid.lw_revenue) as lw_revenue
					from packs_base
					left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
					group by 1, 2
				) a
	        )
       		 -- select * from sales_aggregate;
			%3$s
            ,cnt_cte as (
                SELECT COUNT(DISTINCT ( CASE WHEN allocated_total > 0 THEN article  END )) as art_cnt,
                       COUNT(DISTINCT ( CASE WHEN allocated_total > 0 THEN store_code  END )) as store_cnt
                FROM base_table
                %6$s
            )
            ,style_depth_cte as (
                SELECT AVG(art_cnt) as style_depth
                FROM (
                    SELECT store_code, COUNT(DISTINCT article) as art_cnt
                    FROM base_table
                    %6$s
                GROUP BY 1
                ) as a
            )
            ,grade_data as (
                SELECT *,
                       CASE
                           WHEN store_grade = 'B' THEN 0
                           WHEN store_grade = 'D' THEN 1
                           WHEN store_grade = 'C' THEN 2
                           WHEN store_grade = 'A' THEN 3
                           WHEN store_grade = 'AA' THEN 4
                           WHEN store_grade = 'AAA' THEN 5
                           WHEN store_grade = '-' THEN 6
                           ELSE 6
                       END AS flag
                FROM (
                    SELECT COALESCE(NULLIF(TRIM(store_grade),''''), '-') as store_grade,
                           SUM(allocated_total) as allocated_units, -- store grade level
                           COUNT(DISTINCT store_code) as stores,
                           SUM(allocated_total) / COALESCE(COUNT(DISTINCT store_code), 1) as average
                    FROM base_table
                    %6$s
                    GROUP BY 1
                ) as a
            )
            ,grade_b as (
                SELECT * FROM grade_data
                WHERE flag = (SELECT MIN(flag) FROM grade_data)
            )
            ,grade_final as (
                SELECT JSON_OBJECT_AGG(store_grade, ROUND(grade_index::numeric, 2)) grade_index,
                       JSON_OBJECT_AGG(store_grade, allocated_units) grade_allocated_units
                FROM (
                    SELECT a.*,
                           CASE WHEN b.average !=0 THEN COALESCE(a.average, 0) / COALESCE(b.average, 1)
                                ELSE 0
                           END as grade_index
                    FROM grade_data a
                    CROSS JOIN grade_b b
                ) foo
            )
            ,gender_count as (
                SELECT COUNT(DISTINCT l1_name) as gender_count
                FROM global.product_attributes_filter WHERE article IN (SELECT DISTINCT article FROM packs_base)
            )
            SELECT
                fi.dc_code,
                allocated_qty,
                lw_qty,
                lw_revenue,
                CASE WHEN fi.dc_code in ('8880', '8882', '8883', '8884', '8004')
                    THEN 0
                    ELSE net_available
                END  as net_available,
                COALESCE(dbc.name,fi.dc_code::text) as dc,
                art_cnt,
                store_cnt,
                gender_count,
                ROUND(style_depth::numeric, 2) as style_depth,
                grade_index,
                grade_allocated_units
            FROM final_inv fi
            LEFT JOIN global.distribution_centres dbc ON dbc.dc_code::text= fi.dc_code
            CROSS JOIN cnt_cte
            CROSS JOIN style_depth_cte
            CROSS JOIN grade_final
            CROSS JOIN gender_count
            cross join sales_aggregate
        $$, $2, _article_filter, _final_inv_query,_created_at,_created_at + interval '23 hours 59 minutes',_article_filter2);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
        RETURN $1;
    end
$function$
;
