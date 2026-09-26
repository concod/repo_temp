--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_delete_orders_carters_4 runOnChange:true stripComments:false splitStatements:false context:MTP-135352 labels:MTP-135352
--comment: implementing soft delete for oms_orders_approved table

--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_delete_orders(jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.oms_delete_orders(jsonb, integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
 /*
	Deletes orders from oms_Recommended and oms_approved_orders table
	id - sku id
 */
 declare
 	 _sku_ids int[] := ARRAY[]::int[];  
 	_query text;
   v_date_rec record;
 begin
   for v_date_rec in select * from jsonb_to_recordset($1) as x(id text, order_status_id int, order_gen_type text, order_id text, order_gen_type_category text)
 	loop
	 	
	 	--if its recommended/Edited/Scenario based order, then make the order status id to 0
 		if  v_date_rec.order_gen_type IN ('Recommended', 'Edited', 'Scenario') or v_date_rec.order_gen_type_category = 'Other' then
 			_query := 'update inventory_smart.oms_orders_recommended oor
        				set
        			   is_deleted = false,
        			   updated_at = now(),
                       order_status_id = 0,
                       updated_by = ' || $2 || 
    					' where 
				        oor.id = ' || v_date_rec.id;
			EXECUTE _query;
 		end if;
 			
 	    --delete from oms_orders_recommended table if its manual based order
 		if  v_date_rec.order_gen_type = 'Manual' or v_date_rec.order_gen_type_category = 'Manual' then
 			_query := 'delete from inventory_smart.oms_orders_recommended oor where oor.id = '|| v_date_rec.id ||' returning oor.id';
 		EXECUTE _query;
 		end if;
 		
 		--delete from approved orders table
 		if  v_date_rec.order_status_id = 3 then
 		
 			_query := 'update inventory_smart.oms_orders_approved ooa set is_deleted = TRUE, updated_at = now(), updated_by = ' || $2 || ' where ooa.id = '||  v_date_rec.id ||' returning ooa.id';
 		EXECUTE _query;
 		end if;
 		raise notice 'sku ids % , % ', _sku_ids, v_date_rec.id;
 		_sku_ids := array_append(_sku_ids, v_date_rec.id::int);
 	end loop;
 	   -- Get distinct values in sku_ids and hierarchy_ids
    _sku_ids := ARRAY(SELECT DISTINCT unnest(_sku_ids));
   RETURN jsonb_build_object(
    'sku_ids', ARRAY(SELECT DISTINCT unnest(_sku_ids))
	);
 end
 $function$
;