
--liquibase formatted sql
--changeset liquibase:finalize_store_view_summary_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-134698 labels:MTP-134698
--comment: MTP-134698 Add allocated_stylecolor_stores KPI | MTP-66787 no need to convert created_at to IST time | MTP-77785 | MTP-130441 sku_depth_per_store
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view_summary(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.store_view_summary
 * Created by: Manohara Gulla
 * Created at: 21-July-2024
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
                 	SELECT SUM(oh) oh, SUM(it) it, SUM(oo) oo
                    FROM (
                        SELECT article, dc_code, pack_type_id FROM packs_base GROUP BY 1, 2, 3
                    ) a 
                    LEFT JOIN (
                    SELECT * FROM inventory_smart.sku_dc_available_units where  (article, dc_code) in (SELECT article, dc_code FROM packs_base)
                    ) b
                    USING(dc_code, article, pack_type_id)                   
                )
                 --select * from current_allocation
--                 SELECT distinct article FROM packs_base
                ,reserve_allocation as (
                    SELECT SUM(COALESCE(quantity,0)) user_reserve_qty 
                      FROM (
                        SELECT article, dc_code FROM packs_base GROUP BY 1, 2
                      ) am
                    LEFT JOIN (
--                        SELECT * FROM inventory_smart.sku_dc_reserved_units ('{}', (SELECT ARRAY_AGG(article) FROM packs_base))
                        SELECT * FROM inventory_smart.sku_dc_reserved_units where article in (SELECT article FROM packs_base)
                    ) b
                    USING (dc_code, article)
                )
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
                SELECT article,                                                                                 
                       dc_code,                                                                                 
                       store_code,
                       pack_type_id,
                       size,
                       channel,
					   available_qty * units_in_pack::double precision AS available_qty,
                       allocated_qty packs_allocated_qty,
                       allocated_qty * units_in_pack::double precision AS allocated_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table USING (article, pack_type_id)
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
            		select pbi.*, paf.l0_code, paf.l1_code, paf.l3_code, paf.l4_code from packs_base_initial pbi join global.product_attributes_filter paf on pbi.article = paf.product_code
            		)
--            		select * from packs_base_product;
            		, packs_base as materialized (
            		select distinct coalesce(psaf.psa_name,'2') as psa_name, slbt.* from
            		(select pbi.* from packs_base_product pbi) slbt
				join global.product_store_attributes_filter psaf 
				on md5(slbt.l0_code || slbt.l1_code || slbt.l3_code || slbt.l4_code || slbt.store_code) = md5(psaf.l0_code || psaf.l1_code || psaf.l3_code || psaf.l4_code || psaf.store_code)
            	)
            	--select * from packs_base;
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
                select
                    psa_name,
                    allocated_qty,
                    art_cnt,
                    store_cnt,
                    allocated_stylecolor_store_cnt,
                    eligible_store_count,
                    net_available,
                    count(distinct psa_name) store_band_cnt  
                from
                    total_allocated
                cross join final_inv
                cross join cnt_cte
                cross join allocated_stylecolor_stores
                group by 1,2,3,4,5,6,7
        $$, $2, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;

