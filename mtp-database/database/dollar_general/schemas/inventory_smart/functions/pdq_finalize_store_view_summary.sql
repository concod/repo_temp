
--liquibase formatted sql
--changeset liquibase:pdq_finalize_store_view_summary runOnChange:true stripComments:false splitStatements:false context:MTP-58781 labels:MTP-58781
--comment: MTP-66787 no need to convert created_at to IST time | MTP-77785
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.pdq_finalize_store_view_summary(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.pdq_finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.pdq_finalize_store_view_summary
 * Created by: Manohara Gulla
 * Created at: 30-SEP-2024
 * No of input parameter: 5
 * Parameter Description : $1 = Cursor
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

        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
        END IF;

        IF ($5 = 'allocated')
        THEN
            _final_inv_query := $$
                    ,current_allocation as (
                    select sum(available_qty) oh from (
                SELECT dc_code, pack_type_id, available_qty
                FROM  packs GROUP BY 1, 2, 3) a 
            )
--                 select * from current_allocation;
                ,reserve_allocation as (
                SELECT SUM(COALESCE(packs_reserved,0)) user_reserve_qty 
                FROM (
                    SELECT dc_code, article FROM packs
                    GROUP BY 1, 2
                ) am
                LEFT JOIN (
                    SELECT * FROM inventory_smart.sku_dc_reserved_units where (product_code, dc_code) in (SELECT distinct article, dc_code FROM packs)
                ) b
                USING (dc_code, article)
            )
--            select * from reserve_allocation;
                ,other_allocations as (
                    SELECT SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                        	SELECT article, dc_code FROM packs_base GROUP BY 1, 2
                        ) am
                        join (select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ ))b
                        USING (dc_code, article)
                    ) a
                )
                ,final_inv as materialized (
                    SELECT (oh-coalesce (allocated_reserve_qty,0)-coalesce (user_reserve_qty,0) - coalesce (allocated_qty,0)) as net_available
                    FROM (
                         SELECT 
                                SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                    ) foo
                    cross join  current_allocation
                    cross join other_allocations
                    cross join reserve_allocation
                )
                --select * from final_inv ; 
            $$; 
            _final_inv_query := format(_final_inv_query,_alloc_code);
        ELSE
            _final_inv_query = $$
             , packs_base_grouped as (
                select 
                    article,
                    dc_code,
                    pack_type_id,
                    SUM(allocated_qty) as allocated_qty,
                    avg(available_qty) as available_qty
                from packs_base
                group by 1,2,3
            )
            ,final_inv as (
                SELECT  COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available
                FROM packs_base_grouped pb
                GROUP BY article, dc_code
            )
            $$;
        END IF; 
        _query_combine := format($$
            ------ store summary view 
            WITH base_table as materialized(
            SELECT carfs.article,carfs.allocated_total,  carfs.pack_dc_allocation , channel, store store_code, retail_size_cd size from inventory_smart.create_allocation_result_flat_gurobi carfs
            JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text 
            WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %2$s
		)
        --        select * from base_table;
        ,flat_table as (
            SELECT article,
                   store_code,
                   js.key::int dc_code, 
                   channel,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
               	   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
            FROM (                                                                                          
                SELECT article, store_code, channel, pack_dc_allocation FROM base_table                     
            ) foo , JSONB_EACH(pack_dc_allocation) js                                                       
        )        
--        select * from flat_table;
            ,packs AS (                                                                                         
                SELECT ft.article,                                                                                 
                       dc_code,                                                                                 
                       store_code,
                       pack_type_id,
                       'NS' as size,
                       channel,
					   available_qty,
                       allocated_qty packs_allocated_qty,
                       allocated_qty 
                FROM  flat_table  ft
                group by 1,2,3,4,5,6,7,8,9
            )
--            select * from packs;
            ,packs_base_initial as materialized (
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
                WHERE pack_type_id not IN ( SELECT pack_type_id FROM packs)
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
--            select * from packs_base_initial;
            ,packs_base_product as materialized (
            		select pbi.*, paf.l0_name, l4_name from packs_base_initial pbi join global.product_attributes_filter paf on pbi.article = paf.product_code
            		)
--            		select * from packs_base_product;
            	, packs_base_psa as materialized (
            		select distinct coalesce(psaf.psa_name,'2') as psa_name, l0_name, l4_name, store_code from
            		(select l0_name, l4_name from packs_base_product pbi group by 1,2) pad
				join global.product_store_attributes_filter psaf using (l0_name, l4_name) 
				where psaf.store_code in (select store_code from  packs_base_initial group by 1)
            	)
            	, packs_base as materialized (
            		select p.*, s.psa_name from packs_base_product p join packs_base_psa s using (l0_name, l4_name, store_code)   		
            	)
			    %3$s
                , total_allocated as (
                select psa_name, sum(allocated_qty) allocated_qty from packs_base group by 1
                )
                ,cnt_cte as (
                    select
                        COUNT(distinct article) as art_cnt,
                        COUNT(distinct (case when allocated_total > 0 then store_code end)) store_cnt,
                        COUNT(distinct (store_code)) eligible_store_count
                    from
                        base_table
                    )
                select
                    psa_name,
                    allocated_qty,
                    art_cnt,
                    store_cnt,
                    eligible_store_count,
                    net_available,
                    count(distinct psa_name) store_band_cnt  
                from
                    total_allocated
                cross join final_inv
                cross join cnt_cte
                group by 1,2,3,4,5,6
        $$, $2, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;

