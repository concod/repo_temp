--liquibase formatted sql
--changeset ajunravi:store-level-capacity-related-changes stripComments:false splitStatements:false runOnChange:true context:MTP-23072 labels:MTP-41571-MTP-41570
--comment MTP-41571-MTP-41570
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_capacity(input jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_capacity(input jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	query_combine text;
	begin
		query := $$
        UPDATE 
		  inventory_smart.store_unit_capacity t1 
		SET 
		  unit_capacity = coalesce(t2.unit_capacity :: FLOAT, t1.unit_capacity :: FLOAT),
		  receipt_capacity = coalesce(t2.receipt_capacity :: FLOAT, t1.receipt_capacity :: FLOAT),
		  carton_capacity = coalesce(t2.carton_capacity :: FLOAT, t1.carton_capacity :: FLOAT),
		  upload_flag = 'false',
		  updated_at = now(), 
		  updated_by = %2$s 
		FROM 
		  (
		    select
		      product_hierarchy,
		      store_code,
		      (vals->>'unit_capacity') as unit_capacity,
		      (vals->>'receipt_capacity') as receipt_capacity,
		      (vals->>'carton_capacity') as carton_capacity
		    from 
		      (
		        select
		          value->>'store_code' as store_code,
		          (value->>'values')::jsonb as vals
		        from 
		          jsonb_array_elements('%1$s')
		      ) inp 
		      join inventory_smart.store_unit_capacity using(store_code)
		  ) t2 
		WHERE 
		  t1.store_code = t2.store_code;
		$$;
		query_combine := format(query, $1, $2);
		raise notice '$1%  ',$1;
		raise notice '$2%  ',$2;
		raise notice 'query% ',query_combine;
		execute query_combine;
	end
	$function$
;