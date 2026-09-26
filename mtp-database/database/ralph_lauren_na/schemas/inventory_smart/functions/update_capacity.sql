--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:update_upload_flag stripComments:false splitStatements:false runOnChange:true context:MTP-47654 labels:MTP-47654 
--comment MTP-47654 - Konakandla Sujan | MTP-47654
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
		  updated_at = now(), 
		  updated_by = %2$s,
		  upload_flag = 'false'
		FROM 
		  (
		    select
		      product_hierarchy,
		      store_code,
		      (vals->>'unit_capacity') as unit_capacity
		    from 
		      (
		        select 
		          value->>'product_hierarchy' as product_hierarchy,
		          value->>'store_code' as store_code,
		          (value->>'values')::jsonb as vals
		        from 
		          jsonb_array_elements('%1$s')
		      ) inp 
		      join inventory_smart.store_unit_capacity using(product_hierarchy, store_code)
		  ) t2 
		WHERE 
		  t1.store_code = t2.store_code and t1.product_hierarchy = t2.product_hierarchy;
		$$;
		query_combine := format(query, $1, $2);
		raise notice '$1%  ',$1;
		raise notice '$2%  ',$2;
		raise notice 'query% ',query_combine;
		execute query_combine;
	end
	$function$
;
