--liquibase formatted sql
--changeset kamalesh.k.baheti@impactanalytics.co:populate_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:populate_alerts
--comment: initial changeset for item_smart.populate_alerts
--rollback: SELECT 1

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
  channels  text[]:='{"Brick __ia_char_13 Mortar","E-Commerce"}';

begin
  set application_name = 'Item Smart alerts population';

  for dept,actual_dept_name,months in
                    ( select a.dept_part_name, mphf.actual_dept_name, a.months
                        from 
                             (select distinct split_part(tablename,'_',2) dept_part_name ,
                                     array_agg(split_part(tablename,'_',3)::int4)::int4[] months
                                from pg_catalog.pg_tables 
                               where tablename like 'alerts_%'
                                 and schemaname  = 'public'
                                 and tablename not like 'alerts_product_level%'
                            group by split_part(tablename,'_',2)
                             ) a
                        join (select distinct l0_name as actual_dept_name ,
                                     lower(regexp_replace(l0_name, '[ /.-]', '', 'g')) dept_part_name
                                from item_smart.mv_product_hierarchies_filter
                             ) mphf 
                        on a.dept_part_name =  mphf.dept_part_name 
                     )             
  loop
      call item_smart.create_item_schema('alerts', array[actual_dept_name]::text[], months::int4[], channels::text[]);	  
  end loop;
 
  raise notice 'partitions created';
 
  -- Modified this loop to exclude product_level
  for dept in ( 
    SELECT distinct
        regexp_replace(regexp_replace(tablename, '^alerts_', '', 'g'), '_[0-9]{6}$', '', 'g') AS dept_part_name
    FROM pg_catalog.pg_tables
    WHERE tablename LIKE 'alerts_%'
    AND tablename NOT LIKE 'alerts_product_level%'
    AND schemaname = 'public'
    AND tablename ~ '^alerts_[a-z]+_[0-9]{6}$'  -- Only match YYYYMM pattern
    ORDER BY dept_part_name
  ) loop
      raise notice 'Processing department: %', dept; 
     
      execute 'truncate table item_smart.alerts_'||dept;
      
      -- Modified this subquery to exclude product_level
      for tbl in (
        select tablename
        from pg_catalog.pg_tables 
        where tablename like 'alerts_'||dept||'_%'
        and tablename ~ ('^alerts_' || dept || '_[0-9]{6}$')  -- Only match YYYYMM pattern
        and schemaname = 'public'
        order by tablename
      ) loop
        v_sql := 'insert into item_smart.alerts(
                    dept,
                    channel,
                    month,
                    style,
                    hierarchy_code,
                    wp_written_sales_dollars,
                    ty_written_sales_dollars,
                    op_written_sales_dollars,
                    lf_written_sales_dollars,
                    iaf_written_sales_dollars,
                    var_sls_u_wp_op,
                    var_sls_u_wp_lf,
                    var_sls_u_wp_iaf,
                    rec_rcpt_u_ttl_rcpt_u,
                    ttl_rcpt_moq,
                    fwos_exit_date,
                    fwos_lead_time)
                select 
                    dept,
                    channel,
                    month,
                    style,
                    hierarchy_code,
                    wp_written_sales_dollars,
                    ty_written_sales_dollars,
                    op_written_sales_dollars,
                    lf_written_sales_dollars,
                    iaf_written_sales_dollars,
                    var_sls_u_wp_op,
                    var_sls_u_wp_lf,
                    var_sls_u_wp_iaf,
                    rec_rcpt_u_ttl_rcpt_u,
                    ttl_rcpt_moq,
                    fwos_exit_date,
                    fwos_lead_time 
                from '||tbl;
        raise notice '%',v_sql;
        execute v_sql; 
        raise notice '% populated',tbl;
     end loop;	
  end loop;
end;  
$procedure$
;