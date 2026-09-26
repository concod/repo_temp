--liquibase formatted sql
--changeset liquibase:get_oms_alert_initial_program_sku runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_alert_initial_program_sku
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_initial_program_sku(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_initial_program_sku(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_expedite_orders_sql  text:='';
  
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_expedite_orders_sql := '
            select 
              ''total''::text as label,count(*) as count
            from
              inventory_smart.oms_alerts_sku_loc oasl
            inner join 
              ('||v_pa_sql||') paf
            on
              oasl.product_code = paf.product_code 
            where
              oasl.initial_program_sku_flag
            union all
            select 
              ''resolved''::text as label,count(*) as count
            from
              inventory_smart.oms_alerts_sku_loc oasl
            inner join 
              ('||v_pa_sql||') paf
            on
              oasl.product_code = paf.product_code 
            where
              oasl.is_initial_program_sku_flag'; 
   
   raise notice 'v_expedite_orders_sql %',v_expedite_orders_sql;
   open $1 for execute v_expedite_orders_sql;
   RETURN $1;
 end
 $function$
;