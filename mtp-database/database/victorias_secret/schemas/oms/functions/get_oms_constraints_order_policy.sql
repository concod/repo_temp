--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_constraints_order_policy_vs_4 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-118070
--comment: Added new columns from product_attributes_filter table.

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
	
	
   v_pa_sql :=global.form_main_table_filters(
		  'product_attributes_filter',
		  product_filter
		);
  v_pa_sql := REPLACE(v_pa_sql, ' product_code ', ' paf.product_code ');
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
     v_meta_cls := REPLACE(v_meta_cls, 'WHERE', 'and');
   end if;
                                                   
                                         
                                         
  v_get_oms_constraints_order_policy_sql :='
    
    select * 
	from (
	SELECT 
	  row_number() OVER (PARTITION BY (ovdlt.article)  ORDER BY ovdlt.article  DESC, ovdlt.updated_at DESC) position ,ovdlt.article, ovdlt.loc_code,
          ovdlt.vendor_name,
          ovdlt.replenishment_strategy,
          CASE WHEN EXISTS ( SELECT 1 FROM inventory_smart.auto_allocation_scheduler aas WHERE aas.sh_name = ovdlt.scheduler and not aas.is_deleted) THEN ovdlt.scheduler ELSE ''-'' END AS scheduler,
          ovdlt.order_strategy,
          ovdlt.shipment_frequency,
          ovdlt.updated_at,
          ovdlt.vendor_code,
          ovdlt.id,
          ovdlt.column_updated,
          u1.name as updated_by,
          paf.l6_id,
          paf.l0_name,
          paf.l2_name,
          paf.l6_name,
          paf.l3_name,
          paf.l4_name,
          paf.masterstyle_descr,
          paf.l5_name,
          paf.color,
          paf.subbrand_code_desc,
          paf.collection,
          paf.current_assortment_group,
          paf.product_lifecycle,
          paf.flex_style,
          paf.generic,
          paf.sizes_mat,
          paf.form,
          paf.user_defined_1,
          paf.user_defined_2,
          paf.user_defined_3,
          paf.user_defined_4,
          paf.user_defined_5,
          paf.user_defined_6
	  from
           inventory_smart.oms_constraints_order_policy ovdlt
           left join 
             "global".product_attributes_filter paf 
           on
               ovdlt.article  = paf.article
          left join
            global.user_master u1 on u1.user_code = ovdlt.updated_by
                '||v_pa_sql||'  and paf.active and paf.ordering = ''Y''
        
	) temp 
    where position =1'||v_meta_cls;
  
  raise notice 'v_get_oms_constraints_order_policy_sql %',v_get_oms_constraints_order_policy_sql;
 
  open $1 for execute v_get_oms_constraints_order_policy_sql;
  perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_order_policy', 'Before Return',v_get_oms_constraints_order_policy_sql,jsonb_build_object('product_filter', $2, 'Meta_filter', $3));	
  RETURN v_get_oms_constraints_order_policy_sql;
end
$function$
;
