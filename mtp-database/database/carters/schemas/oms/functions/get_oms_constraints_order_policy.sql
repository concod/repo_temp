--liquibase formatted sql
--changeset aman.pareek:get_oms_constraints_order_policy_updated_4 runOnChange:true stripComments:false splitStatements:false context:MTP-60125 labels:MTP-81294_1
--comment: MTP-82921.
--rollback: SELECT 1


DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_order_policy(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_order_policy(input refcursor, product_filter jsonb, meta_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_oms_constraints_order_policy_sql  text:='';
  v_pa_sql text:='';
   v_meta_cls text:=''; 
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
	
	
   v_pa_sql :=inventory_smart.form_main_table_filters(
		  'ph_master',
		  product_filter
		);
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
                                                   
                                         
                                         
  v_get_oms_constraints_order_policy_sql :='
  select * from (
	
  SELECT 

    paf.style,
    paf.style_description,
    paf.l2_name as brand,
    paf.l3_name as sbu,
    paf.l4_name as department,
    paf.l5_name as collection_total,
    paf.class,
    paf.season,
    paf.collection,

    max(new_hier) as new_hier,
    max(ovdlt.vendor_name) as vendor_name,
    max(ovdlt.replenishment_strategy) as replenishment_strategy,
    max(
        CASE WHEN EXISTS (
                    SELECT 1 
                    FROM inventory_smart.auto_allocation_scheduler aas 
                    WHERE aas.sh_name = ovdlt.scheduler and not aas.is_deleted
        ) THEN ovdlt.scheduler ELSE ''-'' END
    ) as scheduler,
    max(ovdlt.order_strategy) as order_strategy,
    max(ovdlt.shipment_frequency) as shipment_frequency,
    max(ovdlt.updated_at) as updated_at,
    max(ovdlt.vendor_code) as vendor_code,
    max(ovdlt.id) as id,
    max(u1.name) as updated_by
          
  	from
           "global".product_attributes_filter paf 
    left join 
            inventory_smart.oms_constraints_order_policy ovdlt on ovdlt.article  = paf.article
    left join
            global.user_master u1 on u1.user_code = ovdlt.updated_by
    '||v_pa_sql||'  and paf.active_ladder_flg = True and paf.replenishment_status in (''Laddering'',''Laddering and Ordering'')
    group by 1,2,3,4,5,6,7,8,9
    
	) X '||v_meta_cls;
  
  raise notice 'v_get_oms_constraints_order_policy_sql %',v_get_oms_constraints_order_policy_sql;
 
  open $1 for execute v_get_oms_constraints_order_policy_sql;
  perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_order_policy', 'Before function return value',v_get_oms_constraints_order_policy_sql,jsonb_build_object('Product_Filter',$2,'meta_filter',$3));

  RETURN v_get_oms_constraints_order_policy_sql;
end
$function$
;
