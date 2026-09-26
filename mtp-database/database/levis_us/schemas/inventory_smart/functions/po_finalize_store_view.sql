--liquibase formatted sql
--changeset liquibase:po_finalize_store_view sales column updated runOnChange:true stripComments:false splitStatements:false context:MTP-98324 labels:MTP-98324
--comment: MTP-98324  initial commit store grade added sales column updated | pack level calculation changes for HLE in store view MTP-106137
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_store_view(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_store_view(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.po_finalize_store_view
  * Created by: Manohara G
  * Created at: 02-July-2024
  * No of input parameter: 6
  * Parameter Description : $1 = refcursor
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Article code/SKU code
  *                             $5 = Ignore allocation code
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
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
            ------ PO - STORE VIEW - STORE LEVEL - TABLE DATA
		with base_table as materialized (SELECT carfs.article,carfs.delivery_dt ,
							  carfs.allocated_total,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,store store_code, updated_oh_oo_it, demand, demand_type, saf.store_name, saf.climate, carfs.store_grade, carfs.store_cluster, carfs.retail_size_cd size,carfs.inventory_source
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		join global.store_attributes_filter saf on saf.store_code = carfs.store
		WHERE allocation_code = '%1$s'
		)
		,flat_table as (SELECT article,
			   store_code,
			   js.key dc_code, 
			   size,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty 
		FROM (
			SELECT * FROM base_table 
		) foo , JSONB_EACH(pack_dc_allocation) js)
	,packs as materialized(SELECT article,
			   dc_code,
			   store_code,
			   pack_type_id,
			   size,
			   pack_type,
			   units_in_pack,
			   allocated_qty as packs_allocated_qty,
			   available_qty,
			   allocated_qty * units_in_pack::double precision AS allocated_qty
		FROM inventory_smart.dc_pack_configuration dpc
		JOIN flat_table USING (pack_type_id,article, size))
--		select * from packs;
	,final_inv as materialized (select 
		   dc_code,
		   store_code,
		   pack_type,
		   sum(allocated_qty) as allocated_qty,
		   SUM(available_qty) -  sum(allocated_qty) as dc_available,
		   SUM(packs_allocated_qty) as packs_allocated_qty
		from (
			select 
				article,
				dc_code, 
				store_code,
				pack_type,
				pack_type_id,
				sum(allocated_qty) as allocated_qty,
				SUM(available_qty) as available_qty,
				avg(packs_allocated_qty) as packs_allocated_qty
			from packs
	        group by 1,2,3,4,5
		)
        group by 1,2,3)
--					select * from final_inv;
    ,base_table_min_wos as  materialized (
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
			   climate,
			   store_grade,
               store_cluster,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				COALESCE(SUM(fwos_target), 0) as fwos_target,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT article,
				   store_code,
				   store_name,
				   climate,
				   store_grade,
                   store_cluster,
				   sum(demand) demand,
				   COALESCE(sum(MIN), 0) MIN,
				   COALESCE(sum(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(SUM(wos), 0) as fwos_target,
				   COALESCE(sum(oh), 0) oh,
				   COALESCE(sum(oo), 0) oo,
				   COALESCE(sum(it), 0) it,
				   COALESCE(SUM(allocated_total), 0) allocated_total
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3, 4, 5, 6
		) as st
		GROUP BY 1, 2, 3, 4, 5)
    ,sales_aggregate as (
    select 
                store_code,
            round(coalesce(sum(lw_qty),0)) as lw_qty,
			round(coalesce(sum(last_4_week_sales),0)) as last_4_week_sales,
            round(coalesce(sum(wos_actual),0)) as wos_actual,
			round(coalesce(sum(projected_fwos),0)) as projected_fwos,
			round(coalesce(sum(lw_revenue),0)) as lw_revenue
            from (
            select article,
                    store_code,
                    avg(aid.lw_units) as lw_qty,--avg to consider all sizes
					avg(aid.last_4_week_sales) as last_4_week_sales,
					avg(aid.lw_revenue) as lw_revenue,
					avg(CASE WHEN aid.last_8_week_sales IS NOT NULL AND aid.last_8_week_sales != 0
    					THEN aid.oh::float / aid.last_8_week_sales
   						 ELSE 0
						END) as wos_actual,
					avg(wos_oh) as projected_fwos
            from packs
            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
            group by 1, 2
        ) a
        group by 1
    )
	,store_level_misc as(select  delivery_dt, demand_type, store_code,inventory_source, 
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
            fi.dc_available,
            fi.pack_type,
            fi.dc_code as dc,
			coalesce(fi.packs_allocated_qty, 0) as allocated_qty,
            sa.lw_qty,
			sa.wos_actual,
			sa.last_4_week_sales,
			sa.projected_fwos,
			sa.lw_revenue,
			delivery_dt,
            demand_type,
            po_type
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code)
    left join sales_aggregate sa using(store_code)
	left join store_level_misc using(store_code)
	$$, $2);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.po_finalize_store_view', 'Before returning function value',_query_combine,jsonb_build_object('allocation_code',$2,'_store_code',$3,'Article code/SKU code',$4,'Ignore allocation code',$5)) ;		

    RETURN $1;
    end
$function$
;