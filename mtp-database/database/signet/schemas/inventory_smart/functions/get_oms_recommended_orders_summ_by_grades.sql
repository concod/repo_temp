--liquibase formatted sql
--changeset jitendra.singh@impactanalytics.co:get_oms_recommended_orders_summ_by_grades runOnChange:true stripComments:false splitStatements:false context:MTP-22067 labels:add_order_qty
--comment: added order qty on OMS screen
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_recommended_orders_summ_by_grades(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_recommended_orders_summ_by_grades(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql           text:='';
  v_orders_summ_sql  text:='';
  v_date_filter      text:='';
  v_date_rec         record;
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  for v_date_rec in select * from jsonb_to_recordset($3) as x(attribute_name text, "start_date" date, "end_date" date)
  loop
		v_date_filter := v_date_filter||' and oor.'||v_date_rec.attribute_name||' between ''' ||v_date_rec.start_date||''' and '''||v_date_rec.end_date||'''';
  end loop;

  v_orders_summ_sql := '
           select 
             oor.grade,
             paf.planning_ownership ,
             sum(ROQ_constrained) as constrained_qty_by_grade,
             sum(roq_unconstrained) as unconstrained_qty_by_grade,
             sum(order_quantity) as order_qty_by_grade,
             sum(ROQ_constrained*unit_cost) as constrained_cost_by_grade,
             sum(roq_unconstrained*unit_cost) as unconstrained_cost_by_grade,
             sum(order_quantity*unit_cost) as order_cost_by_grade
           from
             inventory_smart.oms_orders_recommended oor
           inner join 
             ('||v_pa_sql||') paf
           on
             oor.product_code = paf.product_code 
           where
             oor.order_status_id = 0
             '||v_date_filter||'
           and
             not oor.is_deleted
           group by
             oor.grade,paf.planning_ownership';
  
  raise notice 'v_orders_summ_sql %',v_orders_summ_sql;
  open $1 for execute v_orders_summ_sql;
  RETURN $1;
end
$function$
;