--liquibase formatted sql
--changeset liquibase:finalize_product_view_summary_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-134698 labels:MTP-134698
--comment: MTP-134698 Add allocated_stylecolor_stores KPI | MTP-82613 Add article filter for summary | MTP-89138 | reserved units improvement | MTP-97620 | reserve quantiy multiple revert | MTP-102176 | OB changes | MTP-130441 allocated_stores_per_style_color
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view_summary(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
   * Function/Procedure name: inventory_smart.product_view_summary
   * Created by: Manohara Gulla
   * Created at: 20-DEC-2024
   * No of input parameter: 5
   * Parameter Description : $1 = Application name
   *                         $2 = Allocation Code
  *                          $3 = Ignore allocation code
                             $4 = article filter
                             $5 = type
   * Purpose: 
   * This function is created to calculate Store View Allocation Summary which is displayed in the 
   * Finalize screen of Allocate flow
   * Calling Statement:
   *
      begin;
      select * from inventory_smart.finalize_product_view_summary
          ('my_cur',
           '6_155_PFS_20230519T071512',
           '',
          '',
         'allocated');
       FETCH ALL IN "my_cur";
      commit;
   *
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
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _pm_date date;
    _query text;
    _alloc_code text;
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
	_article_filter := '';
	IF ($4 = '') IS FALSE
        THEN
            _article_filter := format($$ AND article IN ('%s')$$, $4);
	END IF;
    IF ($5 = 'allocated')
            THEN
                _final_inv_query := $$
                    ,current_available as (
                    SELECT dc_code, size, inventory_source, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                    FROM (
                        SELECT article, size, pack_type_id, dc_code, inventory_source FROM packs GROUP BY 1, 2, 3, 4, 5
                    ) a 
                    LEFT JOIN (
                    SELECT * FROM inventory_smart.sku_dc_available_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING(dc_code, pack_type_id, article, size)
                    GROUP BY 1, 2, 3)      
                    ,reserve_allocation as (
                        SELECT dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
                        FROM (
                            SELECT dc_code, article, size, pack_type_id FROM packs
                            GROUP BY 1, 2, 3, 4
                        ) am
                        LEFT JOIN inventory_smart.sku_dc_reserved_units 
                        USING (article, pack_type_id, dc_code, size)
                        GROUP BY 1, 2 --need more clarity
                    )   
                            --select * from reserve_allocation;  
                    ,other_allocations as (
                        SELECT dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                        FROM (
                            SELECT 
                                dc_code, 
                                article, 
                                pack_type_id, 
                                size, 
                                quantity as allocated_reserve_qty
                            FROM (
                                SELECT dc_code, article, pack_type_id, size, pack_rounding_factor, pack_type, units_in_pack FROM packs
                                GROUP BY 1, 2, 3, 4, 5, 6, 7
                            ) am
                            JOIN (select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ )
                            where allocation_code not in ($$ || quote_literal('%1$s') || $$))b  
                            USING (dc_code, article, size, pack_type_id)
                        ) a
                        GROUP BY 1, 2
                    )
                    ,fourth_table as (
                        SELECT dc_code,
                            name as dc_name,
                            size,
                            inventory_source,
                            SUM(allocated_qty) as allocated_qty,
                            case 
                                when inventory_source <> 'oh_oo' then SUM(oh)
                                else SUM(oh) + SUM(oo)
                            end as dc_available,
                            SUM(allocated_reserve_qty) as allocated_reserve_qty,
                            SUM(user_reserve_qty) as user_reserve_qty
                        FROM (
                            SELECT size,
                                dc_code,
                                SUM(allocated_qty) as allocated_qty
                            FROM packs
                            GROUP BY 1, 2
                        ) a
                        LEFT JOIN current_available USING (size, dc_code)
                        LEFT JOIN reserve_allocation USING (size, dc_code)
                        LEFT JOIN other_allocations USING (size, dc_code)
                        LEFT JOIN "global".distribution_centres dd USING (dc_code)
                        GROUP BY 1, 2, 3, 4
                    )
                    ,net_availble_count as materialized (
                        select dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0) - COALESCE(SUM(user_reserve_qty),0)  net_dc_available
                        from fourth_table
                        group by dc_code
                    )
        $$;
        _final_inv_query := format(_final_inv_query,_alloc_code);
    ELSE
        _final_inv_query := $$
            ,reserve_allocation as (
                        SELECT dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
                        FROM (
                            SELECT dc_code, article, size, pack_type_id FROM packs
                            GROUP BY 1, 2, 3, 4
                        ) am
                        LEFT JOIN inventory_smart.sku_dc_reserved_units 
                        USING (article, pack_type_id, dc_code, size)
                        GROUP BY 1, 2 --need more clarity
                    ) 
            ,fourth_table as (
        		    SELECT dc_code,
        		           name as dc_name,
                           size,
        		           SUM(allocated_qty) as allocated_qty,
        		           SUM(available_qty) as dc_available,
                           SUM(user_reserve_qty) as user_reserve_qty
        		    FROM (
        		        SELECT
        		            article,
        		            dc_code,
                            size,
        		            SUM(allocated_qty) as allocated_qty,
        		            sum(available_qty) as available_qty
						FROM (
							select 
								article,
        		            	dc_code,
        		            	pack_type_id,
                                size,
        		            	SUM(allocated_qty) as allocated_qty,
        		            	avg(available_qty) as available_qty
							from packs
							group by 1,2,3,4) a
						GROUP BY 1, 2, 3 
        		    ) a
        		    LEFT JOIN global.distribution_centres USING (dc_code)
                    LEFT JOIN reserve_allocation USING (size, dc_code)
					GROUP BY 1, 2, 3
        		)
                ,net_availble_count as materialized (
        	select dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(sum(user_reserve_qty),0) net_dc_available
        	from fourth_table
        	group by dc_code
        )
			$$;
        END IF;
    _query_combine := format($$
        ----PRODUCT VIEW  -  summary
        WITH base_table as (  
            SELECT article,store store_code, pack_dc_allocation, carfs.allocated_total,carfs.retail_size_cd size,oh,oo,it,carfs.inventory_source from inventory_smart.create_allocation_result_flat_gurobi carfs
            WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %2$s
        )
        ,flat_table as (
                SELECT article,
                       store_code,
                       js.key::int dc_code, 
                       size,
                       inventory_source,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) pack_rounding_factor
                FROM (
                    SELECT * FROM base_table 
                ) foo , JSONB_EACH(pack_dc_allocation) js
            )  
         ,packs as materialized (
                SELECT article,
                       dc_code,
                       store_code,
                       pack_type_id,
                      dpc.size,
                      dpc.pack_type,
                       inventory_source,
                       dpc.units_in_pack,
                       pack_rounding_factor,
                       case 
                       	when dpc.pack_type = 'packs' then allocated_qty * dpc.units_in_pack::double precision
                       	else allocated_qty * pack_rounding_factor::double precision
                       end as allocated_qty,      
                       case 
                       	when dpc.pack_type = 'packs' then available_qty * dpc.units_in_pack::double precision
                       	else available_qty * pack_rounding_factor::double precision
                       end as available_qty
               FROM inventory_smart.dc_pack_configuration dpc
               JOIN flat_table USING (article, pack_type_id,size)
            )
        %3$s
        ,first_table as (
            --article count and store count
            SELECT COUNT(DISTINCT article) as art_cnt,
                COUNT(distinct (case when allocated_total > 0 then store_code end)) store_cnt,
                sum(oh)+sum(oo)+sum(it) as oh_oo_it  
            FROM
                base_table 
        )
        ,per_article_store_cnt AS (
            SELECT
                article,
                COUNT(DISTINCT CASE WHEN allocated_total > 0 THEN store_code END) AS store_cnt_per_article
            FROM base_table
            GROUP BY article
        )
        ,allocated_stylecolor_stores AS (
            SELECT
                COUNT(DISTINCT CASE WHEN allocated_total > 0 THEN (article, store_code) END) AS allocated_stylecolor_store_cnt
            FROM base_table
        )
        ,second_table as (
            SELECT coalesce(count(DISTINCT store_code) / NULLIF(count(DISTINCT article), 0),0) as store_avg
            FROM packs
            WHERE allocated_qty > 0
        )   
        ,sales_aggregate as (
            select 
                round(coalesce(sum(lw_qty),0)) as lw_qty,
                round(coalesce(sum(lw_margin),0)) as lw_margin
                from (
                    select article,
                            store_code,
                            avg(aid.lw_units) as lw_qty,--avg to consider all sizes
                            avg(aid.lw_margin) as lw_margin
                    from packs
                    left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
                    group by 1, 2
                ) a
        )
        ,allocation_retail_value as ( 
            select round(sum(allocated_qty*price)::numeric,2) as price 
            from (
                select article, sum(allocated_qty) as allocated_qty  from packs group by 1) a 
                join global.product_attributes_filter paf using(article) 
                where ia_sku_type in ('master','eaches')
            )      
--        select * from allocation_retail_value;   
        SELECT ft.dc_code,
               dc_name as dc,
               art_cnt,
               store_cnt,
               oh_oo_it,
               store_avg,
               allocated_stylecolor_store_cnt,
               size,
               allocated_qty,
               allocated_qty as allocated_size,
               net_dc_available,
               lw_qty,
               lw_margin,
               price
        FROM first_table
        CROSS JOIN allocated_stylecolor_stores
        CROSS JOIN second_table
        cross join fourth_table ft
        cross join sales_aggregate
        cross join allocation_retail_value
        join net_availble_count nac on ft.dc_code = nac.dc_code
        $$, $2, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_product_view_summary', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Ignore allocation code',$3,'article filter',$4,'type',$5));
        RETURN $1;
    end
$function$
;