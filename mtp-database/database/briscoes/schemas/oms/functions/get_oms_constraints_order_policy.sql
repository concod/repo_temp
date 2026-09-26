--liquibase formatted sql
--changeset priyansh.gautam:get_oms_constraints_order_policy_update11 runOnChange:true stripComments:false splitStatements:false context:MTP-90630 labels: MTP-109832
--comment: MTP-109832_adding_auto_approve_column
--rollback: SELECT 1


DROP FUNCTION if EXISTS inventory_smart.get_oms_constraints_order_policy(refcursor, jsonb, jsonb);

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
  v_pa_sql := replace(v_pa_sql, 'vendor_location', 'paf.vendor_location');
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
     v_meta_cls := REPLACE(v_meta_cls, 'WHERE', 'and');
   end if;
                                                   
                                         
                                         
  v_get_oms_constraints_order_policy_sql :='
    
    select * 
	from (
	SELECT 
	  row_number() OVER (PARTITION BY (ovdlt.article)  ORDER BY ovdlt.article  DESC) position , 
    ovdlt.article,
    ovdlt.vendor_code ,
    ovdlt.vendor_name  ,
    ovdlt.replenishment_strategy ,
    ovdlt.order_strategy ,
    ovdlt.shipment_frequency  ,
    ovdlt.created_by ,
    ovdlt.created_at ,
    ovdlt.updated_by,
    ovdlt.updated_at,
    ovdlt.column_updated,
    ovdlt.id,
    ovdlt.channel,
    case
			when exists (
			select
				1
			from
				inventory_smart.auto_allocation_scheduler aas
			where
				aas.sh_name = ovdlt.scheduler
				and not aas.is_deleted) then ovdlt.scheduler
			else ''-''
		end as scheduler,
		um.name as updated_by_name,
		u.name as created_by_name,
		paf.l0_name,
		paf.l1_name,
		paf.l2_name,
		paf.product_code,
		paf.style_name,
		paf.l6_name,
		paf.color,
		paf.l3_name,
		paf.l4_name,
		paf.l5_name,
		ovdlt.auto_approve as auto_approve
    from
           inventory_smart.oms_constraints_order_policy ovdlt
           left join global.user_master um 
 		        on ovdlt.updated_by=um.user_code
          left join
            global.user_master u on u.user_code = ovdlt.created_by 
           left join 
             "global".product_attributes_filter paf 
           on
               ovdlt.article  = paf.article
                '||v_pa_sql||' and paf.active and paf.ordering = ''Y''
	) temp 
    where position =1'||v_meta_cls;
  
  raise notice 'v_get_oms_constraints_order_policy_sql %',v_get_oms_constraints_order_policy_sql;
 
  open $1 for execute v_get_oms_constraints_order_policy_sql;
  perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_order_policy', 'Before Return',v_get_oms_constraints_order_policy_sql,jsonb_build_object('product_filter', $2, 'Meta_filter', $3));	
  RETURN v_get_oms_constraints_order_policy_sql;
end
$function$
;
