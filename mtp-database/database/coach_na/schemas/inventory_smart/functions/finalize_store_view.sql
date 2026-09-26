--liquibase formatted sql
--changeset liquibase:finalize_store_view runOnChange:true stripComments:false splitStatements:false context:MTP-85506 labels:MTP-85506
--comment: inital commit for finalize_store_view
--rollback: SELECT  1

DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view(input refcursor, character varying, character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_store_view
  * Created by: Manohara G
  * Created at: 02-July-2024
  * No of input parameter: 5
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

        IF ($4 = '') IS FALSE
        THEN
            _article_filter := format($$ AND article IN ('%s')$$, $4);
        END IF;
        
        _query_combine := format($$
            ------ STORE VIEW - STORE LEVEL - TABLE DATA
		with base_table as materialized (SELECT carfs.article,carfs.delivery_dt ,
							  carfs.allocated_total,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,carfs.aps,carfs.ros,store store_code, updated_oh_oo_it, demand, demand_type, saf.store_name, saf.climate, carfs.store_grade, saf.s2_name as country,carfs.retail_size_cd size,carfs.shipping_date,carfs.inventory_source
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		join global.store_attributes_filter saf on saf.store_code = carfs.store
		WHERE allocation_code = '%1$s' %2$s
		)
		,flat_table as (SELECT article,
			   store_code,
			   js.key::int dc_code, 
			   size,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) pack_rounding_factor 

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
			   case 
				when dpc.pack_type = 'packs' then allocated_qty * dpc.units_in_pack::double precision
				else allocated_qty 
			   end as allocated_qty,      
				case 
				when dpc.pack_type = 'packs' then available_qty * dpc.units_in_pack::double precision
				else available_qty 
			  end as available_qty
		FROM inventory_smart.dc_pack_configuration dpc
		JOIN flat_table USING (article, pack_type_id,size))
--		select * from packs;
	,final_inv as (select 
						  dc_code,
						  store_code,  
						  pack_type,
						  sum(allocated_qty) as allocated_qty,
						  SUM(available_qty) as dc_available_qty_before_allocation,
						  SUM(available_qty) - (select sum(allocated_qty) from packs)  as dc_available
					from packs p	
					group by 1,2,3
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
			   country,
			   round(SUM(price)::numeric,2) as price,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   SUM(oh)+SUM(oo)+SUM(it)  as oh_oo_it,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
			   round(COALESCE(AVG(ros), 0)::numeric,0)::int as ros,
			   round(COALESCE(AVG(aps), 0)::numeric,0)::int as aps,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT bt.article,
				   store_code,
				   store_name,
				   country,
				   price as article_price,
				   COALESCE(SUM(allocated_total), 0) * price as price,
				   sum(demand) demand,
				   COALESCE(sum(MIN), 0) MIN,
				   COALESCE(sum(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(sum(oh), 0) oh,
				   COALESCE(sum(oo), 0) oo,
				   COALESCE(sum(it), 0) it,
				   COALESCE(SUM(allocated_total), 0) allocated_total,
				   COALESCE(avg(ros), 0) ros,
				   COALESCE(avg(aps), 0) aps
			FROM base_table_min_wos bt
			join ( select article, max(price) as price, max(ia_sku_type) as ia_sku_type from global.product_attributes_filter group by 1 ) paf on paf.article = bt.article
			where ia_sku_type in ('master','eaches')
			GROUP BY 1, 2, 3, 4, 5
		) as st
		GROUP BY 1, 2, 3)
    ,sales_aggregate as (
    select 
                store_code,
            round(coalesce(sum(lw_qty),0)) as lw_qty,
            round(coalesce(sum(wtd_sales_units),0)) as wtd_sales_units
            from (
            select article,
                    store_code,
                    avg(aid.lw_sales_units) as lw_qty,--avg to consider all sizes
                    avg(aid.wtd_sales_units) as wtd_sales_units
            from packs
            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
            group by 1, 2
        ) a
        group by 1
    )

	,store_level_misc as(select  store_code,shipping_date
						from base_table 
						group by 1,2
	)

	SELECT  slb.*,
            fi.dc_code, 
            fi.dc_available,
            fi.pack_type,
            fi.allocated_qty,
			fi.dc_available_qty_before_allocation,
            dcs.name as dc,
			sa.wtd_sales_units,
			sa.lw_qty,
			slm.shipping_date

    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code)
    LEFT JOIN global.distribution_centres dcs using(dc_code)
    left join sales_aggregate sa using(store_code)
	left join store_level_misc slm using(store_code)
	$$, $2, _article_filter);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_store_view', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Store code',$3,'Article code/SKU code',$4,'Ignore allocation code',$5));
    RETURN $1;
    end
$function$
;