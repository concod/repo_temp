--liquibase formatted sql
--changeset liquibase:order_triaging_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for order_triaging_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_triaging_update(jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.order_triaging_update(jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	begin
		
		update
		inventory_smart.create_allocation_result_flat_gurobi carfg
			set 
				delivery_dt = (case
				when coalesce(rec.delivery_dt, '')= '' then null
				else to_timestamp(rec.delivery_dt, 'MM/DD/YYYY')::timestamp
			end),
				order_type =(case
				when coalesce(rec.order_type, '')= '' then carfg.order_type
				else rec.order_type
			end),
				updated_by = $2,
				updated_at = now()
			from 
			(
				select
					inp.allocation_code::text as allocation_code,
					inp.article::text as article,
					inp.store::text as store,
					inp.delivery_dt::varchar as delivery_dt,
					inp.order_type::varchar as order_type
				FROM	
				(
					select
						value->>'allocation_code' as allocation_code,
						value->>'article'  as article,
						value->>'store' as store,
						value->>'delivery_dt' as delivery_dt,
						value->>'order_type' as order_type
					from
						jsonb_array_elements($1)
				) inp
				where
					coalesce(inp.allocation_code,'') <> ''
					and coalesce(inp.article,'') <> ''
					and coalesce(inp.store,'') <> ''
			) rec
		where
		carfg.allocation_code = rec.allocation_code
		and carfg.article = rec.article
		and carfg.store = rec.store;
	end
	$function$
;
