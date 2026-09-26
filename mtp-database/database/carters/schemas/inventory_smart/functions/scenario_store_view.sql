--liquibase formatted sql
--changeset liquibase:scenario_store_view_multi_allocation_type runOnChange:true stripComments:false splitStatements:false context:MTP-85634 labels:MTP-45674
--comment: MTP-85634 | Enhanced scenario store view with multi-allocation type support and original allocation comparison
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.scenario_store_view(refcursor, varchar, varchar, varchar, varchar);


CREATE OR REPLACE FUNCTION inventory_smart.scenario_store_view(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.scenario_store_view
  * Created by: Manohara G
  * Created at: 02-July-2024
  * No of input parameter: 5
  * Parameter Description : $1 = refcursor name
  *                         $2 = Allocation Code (scenario allocation code)
  *                         $3 = Store code filter
  *                         $4 = Article code/SKU code filter
  *                         $5 = Ignore allocation code
  * Purpose: 
  * Enhanced scenario store view with multi-allocation type support and original allocation comparison
  * 
  * Features:
  * - Supports multiple allocation types: Normal (0,2), PO (4), New Store (5)
  * - Compares scenario allocation with original allocation for analysis
  * - Store-level allocation summary with detailed metrics
  * - Sales performance integration with allocation data
  * - Dynamic data source selection based on allocation type
  * - Proper DC code handling (integer for normal/NS, text for PO)
  * - Conditional distribution center joins for PO allocations
  * 
  * Calling Statement:
     
     begin;
     select * from inventory_smart.scenario_store_view
         ('my_cur',
          '6_105_USA_20250702T1053452513111660_SCENARIO_1_88',
         '',
        '1S530110-USA-Brick __ia_char_13 Mortar',
        '');
      FETCH ALL IN "my_cur";
     commit;
 
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Krishna        2025-01-27      Added multi-allocation type support, dynamic DC code casting, 
  *                                  conditional distribution center joins, enhanced debugging
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
	_original_allocation_code text;
	_current_date_ny date;
	_allocation_type integer;
    begin
        _original_allocation_code := SPLIT_PART($2, '_SCENARIO', 1);
        
        -- If no SCENARIO found, use the original code as is
        IF _original_allocation_code = '' OR _original_allocation_code IS NULL THEN
            _original_allocation_code := $2;
        END IF;
        
        -- Get allocation type from plan_master
        raise notice 'Querying plan_master for allocation_code: %', _original_allocation_code;
        
        SELECT "type"::integer INTO _allocation_type 
        FROM inventory_smart.plan_master 
        WHERE plan_code = _original_allocation_code 
        LIMIT 1;
        
        -- Default to type 0 if not found
        _allocation_type := COALESCE(_allocation_type, 0);
        
        raise notice 'Retrieved allocation type: % for allocation_code: %', _allocation_type, _original_allocation_code;
        
        _current_date_ny := (NOW() AT TIME ZONE 'America/New_York')::date;
        raise notice 'current_date_ny: %', _current_date_ny;
        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';
        _priority_allocation := '';
        
        _query_combine := format($$
            ------ STORE VIEW - STORE LEVEL - TABLE DATA
		with base_table_temp as materialized (SELECT carfs.article,carfs.delivery_dt ,
							  carfs.allocated_total,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,store store_code, updated_oh_oo_it, demand, demand_type, saf.store_name, saf.climate, saf.q_str_grade,saf.store_concept,saf.store_type,saf.center_format_type as store_format,saf.district,saf.precipitation,carfs.retail_size_cd size,carfs.inventory_source,
		                       case 
		                            when allocation_code like '%%SCENARIO%%' then 'scenario'
		                            else 'original'
		                       end as allocation_category
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		join global.store_attributes_filter saf on saf.store_code = carfs.store
		WHERE allocation_code in ('%1$s','%2$s')
		and date(carfs.created_at AT TIME ZONE 'America/New_York') = $$ || quote_literal(_current_date_ny) || $$ 
		)
		,scenario_article_store as (
        select article, store_code from base_table_temp where allocation_category='scenario' group by 1, 2
        )
		,base_table as (
        select * from base_table_temp a
        where exists (select 1 from scenario_article_store b where b.article=a.article and b.store_code=a.store_code)
        )
		,flat_table as (SELECT allocation_category,
			   article,
			   store_code,
			   %3$s dc_code, 
			   size,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty 
		FROM (
			SELECT * FROM base_table 
		) foo , JSONB_EACH(pack_dc_allocation) js)
	,packs as materialized(SELECT allocation_category,
			   article,
			   dc_code,
			   store_code,
			   pack_type_id,
			   size,
			   pack_type,
			   units_in_pack,
			   available_qty * units_in_pack::double precision AS available_qty,
			   allocated_qty * units_in_pack::double precision AS allocated_qty
		FROM inventory_smart.dc_pack_configuration dpc
		JOIN flat_table USING (article, pack_type_id,size))
--		select * from packs;
	,final_inv as (select 
						  allocation_category,
						  dc_code,
						  store_code,  
						  pack_type,
						  sum(allocated_qty) as allocated_qty,
						  SUM(available_qty) - (select sum(allocated_qty) from packs)  as dc_available
					from packs p	
					group by 1,2,3,4
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
		SELECT allocation_category,
			   store_code,
			   store_name,
			   climate,
			   q_str_grade,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT allocation_category,
				   article,
				   store_code,
				   store_name,
				   climate,
				   q_str_grade,
				   sum(demand) demand,
				   COALESCE(sum(MIN), 0) MIN,
				   COALESCE(sum(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
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
                allocation_category,
                store_code,
            round(coalesce(sum(lw_qty),0)) as lw_qty,
            round(coalesce(sum(lw_margin),0)) as lw_margin
            from (
            select allocation_category,
                    article,
                    store_code,
                    avg(aid.lw_units) as lw_qty,--avg to consider all sizes
                    avg(aid.lw_margin) as lw_margin
            from packs
            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
            group by 1, 2, 3
        ) a
        group by 1, 2
    )
	,store_level_misc as(select  allocation_category, delivery_dt, demand_type, store_code,inventory_source, store_concept,store_format,district,precipitation,store_type,
    						CASE 
								WHEN inventory_source='dc' THEN 'B'
								WHEN inventory_source='po' THEN 'L'
								WHEN inventory_source='ns' THEN 'S'
								ELSE '' 
			   				END AS po_type 
						from base_table 
						group by 1,2,3,4,5,6,7,8,9,10)



	SELECT  slb.*,
            fi.dc_code, 
            fi.dc_available,
			fi.allocated_qty,
            fi.pack_type,
            %4$s,
            sa.lw_qty,
            sa.lw_margin,
			delivery_dt,
            demand_type,
			store_concept,
			store_format,
			district,
			precipitation,
			store_type,
            coalesce(slb.style_color_cnt,0) as allocated_products,
            po_type
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(allocation_category, store_code)
    %5$s
    left join sales_aggregate sa using(allocation_category, store_code)
	left join store_level_misc using(allocation_category, store_code)
	$$, $2, _original_allocation_code, 
	CASE WHEN _allocation_type = 4 THEN 'js.key::text' ELSE 'js.key::int' END,
	CASE WHEN _allocation_type = 4 THEN 'fi.dc_code' ELSE 'dcs.name' END,
	CASE WHEN _allocation_type = 4 THEN '' ELSE 'LEFT JOIN global.distribution_centres dcs using(dc_code)' END);
    raise notice 'Allocation Type: %', _allocation_type;
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_store_view', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Store code',$3,'Article code/SKU code',$4,'Ignore allocation code',$5,'allocation_type',_allocation_type));
    RETURN $1;
    end
$function$
;
