--liquibase formatted sql
--changeset liquibase:pdq_finalize_product_view runOnChange:true stripComments:false splitStatements:false context:MTP-40575 labels:MTP-58781
--comment: MTP-66787 no need to convert created_at to IST time | MTP-77785
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.pdq_finalize_product_view(refcursor, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.pdq_finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.pdq_finalize_product_view
  * Created by: Manohara Gulla 
  * Created at: 30-Sep-2024
  * No of input parameter: 6
  * Parameter Description : $1 = Cursor
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Ignore allocation codes
                                $5 = article filter
                                $6 = type
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     begin;
     select * from inventory_smart.finalize_product_view
         ('my_cur',
          '6_155_PFS_20230519T071512',
         '',
         '',
        '',
       'allocated');
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
        _store_filter text;
        _article_filter text;
        _final_inv_query text;
        _pm_date date;
        _query text;
        _alloc_code text;
    begin
	    _article_filter := '';
        _store_filter := '';
        _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
		if $4 = '' then 
			_alloc_code := $2;	  
		else
			_alloc_code := $4;	 
		end if; 
        _query := format(_query, _alloc_code);
		execute _query into _pm_date;
	   	raise notice 'pm_date: %', _pm_date;

    	if ($3 = '') IS FALSE
            then
                _store_filter := format($$WHERE store_code = '%s'$$, $3);
            end if;
        IF ($5 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $5);
        END IF;
        IF ($6 = 'allocated')
        THEN
            _final_inv_query := $$
                     ,current_allocation as (
                SELECT dc_code, article, available_qty as oh
                FROM  packs GROUP BY 1, 2, 3
            )
                ,other_allocations as (
                    SELECT dc_code, article, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT article, dc_code FROM packs_base GROUP BY 1, 2
                        ) am
                        join (select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ ))b
                        USING (dc_code, article)
                    ) a
                    GROUP BY 1, 2
                )
                ,final_inv as materialized (
                    SELECT dc_code,
                           article,
                           allocated_qty,
                           SUM(oh) as dc_available,
                           SUM(allocated_reserve_qty) as allocated_reserve_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) as net_available_before_allocation
                    FROM (
                         SELECT dc_code,
                                article,
                                SUM(allocated_qty) as allocated_qty
                        FROM packs_base
                        GROUP BY 1, 2
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, article)
                    LEFT JOIN other_allocations USING (dc_code, article)
                    GROUP BY 1, 2, 3
                )
                --select * from fourth_table ; 
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
                SELECT article,
                       dc_code,
                       SUM(allocated_qty) as allocated_qty,
                       SUM(available_qty) as net_available_before_allocation,
                       COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available
                FROM packs_base_grouped pb
                GROUP BY 1, 2
            )
            $$;
        END IF; 
        _query_combine := format($$
            ------ PRODUCT VIEW - TABLE DATA
            WITH base_table as materialized (
                SELECT article, channel, store store_code, retail_size_cd size,pack_dc_allocation,split_profile,aps,ros,demand,
                       inventory_source,demand_type,selected_store_group_names,allocated_total,min,max,oh,oo,it,lt_forecast,wos,
                       oh_oo_intransit,(allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %3$s
            )
            ,flat_table as (
                SELECT article,
                       store_code,
                       js.key::int dc_code, 
                       channel,
                       size,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
                FROM (
                    SELECT * FROM base_table 
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
                       allocated_qty 
                FROM flat_table 
            )
            ,packs_base as materialized (
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
            %4$s
            ,article_level_inv as (
                SELECT dc_code, article, net_available, net_available_before_allocation, allocated_qty as allocated_quantity_size
                FROM final_inv
            )
            ,article_level_base_table as  (
            select article, 
            	   inventory_source, 
            	   demand_type, 
            	   COUNT( DISTINCT(CASE WHEN allocated_total > 0 then store_code end)) as store_cnt, 
            	   COUNT( distinct store_code ) as all_stores,-- stores can have 0 alloc
                   avg(MIN) as MIN,
                   avg(MAX) as MAX
                   from base_table bt
                GROUP BY 1, 2, 3)
            SELECT alb.*, ali.*, dcs.name dc, 1 as order, paf.*
           FROM article_level_base_table alb
           LEFT JOIN article_level_inv ali USING(article)
           LEFT JOIN global.distribution_centres dcs using(dc_code) 
		  LEFT JOIN (
                SELECT article, size, product_code, l0_name, l1_name, l2_name, l3_name, l4_name, product_description description, inner_pack_size 
                FROM global.product_attributes_filter paf WHERE product_code in (SELECT distinct article from base_table) and active
            ) paf USING (article)
        $$, $2, _store_filter, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    END
$function$
;

