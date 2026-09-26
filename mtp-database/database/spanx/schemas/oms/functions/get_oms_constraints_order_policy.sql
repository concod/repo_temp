--liquibase formatted sql
--changeset AmanPareek:get_oms_constraints_order_policy_ordering_update3 runOnChange:true stripComments:false splitStatements:false context:MTP-71122 labels:MTP-87667.1
--comment: MTP-76512 get_oms_constraints_order_policy_ordering_update2
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
    
  select * from
  (
    select * 
	from (
	SELECT 
	  row_number() OVER (PARTITION BY (ovdlt.article)  ORDER BY ovdlt.article  DESC) position , 
    ovdlt.id,
    ovdlt.article,
    ovdlt.loc_code,
    ovdlt.vendor_code,
    ovdlt.vendor_name,
    ovdlt.replenishment_strategy,
    CASE WHEN EXISTS ( SELECT 1 FROM inventory_smart.auto_allocation_scheduler aas WHERE aas.sh_name = ovdlt.scheduler and not aas.is_deleted) THEN ovdlt.scheduler ELSE ''-'' END AS scheduler,
    ovdlt.order_strategy,
    ovdlt.shipment_frequency,
    ovdlt.created_by,
    ovdlt.created_at,
    ovdlt.updated_by,
    ovdlt.updated_at,
    um.name as user_name, 
    paf.l0_name,
    paf.l1_name,
    paf.l2_name,
    paf.l3_name,
    paf.l4_name,
    paf.product_lifecycle,
    paf.color_launch_season
	  from
           inventory_smart.oms_constraints_order_policy ovdlt
           left join 
             "global".product_attributes_filter paf 
           on
               ovdlt.article  = paf.article
            left join 
           		global.user_master um 
           on ovdlt.updated_by=um.user_code
                '||v_pa_sql||' and paf.active and paf.ordering = ''Y''
	) temp 
    where position =1) t2'||v_meta_cls;
  
  raise notice 'v_get_oms_constraints_order_policy_sql %',v_get_oms_constraints_order_policy_sql;
 
  open input for execute v_get_oms_constraints_order_policy_sql;
  RETURN v_get_oms_constraints_order_policy_sql;
end
$function$
;
