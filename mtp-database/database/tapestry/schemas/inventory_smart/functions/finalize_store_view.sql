--liquibase formatted sql
--changeset liquibase:finalize_store_view_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-64351 labels:MTP-64351
--comment: MTP-68875 MTP-69581 removing store grade from group by
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_store_view
  * Created by: Karish Chaudhary
  * Created at: 20-Sept-2024
  * Purpose: 
  * This function is created to calculate Store view data which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     
     begin;
     select * from inventory_smart.finalize_product_store
         ('my_cur',
          '3_aignet_test_allocation_1',
         '',
        '20339848');
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
    _store_filter1 text;
    _store_filter2 text;
    _article_filter text;
    _final_inv_query text;
    _priority_allocation text;
	vl_textQuery text;
	start_time timestamp;
	end_time timestamp;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';
        _priority_allocation := '';
        
        _query_combine := format($$
            ------ STORE VIEW - STORE LEVEL - TABLE DATA
		with base_table as materialized (
			select
				carfs.article,
				carfs.shipping_date shipping_date ,
				carfs.allocated_total,
				carfs.oh,
				carfs.oo,
				carfs.it,
				carfs.wos,
				carfs.pack_dc_allocation,
				carfs.min,
				carfs.max,
				carfs.aps,
				store store_code,
				updated_oh_oo_it,
				demand,
				demand_type,
				saf.store_name,
				carfs.store_grade,
				carfs.retail_size_cd size,
				carfs.inventory_source
			from
				inventory_smart.create_allocation_result_flat_gurobi carfs
			join global.store_attributes_filter saf on
				saf.store_code = carfs.store
			where
				allocation_code = '%1$s'
		)
				,flat_table_temp as (
        -- unnest base_table to get pack-dc combinations for article-store data
            SELECT article,
                   store_code,
                   js.key::int dc_code, 
                   foo.size retail_size_cd,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
            FROM (
                SELECT * FROM base_table 
            ) foo , JSONB_EACH(pack_dc_allocation) js
        )   
--        select * from flat_table;
		,flat_table as (
        	select 
        		article, 
        		store_code,
        		dc_code,
        		size,
        		allocated_qty,
        		available_qty
        	from 
        		flat_table_temp 
        	where retail_size_cd = size
        )
--        select * from flat_table;
        ,packs AS  materialized (
		        select * from flat_table
    	    )
--            select * from packs; 
	,final_inv as (select 
						  dc_code,
						  store_code,
						  --size,
						  --pack_type,
						  sum(allocated_qty) as allocated_qty,
						  SUM(available_qty) - sum(allocated_qty)  as dc_available
					from packs p	
					group by 1,2
					)
--					select * from final_inv;
    ,base_table_min_wos as  (
			select
				p.*, 
				greatest(0,MIN - (updated_oh_oo_it)) as min_short,
				greatest(0, allocated_total - greatest(0, MIN - (updated_oh_oo_it))) as wos_allocation,
				least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) as min_allocation
			from
				base_table p
			)
    ,store_level_base_table as (
		SELECT store_code,
			   store_name,
			   --store_grade,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
			   sum(wos) as wos,
			   sum(aps) as aps_units,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT article,
				   store_code,
				   store_name,
				   store_grade,
				   sum(demand) demand,
				   COALESCE(sum(MIN), 0) MIN,
				   COALESCE(sum(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(sum(oh), 0) oh,
				   COALESCE(sum(oo), 0) oo,
				   COALESCE(sum(it), 0) it,
				   COALESCE(SUM(allocated_total), 0) allocated_total,
				   avg(wos) as wos,
				   avg(aps) as aps
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3, 4
		) as st
		GROUP BY 1, 2)
    ,sales_aggregate as (
    select 
                store_code,
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
	,store_level_misc as(select  shipping_date, demand_type, store_code,inventory_source, 
    						CASE 
								WHEN inventory_source='dc' THEN 'B'
								WHEN inventory_source='po' THEN 'L'
								WHEN inventory_source='ns' THEN 'S'
								ELSE '' 
			   				END AS po_type 
						from base_table 
						group by 1,2,3,4
	)
	SELECT  slb.*,
            fi.dc_code, 
            fi.allocated_qty as dc_allocated,
            fi.dc_available,
            --fi.pack_type,
            dcs.name as dc,
            sa.lw_qty,
            sa.lw_margin,
			shipping_date,
            demand_type,
            po_type
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code)
    LEFT JOIN global.distribution_centres dcs using(dc_code)
    left join sales_aggregate sa using(store_code)
	left join store_level_misc using(store_code)
	$$, $2);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
		 perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_store_view', 'Before Return',_query_combine,jsonb_build_object('$2', $2,'$3' , $3,'$4', $4, '$5', $5));
    RETURN $1;
    end
$function$
;
