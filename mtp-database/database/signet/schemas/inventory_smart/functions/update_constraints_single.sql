--liquibase formatted sql
--changeset liquibase:update_constraints_single runOnChange:true stripComments:false splitStatements:false context:changing table to constraint_master labels:changing table to constraint_master
--comment: changing table to constraint_master replicating the same functionality as prod
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_constraints_single(input jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_constraints_single(input jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	begin
        UPDATE 
		  inventory_smart.constraint_master t1 
		SET 
		  min_stock = coalesce(t2.min_stock, t1.min_stock), 
		  max_stock = coalesce(t2.max_stock, t1.max_stock), 
		  wos = coalesce(t2.wos, t1.wos), 
		  updated_at = now(), 
		  updated_by = $2 
		FROM 
		  (
		    select 
		      store_code, product_code, 
		      (vals->>'min'):: float4 as min_stock, 
		      (vals->>'max'):: float4 as max_stock, 
		      (vals->>'wos'):: float4 as wos 
		    from 
		      (
		        select 
		          value->>'product_code' as product_code, 
		          (value->>'values')::jsonb as vals, 
		          (
		            jsonb_array_elements_text(
		              (value->>'stores')::jsonb
		            )
		          ):: varchar as store_code 
		        from 
		          jsonb_array_elements($1)
		      ) inp 
		      join "global".product_mapping_product_store using(product_code, store_code)
		  ) t2 
		WHERE 
		  t1.store_code = t2.store_code and t1.product_code = t2.product_code;
	end
	$function$
;