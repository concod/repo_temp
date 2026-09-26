--liquibase formatted sql
--changeset liquibase:get_oms_subclass_sku_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_subclass_sku_summary
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_subclass_sku_summary(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_subclass_sku_summary(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                text:='';
  v_eligible_skus_sql     text:='';
  v_filtered_skus_sql     text:='';
  v_recom_skus_sql        text:='';
  v_pending_orders_sql    text:='';
  v_subclass_sku_summ_sql text:='';
  v_date_filter           text:='';
  v_date_rec              record;
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  for v_date_rec in select * from jsonb_to_recordset($3) as x(attribute_name text, "start_date" date, "end_date" date)
  loop
		v_date_filter := v_date_filter||' and oor.'||v_date_rec.attribute_name||' between ''' ||v_date_rec.start_date||''' and '''||v_date_rec.end_date||'''';
  end loop;

  v_eligible_skus_sql := '                                                
   select l2_name,count(distinct p.product_code) as eligible_skus   from "global".product_attributes_filter p
where ordering  = ''Y'' and l2_name in (select distinct l2_name from ('||v_pa_sql||') paf) and product_channel_name in (select distinct product_channel_name from ('||v_pa_sql||') paf)
group by 1';
  raise notice 'v_eligible_skus_sql %',v_eligible_skus_sql;
 
  v_filtered_skus_sql := '                                                
    select 
      l2_name,
      count(distinct oor.product_code) as filtered_skus  
    from
      inventory_smart.oms_orders_recommended oor
    inner join 
      ('||v_pa_sql||') paf
    on
      oor.product_code = paf.product_code
    where
      not oor.is_deleted
      '||v_date_filter||'
    group by
      l2_name';
     
  raise notice 'v_filtered_skus_sql %',v_filtered_skus_sql;
 
  v_recom_skus_sql := '
    select 
      l2_name,
      count(distinct oor.product_code) as recom_skus  
    from
      inventory_smart.oms_orders_recommended oor
    inner join 
      ('||v_pa_sql||') paf
    on
      oor.product_code = paf.product_code
    where
      not oor.is_deleted
      '||v_date_filter||'
	and 
	  oor.roq_unconstrained>0
    group by
      l2_name';
     
  raise notice 'v_recom_skus_sql %',v_recom_skus_sql;
 
  v_pending_orders_sql := '
    select 
      l2_name,
      count(id) as pending_orders 
    from
      inventory_smart.oms_orders_recommended oor
    inner join 
      ('||v_pa_sql||') paf
    on
      oor.product_code = paf.product_code
    where
      oor.order_status_id in (1,2)
      '||v_date_filter||'
    and
      not oor.is_deleted
    group by
      l2_name';
  
  raise notice 'v_pending_orders_sql %',v_pending_orders_sql;
 
  v_subclass_sku_summ_sql := '
    select
      tbl_eligible_skus.l2_name,
      eligible_skus,
      filtered_skus,
      coalesce(recom_skus,0) recom_skus,
      coalesce(pending_orders,0) pending_orders
    from
      ('||v_eligible_skus_sql||') tbl_eligible_skus
    join '||'
      ('||v_filtered_skus_sql||') tbl_filtered_skus
    on
      tbl_eligible_skus.l2_name = tbl_filtered_skus.l2_name
    left join
      ('||v_recom_skus_sql||') tbl_recom_skus
    on
      tbl_eligible_skus.l2_name = tbl_recom_skus.l2_name
    left join
      ('||v_pending_orders_sql||') tbl_pending_orders
    on
      tbl_eligible_skus.l2_name = tbl_pending_orders.l2_name';
  
  raise notice 'v_subclass_summ_sql %',v_subclass_sku_summ_sql; 
 
  open $1 for execute v_subclass_sku_summ_sql;
 
  RETURN $1;
end
$function$
;