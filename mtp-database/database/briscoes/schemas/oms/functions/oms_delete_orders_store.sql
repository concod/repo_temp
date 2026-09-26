--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:oms_delete_orders_store runOnChange:true stripComments:false splitStatements:false context:MTP-96067 labels:MTP-96130
--comment: MTP-96067 MTP-96130
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_delete_orders_store(jsonb, integer);

CREATE OR REPLACE FUNCTION inventory_smart.oms_delete_orders_store(jsonb, integer)
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
   --using their order ids, get the details and store it using select *,
   for v_date_rec in select * from jsonb_to_recordset($1) as x(id text, order_status_id int, order_gen_type text, order_id text, order_gen_type_category text)
 	loop
	 	--if its recommended based order, then make the order status id to 0
 		if  v_date_rec.order_gen_type in ('Recommended', 'Scenario', 'Edited') or v_date_rec.order_gen_type_category = 'Other' then
 			_query := 'update inventory_smart.oms_orders_recommended_store oor
        				set
        			   is_deleted = false,
        			   updated_at = now(),
                       order_status_id = 0,
                       updated_by = ' || $2 || 
    					' where 
				        oor.id = ' || v_date_rec.id;
			raise notice '1 %',_query;
			EXECUTE _query;
 		end if;
 			
 	    --delete from oms_orders_recommended_store table if its manual based order
 		if  v_date_rec.order_gen_type = 'Manual' or v_date_rec.order_gen_type_category = 'Manual' then
 			_query := 'delete from inventory_smart.oms_orders_recommended_store oor where oor.id = '|| v_date_rec.id ||' returning oor.id';
		raise notice '2 %',_query;
 		EXECUTE _query;
 		end if;
 		
 		--delete from approved orders table
 		if  v_date_rec.order_status_id = 3 then
 		
 			_query := 'delete from inventory_smart.oms_orders_approved_store ooa where ooa.id = '||  v_date_rec.id ||' returning ooa.id';
		raise notice '3 %',_query;
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
