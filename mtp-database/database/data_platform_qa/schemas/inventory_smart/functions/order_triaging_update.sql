--liquibase formatted sql
--changeset liquibase:order_triaging_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for order_triaging_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_triaging_update(jsonb, integer, integer);
CREATE OR REPLACE FUNCTION inventory_smart.order_triaging_update(jsonb, integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
		_input jsonb;
		_article text:='';
		_store text:='';
		_code text:='';
		_delivery_dt varchar;
		_order_type varchar;
		_stat int:=0;
		_arr text[];
	begin
		raise notice 'Status: %', $2;
		raise notice 'User: %', $3;
		_stat := $2::integer;
		for _input in select * from jsonb_array_elements($1) WHERE value IS NOT NULL
		loop
			_article :=_input->>'article'::text;
			_store :=_input->>'store'::text;
			_code :=_input->>'allocation_code'::text;
			_delivery_dt :=_input->>'delivery_dt'::varchar;
			_order_type :=_input->>'order_type'::varchar;
			if _stat = 3 and coalesce(_code, '') <> '' 
			then 
				_arr=array_append(_arr,_code);
			end if;
			if coalesce(_article, '') <> '' and coalesce(_store, '') <> '' and coalesce(_code, '') <> ''
			then 
				update inventory_smart.create_allocation_result_flat_gurobi set 
				delivery_dt= (case when coalesce(_delivery_dt, '') = '' then delivery_dt else to_timestamp(_delivery_dt, 'MM/DD/YYYY') end),
				order_type=(case when coalesce(_order_type, '') = '' then order_type else _order_type end),
				updated_by = $3::integer,
				updated_at = now()
				where article =_article and store = _store and allocation_code =_code;
			end if;
		END loop;
		if cardinality(_arr) > 0 then
			update inventory_smart.plan_master set status = 3, updated_by = $3::integer, updated_at = now() where plan_code = any(_arr);
		end if;
	end
$function$
;
