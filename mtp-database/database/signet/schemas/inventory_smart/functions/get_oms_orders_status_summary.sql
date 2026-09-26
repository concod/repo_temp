--liquibase formatted sql
--changeset liquibase:get_oms_orders_status_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_orders_status_summary
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_orders_status_summary(input refcursor, jsonb, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_orders_status_summary(input refcursor, jsonb, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                     text:='';
  v_orders_status_summary_sql  text:='';
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_orders_status_summary_sql := '
           select 
             oor.order_status_id,
             count(*) as orders_cnt_by_status,
             sum(order_quantity) as order_qty_by_status,
             sum(order_quantity*unit_cost) as order_cost_by_status
           from
             inventory_smart.oms_orders_recommended oor
           inner join 
             ('||v_pa_sql||') paf
           on
             oor.product_code = paf.product_code 
           where
			 -- Removing date filter for now, to be implemented in future
             -- oor.ROP between '||''''||$3||''''||'::date and '||''''||$4||''''||'::date 
           -- and
             not oor.is_deleted
           group by
             oor.order_status_id
           union all
           select 
             ooa.order_status_id,
             count(*) as orders_by_status,
             sum(order_quantity) as order_qty_by_status,
             sum(order_quantity*unit_cost) as order_cost_by_status
           from
             inventory_smart.oms_orders_approved ooa
           inner join 
             ('||v_pa_sql||') paf
           on
             ooa.product_code = paf.product_code 
		   inner join
             global.distribution_centres dc
           on
             ooa.loc_code = dc.linked_store_code
           and
             not dc.is_deleted 
           where
			 -- Removing date filter for now, to be implemented in future
             -- ooa.ROP between '||''''||$3||''''||'::date and '||''''||$4||''''||'::date 
           -- and
		   ooa.order_placement_date >= (CURRENT_DATE - interval ''28 day'')::date
		   and
             not ooa.is_deleted
           group by
             ooa.order_status_id';
  
  raise notice 'v_orders_status_summary_sql %',v_orders_status_summary_sql;
  open $1 for execute v_orders_status_summary_sql;
  RETURN $1;
end
$function$
;

