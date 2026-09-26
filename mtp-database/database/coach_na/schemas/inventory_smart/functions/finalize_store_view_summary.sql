--liquibase formatted sql
--changeset liquibase:finalize_store_view_summary_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-134698 labels:MTP-134698
--comment: MTP-134698 Add allocated_stylecolor_stores KPI | inital commit for finalize_store_view_summary | MTP-100482 | MTP-130441 sku_depth_per_store
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.store_view_summary
 * Created by: Manohara Gulla
 * Created at: 20-DEC-2024
 * No of input parameter: 5
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
        _alloc_code text;
        _query text;
        _pm_date date;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
        _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $3 = '' then 
            _alloc_code := $2;	 
        else
            _alloc_code := $3;
        end if; 
        _query := format(_query, _alloc_code);
        execute _query into _pm_date;
        raise notice 'pm_date: %', _pm_date;

        IF ($4 = '') IS FALSE
        THEN
            _article_filter := format($$AND article IN ('%s')$$, $4);
        END IF;

        IF ($5 = 'allocated')
            THEN
                _final_inv_query := $$
                ,current_avail as materialized (SELECT * FROM inventory_smart.sku_dc_available_units where article is not null)
                        ,current_available as materialized (
                SELECT  a.pack_type, inventory_source, 
					case 
						when inventory_source = 'oh_oo' then sum(oh + oo)
						when inventory_source = 'oh_it' then sum(oh + it)
						when inventory_source = 'it' then sum(it)
						else sum(oh)
					end as oh
                FROM (
                        SELECT article, size, pack_type_id, dc_code, pack_type,inventory_source  FROM packs GROUP BY 1, 2, 3, 4, 5, 6
                    ) a 
                LEFT JOIN (
                    SELECT * FROM current_avail where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                USING(dc_code, article, size, pack_type_id)
                group by 1, 2
          )
--           select * from current_available;
          ,reserve_alloc as materialized (SELECT * FROM inventory_smart.sku_dc_reserved_units sdru) 
          ,reserve_allocation as materialized (
                SELECT pack_type, SUM(COALESCE(quantity,0)) user_reserve_qty 
                FROM (
                    SELECT dc_code, article, size, pack_type_id, pack_type FROM packs
                    GROUP BY 1, 2, 3, 4, 5
                ) am
                LEFT JOIN (
	                SELECT * FROM reserve_alloc where  (article, dc_code) in (SELECT article, dc_code FROM packs)
	            ) b
                USING (dc_code, article, size, pack_type_id)
                GROUP BY 1 --need more clarity
           )
--                select * from reserve_allocation;               
            ,other_allocations_dummy as materialized (
                SELECT pack_type, SUM(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, 
                           article, 
                           pack_type_id, 
                           size, 
                           pack_type, 
                           quantity as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, pack_type, units_in_pack FROM packs
                        GROUP BY 1, 2, 3, 4, 5, 6
                    ) am
                    JOIN (select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ ))b 
                    USING (dc_code, article, size, pack_type_id)
                ) a
                GROUP BY 1
            )
--               select * from other_allocations;
           ,other_allocations as materialized (
           		select * from other_allocations_dummy 
           		UNION ALL
    				SELECT 'packs' AS pack_type, 0 AS allocated_reserve_qty WHERE NOT EXISTS (SELECT * FROM other_allocations_dummy)
           )
--           select * from other_allocations;
            ,final_inv as materialized (select pack_type, coalesce (oh,0)-coalesce (allocated_reserve_qty,0)-coalesce (user_reserve_qty,0) available_qty 
                                    from current_available
                                    left join reserve_allocation using(pack_type)
                                    left join other_allocations using(pack_type)
                    )
        $$;
                    _final_inv_query := format(_final_inv_query,_alloc_code);
        ELSE
        _final_inv_query := $$
            ,final_inv as (
        		    SELECT 
                            pack_type,
        		            sum(available_qty) as available_qty
						FROM (
							select 
								article,
        		            	dc_code,
        		            	pack_type_id,
                                pack_type,
                                size,
        		            	SUM(allocated_qty) as allocated_qty,
        		            	avg(available_qty) as available_qty
							from packs
							group by 1,2,3,4,5) a
						GROUP BY 1
        		    ) 
			$$;
        END IF;
        _query_combine := format($$
            ------ store view -  summary  
            WITH base_table as materialized(
	            SELECT carfs.article,carfs.allocated_total,  carfs.pack_dc_allocation, store store_code, saf.cust_type, saf.store_name, carfs.store_grade, carfs.retail_size_cd size, carfs.inventory_source, carfs.oh  
	            from inventory_smart.create_allocation_result_flat_gurobi carfs
	            JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text 
	            WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %3$s
		)
        ,flat_table as (
		        SELECT article,
					   store_code,
                       cust_type,
					   js.key::int dc_code, 
					   store_grade,
                       size,
                       inventory_source,
					   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
					   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
					   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) pack_rounding_factor
				FROM (SELECT * FROM base_table) foo , JSONB_EACH(pack_dc_allocation) js
		)       
--        select * from flat_table;
        ,packs AS  materialized (
		        SELECT article,
		               dc_code,
		               store_code,
                       cust_type,
		               pack_type_id,
		               size,
		               pack_type,
                       inventory_source,
                       units_in_pack,
                       coalesce(pack_rounding_factor,1) as pack_rounding_factor,
		               case 
                       	when dpc.pack_type = 'packs' then allocated_qty * dpc.units_in_pack::double precision
                       	else allocated_qty
                       end as allocated_qty,      
                       case 
                       	when dpc.pack_type = 'packs' then available_qty * dpc.units_in_pack::double precision
                       	else available_qty
                       end as available_qty,		               
                       store_grade
		        FROM inventory_smart.dc_pack_configuration dpc
		        JOIN flat_table USING (article, pack_type_id, size)
    	    )
--            select * from packs;                  
		%2$s
          ,dc_allocated as (
          		select pack_type as pack_type_allocated, sum(allocated_qty) dc_allocated_qty
          		from packs 
          		group by pack_type 
          )
--          select * from dc_allocated;
          ,store_grade_allocated as (	
          		select store_grade, 
          			   sum(allocated_qty) store_grade_allocated, 
          			   round(coalesce(SUM(allocated_qty) / (SELECT NULLIF(SUM(allocated_qty),0) FROM packs),0)::numeric,4) AS store_grade_allocated_perc
          		from packs
          		group by store_grade
          )
--          select * from store_grade_allocated;
        ,cnt_cte as (
            select
                COUNT(distinct article) as art_cnt,
                COUNT(distinct (case when allocated_total > 0 then store_code end)) store_cnt,
                (select sum(oh) oh from (select store_code, oh  from base_table group by store_code, oh) a) oh    
            from
                base_table
         )
--         select * from cnt_cte;
        ,per_store_sku_cnt AS (
            SELECT
                store_code,
                COUNT(DISTINCT CASE WHEN allocated_total > 0 THEN article END) AS sku_cnt_per_store
            FROM base_table
            GROUP BY store_code
        )
        ,allocated_stylecolor_stores AS (
            SELECT
                COUNT(DISTINCT CASE WHEN allocated_total > 0 THEN (article, store_code) END) AS allocated_stylecolor_store_cnt
            FROM base_table
        )
        ,second_table as (
                SELECT  round(coalesce (count(DISTINCT store_code) / NULLIF(count(DISTINCT article), 0), 0)::numeric,2) as store_avg,
                        round(coalesce (SUM(allocated_qty) / NULLIF(count(DISTINCT store_code), 0),0)::numeric,2) as avg_units_per_store
                FROM packs
                WHERE allocated_qty > 0
        )
--        select * from second_table;
        ,cust_type_allocated as (
                SELECT
                    SUM(CASE WHEN cust_type IN ('ES Door', 'ES') THEN allocated_qty ELSE 0 END) as ecommerce_allocated_qty,
                    SUM(CASE WHEN cust_type NOT IN ('ES Door', 'ES') THEN allocated_qty ELSE 0 END) as store_allocated_qty
                FROM packs
        )
--        select * from cust_type_allocated;
        select
            art_cnt,
            store_cnt,
            allocated_stylecolor_store_cnt,
            (coalesce (available_qty,0)-dc_allocated_qty) as net_available,
            store_grade,
            store_grade_allocated,
            store_grade_allocated_perc,
            pack_type_allocated,
            dc_allocated_qty,
            store_avg,
            avg_units_per_store,
            oh,
            ecommerce_allocated_qty,
            store_allocated_qty
        from final_inv fi
        cross join cnt_cte
        cross join allocated_stylecolor_stores
        cross join store_grade_allocated
        left join dc_allocated da on fi.pack_type = da.pack_type_allocated
        cross join second_table
        cross join cust_type_allocated
		ORDER BY store_grade
       $$, $2, _final_inv_query, _article_filter);
      raise notice '%', _query_combine;
	  OPEN $1 FOR execute _query_combine;  
	  perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_store_view_summary', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Ignore allocation code',$3,'article filter',$4,'type',$5));
	  RETURN $1;
    end
$function$
;