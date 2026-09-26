--liquibase formatted sql
--changeset liquibase:capacity_breach_store_list runOnChange:true stripComments:false splitStatements:false context:MTP-61495 labels:MTP-61495
--comment: MTP-82896 added coalesce to order_batching_finalized adding extra conditions
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach_store_list(character varying);
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach_store_list(character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.capacity_breach_store_list(character varying, character varying DEFAULT '[]')
 RETURNS TABLE(store_code character varying, store_name character varying, q_str_grade character varying, district character varying, state character varying, climate character varying, store_capacity integer, oh_it_oo integer, allocated_total integer, order_batching_finalized integer, net_available_capacity integer)
 LANGUAGE plpgsql
AS $function$
 
 declare
 	_query_combine text:= '';
 	v_gen_random_uuid text  := gen_random_uuid()::varchar;
 
begin			
_query_combine := '
 	with stores_in_allocation as (
	select 
		store
		,allocation_code
		,sum(allocated_total) as allocated_total
	from
		inventory_smart.create_allocation_result_flat_gurobi carfg 
	where 
		allocation_code = '''|| $1 ||'''
		group by 1,2
	)
	--	select * from stores_in_allocation;
  ,plan_master_data_ob as materialized (
                SELECT
                    plan_code,
                    plan_code as allocation_name,
                    created_at,
                    type as plan_type
                FROM
                    inventory_smart.plan_master
                WHERE 
                    status IN (2) 
                    AND is_deleted = false 
                    AND (
                            type IN (4, 5) 
                        OR (
                                type IN (0, 2) 
                                AND updated_at >= CURRENT_DATE AT TIME ZONE ''America/New_York''
                                AND updated_at < (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
                            )
                        ) 
                    AND 
                        created_at >= (CURRENT_DATE - INTERVAL ''15 days'') AT TIME ZONE ''America/New_York''
                        AND 
                        created_at <  (CURRENT_DATE + INTERVAL ''1 day'') AT TIME ZONE ''America/New_York''
            )
--            select * from plan_master_data_ob;
	,plan_master_data_finalized as materialized (
                SELECT
                    plan_code,
                    plan_code as allocation_name,
                    created_at,
                    type as plan_type
                FROM
                    inventory_smart.plan_master
                WHERE 
                    status IN (3) 
                    AND is_deleted = false 
                    AND    created_at >= CURRENT_DATE  AT TIME ZONE ''America/New_York''
            )
	--select * from plan_master_data_finalized;
	,plan_universe as (
		select * from (
			select * from plan_master_data_ob 
			union 
			select * from plan_master_data_finalized) a
			where plan_code not in ('''|| $1 ||''')
	)
	--select * from plan_universe;  
	,store_receival_date_metrics as (
   select store, sum(allocated_total) order_batching_finalized  from (
 	 select 
 	 	carfg.store, 
 	 	carfg.allocation_code,
 	 	sum(carfg.allocated_total) allocated_total,
 	 	case
			when carfg.inventory_source in (''dc'', ''ns'')  then carfg.delivery_dt::timestamptz + (interval ''1 day'' * coalesce(dc_store_transit_time, 0))
	        else carfg.delivery_dt::timestamptz
        end as store_receival_date
      from inventory_smart.create_allocation_result_flat_gurobi carfg 
      join plan_universe plm on carfg.allocation_code = plm.plan_code
      join stores_in_allocation sia on carfg.store = sia.store
      join global.store_attributes_filter saf on saf.store_code = sia.store
      group by carfg.allocation_code, carfg.store, carfg.inventory_source, carfg.delivery_dt, dc_store_transit_time
      ) a 
      where store_receival_date <= (CURRENT_DATE + interval ''7 days'') at TIME zone ''America/New_York'' 
      group by 1
 )
 -- select * from store_receival_date;
	, current_allocation_metrics as (
	-- Get store allocations on date of chosen allocation code
		select 
			store
			,coalesce(sum(allocated_total), 0) as allocated_total
		from 
			stores_in_allocation
		group by 1
	)
	--select * from current_allocation_metrics
	, stores_net_capacity as (
		select 
			cam.store as store_code
			,saf.store_name
			,saf.q_str_grade
			,saf.district
			,saf.state
			,saf.climate
			,coalesce(order_batching_finalized, 0)::integer as order_batching_finalized
			,coalesce(sum(saf.store_capacity), 0)::integer as store_capacity
			,coalesce(sum(sci.total_inv), 0)::integer as oh_it_oo
			,coalesce(sum(cam.allocated_total), 0)::integer as allocated_total
		from
			current_allocation_metrics cam
		left join 
			store_receival_date_metrics fm using (store)
		left join
			"global".store_attributes_filter saf on saf.store_code = cam.store
		left join
			inventory_smart.store_current_inventory sci using (store_code)
		group by 1,2,3,4,5,6,7
	)
	--select * from stores_net_capacity;
	, final_result as (
		select 
			store_code
			,store_name
			,q_str_grade
			,district
			,state
			,climate
			,store_capacity::integer
			,oh_it_oo::integer
			,allocated_total::integer
			,order_batching_finalized::integer
			,(store_capacity - (oh_it_oo + allocated_total + order_batching_finalized))::integer as net_available_capacity
		from 
			stores_net_capacity
	)
	select * from final_result where net_available_capacity < 0
 ';
 			raise notice '%', _query_combine;
           --  OPEN $1 FOR execute _query_combine;  
            --raise notice 'aha';
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.capacity_breach_store_list', 'Before returning function value',_query_combine,jsonb_build_object(   'allocation_code',$1));
 		RETURN QUERY execute _query_combine;	
 		--RETURN $1;
         end
 $function$
;