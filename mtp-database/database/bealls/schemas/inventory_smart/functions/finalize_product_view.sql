--liquibase formatted sql
--changeset karthikeswar.saravanan@impactanalytics.co:finalize_product_view runOnChange:true stripComments:false splitStatements:false context:finalize_product_view labels:finalize_product_view
--comment: finalize_product_view - intial sync version, synced with carters-db
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view(refcursor, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: inventory_smart.finalize_product_view
  * Created by: Manohara Gulla
  * Created at: 27-June-2024
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
            _article_filter = format($$ AND article IN ('%s')$$, $5);
        END IF;
        IF ($6 = 'allocated')
            THEN
                _final_inv_query := $$
                    ,current_available as (
                SELECT dc_code, article, size, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                    FROM (
                        SELECT article, size, pack_type_id, dc_code FROM packs GROUP BY 1, 2, 3, 4
                    ) a
                    LEFT JOIN (
                    SELECT * FROM inventory_smart.sku_dc_available_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING(dc_code, pack_type_id, article, size)
                    GROUP BY 1, 2, 3
                )
        ,reserve_allocation as (
                    SELECT dc_code, article, size, SUM(COALESCE(quantity,0)) user_reserve_qty
                    FROM (
                        SELECT dc_code, article, size, pack_type_id FROM packs
                        GROUP BY 1, 2, 3, 4
                    ) am
                    LEFT JOIN (
                    SELECT * FROM inventory_smart.sku_dc_reserved_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING (dc_code, article, size, pack_type_id)
                    GROUP BY 1, 2, 3 --need more clarity
                )
        ,other_allocations as (
                    SELECT dc_code, article, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, pack_type_id, size FROM packs
                            GROUP BY 1, 2, 3, 4
                        ) am
                        join (select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ )
                              where allocation_code not in ($$ || quote_literal('%1$s') || $$))b
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2, 3
                )
        ,final_inv as materialized (
                    SELECT dc_code,
                           article,
                           foo.size,
                           allocated_qty,
                           COALESCE(SUM(oh),0) as dc_available,
                           COALESCE(SUM(allocated_reserve_qty),0) as allocated_reserve_qty
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
                    GROUP BY 1, 2, 3, 4
                )
        ,net_availble_count as materialized (
        	select article, dc_code, size, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0)  net_available,
        		   COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_reserve_qty),0) as net_available_before_allocation
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
                ,net_availble_count as materialized (
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
                SELECT article, channel, store store_code,pack_dc_allocation,inventory_source, demand_type, demand, allocated_total, min,max,oh,oo,it,lt_forecast,wos,carfs.retail_size_cd size,
                       oh_oo_intransit, (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos
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
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty
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
                       channel,
                       pack_type,
                       allocated_qty * units_in_pack::double precision AS allocated_qty,
                       available_qty * units_in_pack::double precision AS available_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table USING (article, pack_type_id,size)
            )
         %4$s
        ,store_level_oh as (
                SELECT article, sum(oh) as oh, sum(oo) as oo, sum(it) as it
                FROM base_table
                group by article
             )
        ,sales_aggregate as (
        select
             article,
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
			group by 1
        )
        ,article_level_base_table as  (
            select article,
            	   inventory_source,
            	   demand_type,
            	   sum(demand) as demand,
            	   COUNT( DISTINCT(CASE WHEN allocated_total > 0 then store_code end)) as store,
            	   COUNT( distinct store_code ) as all_stores,-- stores can have 0 alloc
                   sum(MIN) as MIN,
                   sum(MAX) as MAX
                   from base_table bt
                GROUP BY 1, 2, 3)
        SELECT alb.*, fi.dc_code, fi.size, fi.allocated_qty as allocated_quantity_size, fi.dc_available,fi.allocated_reserve_qty,nac.net_available,nac.net_available_before_allocation,dcs.name dc,paf.l0_name,paf.l1_name ,paf.l2_name,paf.l3_name, paf.l4_name, paf.l5_name, paf.description, paf.launch_date, paf.collection, paf.product_life_cycle ,  sa.lw_qty, sa.lw_margin, slo.oh, slo.it, slo.oo,1 as order
        FROM article_level_base_table alb
        LEFT JOIN final_inv fi USING(article)
        LEFT JOIN global.distribution_centres dcs using(dc_code)
        LEFT JOIN (
            SELECT article, size, product_code, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l5_name||' '||color_name description, launch_date, collection, product_life_cycle
            FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table)
        ) paf USING (article, size)
        left join sales_aggregate sa using(article)
        left join store_level_oh slo using(article)
        left join net_availble_count nac on fi.article = nac.article and fi.dc_code = nac.dc_code and fi.size = nac.size
        $$, $2, _store_filter, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_product_view', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Store code',$3,'Ignore allocation codes',$4,'article filter',$5,'type',$6));
        RETURN $1;
    END
$function$
;