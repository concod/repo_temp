--liquibase formatted sql
--changeset aman.pareek@impactanalytics.co:action_oms_orders runOnChange:true stripComments:false splitStatements:false context:MTP-34715 labels:added_comment_column
--comment: added comment column
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.action_oms_orders(jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.action_oms_orders(jsonb)
 RETURNS integer[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 declare
   _key              text;
   _value            text;
   i                 record;
   v_order_status_id int;
   v_action_id       int;
   v_order_id        int[];
   v_comment         text;
   v_user_id         int;
   v_affected_rows   int:=0;
   approved_ids int[];
 
   
  
 begin
   for _key, _value in select * from jsonb_each_text($1) where value is not null loop
     if _key = 'status' then
 	  v_order_status_id := _value::int;
 	  raise notice 'order_status_id %',v_order_status_id;
 	elsif _key = 'action_code' then
 	  v_action_id := _value;
 	  raise notice 'action_code %',v_action_id;
 	elsif _key = 'orders_id' then
 	  v_order_id := _value::int[];
 	  /*foreach i in array v_order_id
 	  loop
 	    raise notice 'orders_id %',i;
 	  end loop;*/
 	  raise notice 'orders_id %', array_to_string(v_order_id,',');
 	elsif _key = 'comment' then
 	  v_comment := _value;
 	  raise notice 'comment %',v_comment;
     elsif _key = 'user_id' then
 	  v_user_id := _value;
 	  raise notice 'user_id %',v_user_id;
 	end if;
   end loop;
   
   if v_order_status_id in (1,2,-1)
   then
     with t as (update
       inventory_smart.oms_orders_recommended
     set
       order_status_id = v_order_status_id,
       updated_by = v_user_id,
       updated_at = current_timestamp,
       approve_by_date = current_date+7
     where
       id = ANY(v_order_id::int[])
     returning id)
    select array_agg(id) into approved_ids from t;
      
     GET DIAGNOSTICS v_affected_rows = ROW_COUNT ;
    
     insert into inventory_smart.oms_orders_approval_hist  
     select a.id, a.ord_id, b.action_id, b."comment", b.actioned_by, b.actioned_at
     from
     (select nextval('inventory_smart.oms_orders_approval_hist_id_seq') as id ,  UNNEST(v_order_id::int[]) as ord_id ) a
     cross join
     (select v_action_id as action_id,
             v_comment as "comment",
             v_user_id as actioned_by,
             current_timestamp as actioned_at
     ) b;
    
   elsif v_order_status_id in (3)
   then
    raise notice 'start %',v_order_status_id;
     
     with t as (insert into inventory_smart.oms_orders_approved
      (  id,
 		order_gen_type,
 		product_code,
 		loc_code,
 		vendor_code,
 		rop,
 		grade,
 		order_quantity,
 		unit_cost,
 		roq_constrained,
 		roq_unconstrained,
 		order_placement_date,
 		order_placement_recom_date,
 		expected_receipt_date,
 		rop_ideal,
 		lead_time,
 		effective_lead_time,
 		store_inv,
 		dc_inv,
 		system_inv,
 		mrpc,
 		min_order_quantity,
 		max_order_quantity,
 		pack_size,
 		inventory_hold,
 		not_before_date,
         not_after_date,
 		order_status_id,
 		created_by,
 		created_at,
 		updated_by,
 		edit_by_date,
 		is_deleted,
		comment

 	 )
     select
         oor.id,
 		oor.order_gen_type,
 		oor.product_code,
 		oor.loc_code,
 		oor.vendor_code,
 		oor.rop,
 		oor.grade,
 		oor.order_quantity,
 		oor.unit_cost,
 		oor.roq_constrained,
 		oor.roq_unconstrained,
 		current_date as order_placement_date ,
 		oor.order_placement_recom_date,
 		oor.expected_receipt_date,
 		oor.rop_ideal,
 		oor.lead_time,
 		oor.effective_lead_time,
 		ok.store_inv,
 		ok.dc_inv,
 		ok.system_inv,
 		ok.mrpc,
 		oor.min_order_quantity,
 		oor.max_order_quantity,
 		oor.pack_size,
 		oor.inventory_hold,
 		oor.editable_not_before_date as not_before_date,
         oor.editable_not_after_date as not_after_date,
 		3 as order_status_id,
 		v_user_id as created_by,
 		current_timestamp  as created_at,
 		null as updated_by,
 		current_date + 28 edit_by_date,
 		false as is_deleted,
		v_comment::text
     from inventory_smart.oms_orders_recommended oor
     left join inventory_smart.oms_kpi ok
     on oor.product_code = ok.product_code
     and oor.loc_code = ok.loc_code
     where oor.order_quantity > 0 and id = ANY(v_order_id::int[])on conflict do nothing returning id)
    select array_agg(id) into approved_ids from t;
    
    
    
    
     
     GET DIAGNOSTICS v_affected_rows = ROW_COUNT ;
     
     if v_affected_rows > 0
     then
       -- removing delete instead updating is_delete flag
       --delete from inventory_smart.oms_orders_recommended oor
       --where id = ANY(v_order_id::int[]);
       -- Soft delete and mark the order as approved
       update inventory_smart.oms_orders_recommended oor
       set is_deleted = true, order_placement_date=current_date, order_status_id=3
       where id = ANY(approved_ids::int[]);
     end if;
 
     insert into inventory_smart.oms_orders_approval_hist  
     select a.id, a.ord_id, b.action_id, b."comment", b.actioned_by, b.actioned_at
     from
       (select nextval('inventory_smart.oms_orders_approval_hist_id_seq') as id, 
        UNNEST(approved_ids::int[]) as ord_id 
       ) a
     cross join
       (select v_action_id as action_id,
               v_comment as "comment",
               v_user_id as actioned_by,
               current_timestamp as actioned_at
       ) b;
   end if;
  
   return approved_ids;
 end
 $function$
;
