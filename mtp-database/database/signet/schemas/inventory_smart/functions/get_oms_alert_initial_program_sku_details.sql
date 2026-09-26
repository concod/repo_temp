--liquibase formatted sql
--changeset liquibase:get_oms_alert_initial_program_sku_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_alert_initial_program_sku_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_initial_program_sku_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_initial_program_sku_details(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql                    text:='';
   v_need_initial_program_sku_sql  text:='';
  
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_need_initial_program_sku_sql := '
     select
       *
     from (
            select
              oasl.id,
              paf.product_code,
              paf.product_description,
              paf.merchandise_category,
              paf.product_channel_name,
              paf.l0_name,
              paf.l1_name,  
              paf.l2_name,
              paf.planning_ownership,
 			 paf.sku_grade,
			 oasl.is_initial_program_sku_flag as is_resolved
            from
              inventory_smart.oms_alerts_sku_loc oasl
            inner join 
              ('||v_pa_sql||') paf
            on
              oasl.product_code = paf.product_code
            where
              oasl.initial_program_sku_flag
           ) X '|| global.form_table_query($3);
   
   raise notice 'v_need_before_next_roq_sql %',v_need_initial_program_sku_sql;
   open $1 for execute v_need_initial_program_sku_sql;
   RETURN $1;
 end
 $function$
;