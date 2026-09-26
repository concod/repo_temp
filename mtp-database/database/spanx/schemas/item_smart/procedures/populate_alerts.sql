--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:populate_alerts_chg3 stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit
--comment: initial changeset for populate_alerts_chg2

DROP PROCEDURE IF EXISTS item_smart.populate_alerts();
CREATE OR REPLACE PROCEDURE item_smart.populate_alerts()
 LANGUAGE plpgsql
AS $procedure$
declare 
  v_sql     text;
  tbl       text;
  dept    text;
  actual_dept_name  text;
  months    int4[];
  channels              text[]:='{"EComm","Wholesale"}';
  sub_channels          text[]:='{"EComm","Wholesale"}';
  begin
  set application_name = 'Item Smart alerts population';
  for dept,actual_dept_name,months in
                    ( select a.dept_part_name, mphf.actual_dept_name, a.months
                        from 
                             (select distinct split_part(tablename,'_',2) dept_part_name ,
                                     array_agg((regexp_match(tablename, '_([0-9]{6})$'))[1]::int4)::int4[] AS months
                                from pg_catalog.pg_tables 
                               where tablename like 'alerts_%'
                                 and schemaname  = 'public'
                            group by split_part(tablename,'_',2)
                             ) a
                        join (select distinct l1_name as actual_dept_name ,
                                     lower(regexp_replace(l1_name, '[ /.-]', '', 'g')) dept_part_name
                                from item_smart.mv_product_hierarchies_filter
                             ) mphf 
                        on a.dept_part_name =  mphf.dept_part_name 
                     )             
  loop
      call item_smart.create_item_schema('alerts', array[actual_dept_name]::text[], months::int4[], channels::text[]);
     -- call item_smart.build_list_partitions('item_smart.alerts');     
  end loop;
 
  raise notice 'partitions created';
 
  for dept in ( SELECT distinct
                  regexp_replace(regexp_replace(tablename, '^alerts_', '', 'g'), '_[0-9]{6}$', '', 'g') AS dept_part_name
                FROM pg_catalog.pg_tables
                WHERE tablename LIKE 'alerts_%'
                AND schemaname = 'public'
             )
  loop
      raise notice '%',dept; 
     
      execute 'truncate table item_smart.alerts_'||dept;
      
      for tbl in (select tablename
                    from pg_catalog.pg_tables 
                   where tablename like 'alerts_'||dept||'%'
                     and schemaname  = 'public'
                 )
      loop
        v_sql := 'insert into item_smart.alerts(
                    dept,
                    class,
                    channel,
                    sub_channel,
                    month,
                    hierarchy_code,
                    collection_name,
                    wp_written_sales_dollars,
                    wp_written_sales_cost,
                    wp_atp_cost,
                    ty_written_sales_dollars,
                    ly_written_sales_dollars,
                    op_written_sales_dollars,
                    lf_written_sales_dollars,
                    var_sls_u_wp_op,
                    var_sls_u_wp_lf,
                    var_sls_u_wp_iaf,
                    rec_rcpt_u_ttl_rcpt_u,
                    ttl_rcpt_moq,
                    fwos_exit_date,
                    fwos_lead_time,
					product_lifecycle, 
					wp_committed_orders,
					list_of_committed_orders,
					seasonal_product_without_commit,
					core_product_without_commit,
					list_of_non_committed_orders)
                select 
                    dept,
                    l3_name,
                    channel,
                    sub_channel,
                    month,
                    hierarchy_code,
                    l2_name,
                    wp_written_sales_dollars,
                    wp_written_sales_cost,
                    wp_atp_cost,
                    ty_written_sales_dollars,
                    ly_written_sales_dollars,
                    op_written_sales_dollars,
                    lf_written_sales_dollars,
                    var_sls_u_wp_op,
                    var_sls_u_wp_lf,
                    var_sls_u_wp_iaf,
                    rec_rcpt_u_ttl_rcpt_u,
                    ttl_rcpt_moq,
                    fwos_exit_date,
                    fwos_lead_time ,
				    product_lifecycle, 
					wp_committed_orders,
					list_of_committed_orders,
					seasonal_product_without_commit,
					core_product_without_commit,
					list_of_non_committed_orders
                from '||tbl;
        raise notice '%',v_sql;
        execute v_sql; 
        raise notice '% populated',tbl;
     end loop;  
  end loop;
end;  
$procedure$
;
