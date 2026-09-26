--liquibase formatted sql
--changeset charan.reddy:get_oms_constraints_order_policy_update_9 runOnChange:true stripComments:false splitStatements:false context:MTP-90720 labels:MTP-87667-1
--comment: Refactor the query to use the filtered_paf CTE
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
                                                   
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
     v_meta_cls := REPLACE(v_meta_cls, 'WHERE', 'and');
   end if;
                                                   
                                         
                                         
  v_get_oms_constraints_order_policy_sql :='
    
    with filtered_paf as (
        SELECT DISTINCT ON (l4_name) 
            *
        FROM "global".product_attributes_filter 
        '||v_pa_sql||' and active = true and ordering = ''Y''
        ORDER BY l4_name DESC NULLS LAST
    )
    select * 
	from (
	SELECT 
	  row_number() OVER (PARTITION BY (ovdlt.article)  ORDER BY ovdlt.article  DESC, ovdlt.updated_at DESC) position,
          ovdlt.vendor_name,
          ovdlt.replenishment_strategy,
          CASE WHEN EXISTS ( SELECT 1 FROM inventory_smart.auto_allocation_scheduler aas WHERE aas.sh_name = ovdlt.scheduler and not aas.is_deleted) THEN ovdlt.scheduler ELSE ''-'' END AS scheduler,
          ovdlt.order_strategy,
          ovdlt.shipment_frequency,
          ovdlt.updated_at,
          ovdlt.vendor_code,
          ovdlt.article,
          ovdlt.id,
          ovdlt.column_updated,
          u1.name as updated_by,
          paf.l4_name,
          paf.style_name,
          paf.l1_name,
          paf.l2_name,
          paf.l3_name,
          paf.range_usa,
          paf.range_eu_uk,
          paf.range_au_nz,
          paf.range_asia,
          paf.range_africa
	  from
           filtered_paf paf
           inner join inventory_smart.oms_constraints_order_policy ovdlt
           on
               ovdlt.article  = paf.l4_name
          left join
            global.user_master u1 on u1.user_code = ovdlt.updated_by  
	) temp 
    where position =1'||v_meta_cls;
  
  raise notice 'v_get_oms_constraints_order_policy_sql %',v_get_oms_constraints_order_policy_sql;
 
  open $1 for execute v_get_oms_constraints_order_policy_sql;
  perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_order_policy', 'Before Return',v_get_oms_constraints_order_policy_sql,jsonb_build_object('product_filter', $2, 'Meta_filter', $3));	
  RETURN v_get_oms_constraints_order_policy_sql;
end
$function$
;
