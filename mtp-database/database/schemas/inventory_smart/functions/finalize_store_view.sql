--liquibase formatted sql
--changeset liquibase:store_grade_logic_fix runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: MTP-131755 store grade logic fix
--rollback: SELECT 1

DROP FUNCTION IF EXISTS  inventory_smart.finalize_store_view(refcursor, varchar, varchar, varchar, varchar);

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
	_alloc_code text;
	_query text;
	_pm_date date;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';
        _priority_allocation := '';

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
				carfs.inventory_source,
				carfs.allocation_strategy,
			    carfs.dos,
				carfs.constrained_forecast,carfs.original_forecast
			from
				inventory_smart.create_allocation_result_flat_gurobi carfs
			join global.store_attributes_filter saf on
				saf.store_code = carfs.store
			where
				allocation_code = '%1$s' %2$s
                and carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$
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
						  sum(available_qty) as available_qty,
						  sum(allocated_qty) as allocated_qty,
						  SUM(available_qty) - sum(allocated_qty)  as dc_available,
						  COALESCE(COALESCE(sum(allocated_qty),0)/NULLIF(COALESCE(avg(available_qty),0),0),0) allocated_units
					from packs p	
					group by 1,2
					)
--					select * from final_inv;
    ,base_table_min_wos as  (
			select
				p.*, 
				greatest(0,MIN - (updated_oh_oo_it)) as min_short,
				case 
					when allocation_strategy = 'mins_only' then 0
					when allocation_strategy = 'forecast_only' then allocated_total	
					when allocation_strategy = 'min_forecast' then greatest(0, allocated_total - greatest(0, MIN - (updated_oh_oo_it)))					
				end as wos_allocation,
				case 
					when allocation_strategy = 'mins_only' then allocated_total
					when allocation_strategy = 'forecast_only' then 0
					when allocation_strategy = 'min_forecast' then least(allocated_total,greatest(0,MIN - (updated_oh_oo_it)))					
				end as min_allocation
			from
				base_table p
			)
    ,store_level_base_table as (
		SELECT store_code,
			   store_name,
			   min(store_grade) as store_grade,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
               COALESCE(sum(oh+oo+it), 0) oh_oo_it,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
			   sum(wos) as wos,
			   sum(aps) as aps_units,
			   avg(dos) as dos,
			    sum(constrained_forecast) as constrained_forecast,
			    sum(original_forecast) as original_forecast,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT article,
				   store_code,
				   store_name,
				   min(store_grade) as store_grade,
				   sum(demand) demand,
				   COALESCE(sum(MIN), 0) MIN,
				   COALESCE(sum(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(sum(oh), 0) oh,
				   COALESCE(sum(oo), 0) oo,
				   COALESCE(sum(it), 0) it,
				   COALESCE(sum(oh+oo+it), 0) oh_oo_it,
				   COALESCE(SUM(allocated_total), 0) allocated_total,
				   avg(wos) as wos,
				   avg(aps) as aps,
				   COALESCE(avg(dos),0) as dos,
				   COALESCE(sum(constrained_forecast),0) as constrained_forecast,
				   COALESCE(sum(original_forecast),0) as original_forecast
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3
		) as st
		GROUP BY 1, 2)
    ,sales_aggregate as (
    select 
                store_code,
            round(coalesce(sum(lw_qty),0)) as lw_qty,
            round(coalesce(sum(lw_margin),0)) as lw_margin,
			round(coalesce(sum(wip),0)) as store_wip,
            round(coalesce(sum(l4w_units),0)) as l4w_units
            from (
            select article,
                    store_code,
                    avg(aid.last_week_sales) as lw_qty,--avg to consider all sizes
					avg(aid.last_week_revenue) as lw_margin,
					avg(aid.wip) as wip,
                    avg(aid.l4w_units) as l4w_units
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
			fi.available_qty,
            fi.allocated_units,
            --fi.pack_type,
            dcs.name as dc,
            sa.lw_qty,
            sa.lw_margin,
            sa.l4w_units,
			sa.store_wip,
			shipping_date,
            demand_type,
            po_type
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code)
    LEFT JOIN global.distribution_centres dcs using(dc_code)
    left join sales_aggregate sa using(store_code)
	left join store_level_misc using(store_code)
	$$, $2, _article_filter);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
		 perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_store_view', 'Before Return',_query_combine,jsonb_build_object('$2', $2,'$3' , $3,'$4', $4, '$5', $5));
    RETURN $1;
    end
$function$
;
