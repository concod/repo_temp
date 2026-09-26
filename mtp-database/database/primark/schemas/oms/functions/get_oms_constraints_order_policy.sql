--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_constraints_order_policy_update_12 runOnChange:true stripComments:false splitStatements:false context:MTP-59023 labels:MTP-87667v5
--comment: MTP-59023:Initial version of get_oms_constraints_order_policy added update11
--rollback: SELECT 1

DROP FUNCTION if EXISTS oms.get_oms_constraints_order_policy(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION oms.get_oms_constraints_order_policy(input refcursor, product_filter jsonb, meta_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_oms_constraints_order_policy_sql  text:='';
  v_pa_sql text:='';
   v_meta_cls text:=''; 
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
	
	
   v_pa_sql :=oms.form_main_table_filters(
		  'ph_master',
		  product_filter
		);
            
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
     v_meta_cls := REPLACE(v_meta_cls, 'WHERE', 'and');
   end if;

	IF position('article' in v_pa_sql) > 0 THEN
	  v_pa_sql := regexp_replace(v_pa_sql, '\yarticle\y', 'ovdlt.article', 'g');
	END IF;
	
	-- outside subquery
	IF position('article' in v_meta_cls) > 0 THEN
	  v_meta_cls := regexp_replace(v_meta_cls, '\yarticle\y', 'temp.article', 'g');
	END IF;
                                         
  v_get_oms_constraints_order_policy_sql :='
    
    select * 
	from (
	SELECT 
	  row_number() OVER (PARTITION BY (ovdlt.article)  ORDER BY ovdlt.article  DESC) position ,
    ovdlt.article,
    ovdlt.loc_code,
    ovdlt.created_at,
    ovdlt.updated_at,
    ovdlt.replenishment_strategy,
    ovdlt.order_strategy,
    CASE WHEN EXISTS ( SELECT 1 FROM inventory_smart.auto_allocation_scheduler aas WHERE aas.sh_name = ovdlt.shipment_scheduler and not aas.is_deleted) THEN ovdlt.shipment_scheduler ELSE ''Default Rule'' END AS shipment_scheduler,
    CASE WHEN EXISTS ( SELECT 1 FROM inventory_smart.auto_allocation_scheduler aas WHERE aas.sh_name = ovdlt.scheduler and not aas.is_deleted) THEN ovdlt.scheduler ELSE ''Default Rule'' END AS scheduler,
    paf.product_description,
    paf.l2_name,
    paf.l0_name,
    paf.primary_vendor_name,
    paf.product_code,
    paf.product_type,
    opc.size,
    paf.color,
    paf.l1_name,
    u.name as created_by,
    u1.name as updated_by,
    ovdlt.id,
    CASE WHEN opc.size IS NULL THEN false ELSE true END as pack_config,
    ovdlt.auto_approve
	  from
           oms.oms_constraints_order_policy ovdlt
           left join 
             "global".product_attributes_filter paf 
           on
               ovdlt.article  = paf.article
           left join
             oms.oms_pack_config opc
           on
               ovdlt.article = opc.article
           left join
             global.user_master u on u.user_code = ovdlt.created_by 
           left join
             global.user_master u1 on u1.user_code = ovdlt.updated_by::int
                '||v_pa_sql||'
	) temp 
    where position =1'||v_meta_cls;
  
  raise notice 'v_get_oms_constraints_order_policy_sql %',v_get_oms_constraints_order_policy_sql;
 
  open $1 for execute v_get_oms_constraints_order_policy_sql;
  perform  global.sp_log(v_gen_random_uuid, 'oms.get_oms_constraints_order_policy', 'Before Return',v_get_oms_constraints_order_policy_sql,jsonb_build_object('product_filter', $2, 'Meta_filter', $3));	
  RETURN v_get_oms_constraints_order_policy_sql;
end
$function$
;
