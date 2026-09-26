--liquibase formatted sql
--changeset liquibase:finalize_product_view runOnChange:true stripComments:false splitStatements:false context:MTP-85506 labels:MTP-85506
--comment: inital commit for finalize_product_view | article size level net dc available calculation | MTP-100482  |adding product_profile and store_group columns  |MTP-104456 | product profile master changes
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_view
  * Created by: Manohara Gulla
  * Created at: 20-DEC-2024
  * No of input parameter: 2
  * Parameter Description : $1 = Application name
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
  *Chandrashekar S    15-SEP-2025    Adding product_profile and store_group columns to SP
  */
     declare
        _query_combine text;
        _store_filter text;
        _article_filter text;
        _final_inv_query text;
        _pm_date date;
        _query text;
        _alloc_code text;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
        _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $4 = '' then 
           _alloc_code := $2;
        else
            _alloc_code := $4;
        end if; 
        _query := format(_query, _alloc_code);
        execute _query into _pm_date;
	   	raise notice 'pm_date: %', _pm_date;

	    _article_filter := '';
        _store_filter := '';
        if ($3 = '') IS FALSE
            then
                _store_filter := format($$ AND store_code = '%s'$$, $3);
            end if;
        IF ($5 = '') IS FALSE
        THEN
            _article_filter := format($$ AND article IN ('%s')$$, $5);
        END IF;
        IF ($6 = 'allocated')
            THEN
                _final_inv_query := $$
                    ,current_avail as materialized (SELECT * FROM inventory_smart.sku_dc_available_units where article is not null)
                    ,current_available as materialized (
                    SELECT dc_code, size, inventory_source, article,
					case 
						when inventory_source = 'oh_oo' then sum(oh + oo)
						when inventory_source = 'oh_it' then sum(oh + it)
						when inventory_source = 'it' then sum(it)
						else sum(oh)
					end as oh
                    FROM (
                        SELECT article, size, pack_type_id, dc_code, inventory_source  FROM packs GROUP BY 1, 2, 3, 4, 5
                    ) a 
                    LEFT JOIN (
                    SELECT * FROM current_avail where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING(dc_code, article, size, pack_type_id)
                    GROUP BY 1, 2, 3, 4
                )
                    ,reserve_alloc as materialized (SELECT * FROM inventory_smart.sku_dc_reserved_units sdru)   
                    ,reserve_allocation as materialized (
                        SELECT dc_code, article, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
                        FROM (
                            SELECT dc_code, article, size, pack_type_id FROM packs
                            GROUP BY 1, 2, 3, 4
                        ) am
                        LEFT JOIN (
                        SELECT * FROM reserve_alloc where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                        ) b
                        USING (dc_code, article, size, pack_type_id)
                        GROUP BY 1, 2, 3 --need more clarity
                            )
                    ,other_allocations as materialized (
                        SELECT dc_code, article, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, 
                                article, 
                                pack_type_id, 
                                size, 
                                quantity as allocated_reserve_qty
                            FROM (
                                SELECT dc_code, article, pack_type_id, size FROM packs
                                GROUP BY 1, 2, 3, 4
                            ) am
                            JOIN (select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ ))b
                            USING (dc_code, article, size, pack_type_id)
                        ) a
                        GROUP BY 1, 2, 3
                    )
                    --select * from other_allocations;
                    ,final_inv as materialized (
                        SELECT dc_code,
                            article,
                            foo.size,
                            allocated_qty,
                            inventory_source,
                            sum(oh) as dc_available,
                            COALESCE(SUM(allocated_reserve_qty),0) as allocated_reserve_qty,
                            COALESCE(SUM(user_reserve_qty),0) as user_reserve_qty
                        FROM (
                            SELECT dc_code,
                                    article,
                                    size,
                                    SUM(allocated_qty) as allocated_qty
                            FROM packs
                            GROUP BY 1, 2, 3
                        ) foo
                        LEFT JOIN current_available USING (dc_code, article, size)
                        LEFT JOIN other_allocations USING (dc_code, article, size)
                        left join reserve_allocation using (dc_code, article, size)
                        GROUP BY 1, 2, 3, 4, 5
                    )
                    ,net_availble_count as materialized (
                        select article, dc_code, size, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0) - COALESCE(SUM(user_reserve_qty),0)  net_available,
                            COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_reserve_qty),0) - COALESCE(SUM(user_reserve_qty),0) as net_available_before_allocation
                        from final_inv
                        group by dc_code,article,size
                    )
        $$;
        _final_inv_query := format(_final_inv_query,_alloc_code);
    ELSE
        _final_inv_query := $$
            ,final_inv as (
        		    SELECT a.*,
        				   name as dc_name,
        		       	   COALESCE(dc_available, 0) - COALESCE(allocated_qty, 0)  as net_available,
        		       	   0 as allocated_reserve_qty
        		    FROM (
        		        SELECT
        		            article,
        		            dc_code,
                            size,
        		            SUM(allocated_qty) as allocated_qty,
        		            sum(available_qty) as dc_available
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
        		)
                ,net_availble_count as (
        	select article, dc_code, size, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) net_available,
            COALESCE(sum(dc_available),0)  as net_available_before_allocation
        	from final_inv
        	group by dc_code,article,size
        )
			$$;
        END IF;
        _query_combine := format($$
            ------ PRODUCT VIEW -  PRODUCT TABLE DATA
             WITH base_table as materialized (
                -- CHANGED: Added selected_store_group_names and product_profile_selected columns to base_table
                SELECT article, channel, store store_code,pack_dc_allocation,inventory_source, demand_type, demand, allocated_total, min,max,oh,oo,it,lt_forecast,wos,aps,ros,carfs.retail_size_cd size,
                       oh_oo_intransit, (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos,
                       selected_store_group_names, product_profile_selected
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' %3$s %2$s
                and carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$
        )
        ,flat_table as (
                SELECT article,
                       store_code,
                       js.key::int dc_code, 
                       channel,
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
--                       dpc.size,
                       size,
                       channel,
                       dpc.pack_type,
                       inventory_source,
                       dpc.units_in_pack,
                       coalesce(pack_rounding_factor,1) as pack_rounding_factor,
                       case 
                       	when dpc.pack_type = 'packs' then allocated_qty * dpc.units_in_pack::double precision
                       	else allocated_qty 
                       end as allocated_qty,      
                       case 
                       	when dpc.pack_type = 'packs' then available_qty * dpc.units_in_pack::double precision
                       	else available_qty 
                       end as available_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table USING (article, pack_type_id,size)
            )
         %4$s
        ,store_level_oh as (
                SELECT article, sum(oh) as oh, sum(oo) as oo, sum(it) as it, sum(oh) + sum(oo) + sum(it) as  oh_oo_it,
				round(avg(wos)::numeric,0)::int as wos,
				round(avg(ros)::numeric,0)::int as ros,
				round(avg(aps)::numeric,0)::int as aps
                FROM base_table
                group by article
             )
        -- NEW CTE: Added store_group_aggregated to aggregate selected store group names by article and size
        -- ,store_group_aggregated as (
        --     -- CTE to aggregate selected store group names by article and size - MODIFIED to return array
        --     SELECT 
        --         article,
        --         size,
        --         array_agg(DISTINCT unnest_groups) as store_group_names
        --     FROM (
        --         SELECT 
        --             article,
        --             size,
        --             unnest(selected_store_group_names) as unnest_groups
        --         FROM base_table
        --         WHERE selected_store_group_names IS NOT NULL
        --     ) sg
        --     GROUP BY article, size
        -- )
        -- NEW CTE: Added product_profile_aggregated to join product_profile_selected with product_profile_master and aggregate by article and size
        ,product_profile_aggregated as (
            -- CTE to join product_profile_selected with product_profile_master to get names and aggregate by article and size - MODIFIED to return string
            SELECT 
                bt.article,
                size,
                string_agg(DISTINCT ppm.name, ', ') as product_profile
            FROM base_table bt
            LEFT JOIN inventory_smart.product_profile_master ppm ON bt.product_profile_selected::int = ppm.pp_code
            WHERE bt.product_profile_selected IS NOT NULL 
            AND bt.product_profile_selected != ''
            AND ppm.name IS NOT NULL
            GROUP BY bt.article, size
        )
		,size_order as (
		-- Get size order for article-size combination
        	select
        		article,
        		ft.size,
        		ast.order
        	from (select distinct article, size from base_table)ft
        	join (select article, product_code, size from global.product_attributes_filter) paf
        		using (article, size)
        	join (select distinct product_code, size, x.order from inventory_smart.article_status_tag x) ast
        		on paf.product_code = ast.product_code
        	group by 1,2,3
        ) 
        ,article_level_base_table as  (
            select article, 
            	   inventory_source, 
            	   demand_type, 
            	   sum(demand) as demand,
            	   COUNT( DISTINCT(CASE WHEN allocated_total > 0 then store_code end)) as store, 
            	   COUNT( distinct store_code ) as all_stores,-- stores can have 0 alloc
                   sum(MIN) as MIN,
                   sum(MAX) as MAX,
                   round(avg(
						CASE WHEN ros IS NOT NULL AND ros != 0
						THEN (allocated_total + oh + oo + it)::float / CEIL(ros)
						ELSE 0
						END 
						)::numeric,0)::int as forecasted_wos,
                    round(avg(
						CASE WHEN wos IS NOT NULL AND wos != 0
						THEN demand::float / wos
						ELSE 0
						END 
						)::numeric,0)::int as forecasted_aps
                   from base_table bt
                GROUP BY 1, 2, 3)
        ,paf_details as (
        	SELECT distinct paf.*,store_group as store_group_names
    FROM global.product_attributes_filter paf
    left join inventory_smart.article_inventory_dashboard using(article)
    WHERE article IN (SELECT DISTINCT article FROM base_table)
      AND ia_sku_type IN ('master','eaches')
        )
--        select * from paf_details;
		SELECT
		alb.*,
		fi.dc_code,
		fi.size,
		fi.allocated_qty as allocated_quantity_size,
		fi.dc_available,
		fi.allocated_reserve_qty,
		nac.net_available,
		nac.net_available_before_allocation,
		dcs.name dc,
		paf.l0_name,
		paf.l1_name,
		paf.l2_name,
		paf.l3_name,
		paf.l4_name,
		paf.l5_name,
		paf.l6_name,
		paf.l7_name,
		paf.l8_name,
		paf.article_orig as article_orig,
		paf.product_description as description,
		slo.oh,
		slo.it,
		slo.oo,
		slo.wos,
		slo.aps,
		slo.ros,
		so.order as order,
		-- CHANGED: Added new fields from the store group and product profile CTEs
		paf.store_group_names,
		ppa.product_profile
        FROM article_level_base_table alb
        LEFT JOIN final_inv fi USING(article)
        LEFT JOIN global.distribution_centres dcs using(dc_code) 
        LEFT JOIN paf_details paf USING (article, size)
        left join store_level_oh slo using(article)
        left join net_availble_count nac on fi.article = nac.article and fi.dc_code = nac.dc_code and fi.size = nac.size
		LEFT JOIN size_order so ON fi.article = so.article AND fi.size = so.size
		-- CHANGED: Added LEFT JOINs for the new CTEs
		-- LEFT JOIN store_group_aggregated sga ON fi.article = sga.article AND fi.size = sga.size
		LEFT JOIN product_profile_aggregated ppa ON fi.article = ppa.article AND fi.size = ppa.size
        $$, $2, _store_filter, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_product_view', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Store code',$3,'Ignore allocation codes',$4,'article filter',$5,'type',$6));
        RETURN $1;
    END
$function$
;
