--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:populate_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_alerts
--comment:  initial changeset for populate_alerts
DROP PROCEDURE IF EXISTS item_smart.populate_alerts();
CREATE OR REPLACE PROCEDURE item_smart.populate_alerts()
 LANGUAGE plpgsql
AS $procedure$
declare 
  v_sql     text;
  tbl       text;
  sanitized_dept text;
  dept      text;
  actual_dept_name  text;
  years    int4[];
  channels  text[] := '{"Ecom","Indirect","Store"}';
  sub_channels text[] := '{"Hybris","NordstromDSCO","Amazon","PotteryBarnEDI","WilliamSonomaEDI","SAKS","NordstromRackDSCO","Walmart","Serena And Lily","Balsam Hill Studio"}';
begin
  set application_name = 'Item Smart alerts population';

  for dept, actual_dept_name, years in
	(
  select a.dept_part_name, mphf.actual_dept_name, a.years
  from (
    select distinct split_part(tablename, '_', 2) dept_part_name,
           array_agg((regexp_match(tablename, '_([0-9]{4})$'))[1]::int4)::int4[] as years
    from pg_catalog.pg_tables
    where tablename like 'alerts_%'
      and schemaname = 'public'
    group by split_part(tablename, '_', 2)
  ) a
  join (
    select distinct l1_name as actual_dept_name,
                    lower(regexp_replace(l1_name, '[ /.-]', '', 'g')) dept_part_name
    from item_smart.mv_product_hierarchies_filter
  ) mphf
  on a.dept_part_name = mphf.dept_part_name
)
  loop
    call item_smart.create_item_schema_alerts_year('alerts', array[actual_dept_name]::text[], years::int4[], channels::text[]);
  end loop;

  raise notice 'partitions created';

  for dept in (
    select distinct
       regexp_replace(regexp_replace(tablename, '^alerts_', '', 'g'), '_[0-9]{4}$', '', 'g') as dept_part_name
from pg_catalog.pg_tables
where tablename like 'alerts_%'
  and schemaname = 'public'
  )
  loop
    raise notice '%', dept;

    sanitized_dept := lower(regexp_replace(regexp_replace(unaccent(dept), '[^a-zA-Z0-9_]', '', 'g'), '(\d+)_([a-zA-Z]+)', '\1\2', 'g'));

    execute 'truncate table item_smart.alerts_' || sanitized_dept;

    for tbl in (
      select tablename
      from pg_catalog.pg_tables
      where tablename like 'alerts_' || dept || '%'
        and schemaname = 'public'
    )
    loop
      v_sql := 'insert into item_smart.alerts(
        dept, l3_name, channel, sub_channel, year, hierarchy_code, l2_name,
        wp_written_sales_dollars, wp_written_sales_cost, wp_written_sales_unit,
        ty_written_sales_dollars, ly_written_sales_dollars, op_written_sales_dollars,
        lf_written_sales_dollars, wp_eop_units, wp_discount_rate, iaf_discount_rate,
        wp_auc_first_cost, ly_auc_first_cost, wp_unplaced_total_units,
        var_sls_u_wp_op, var_sls_u_wp_op_pos, var_sls_u_wp_op_neg,
        var_sls_u_wp_lf, var_sls_u_wp_lf_pos, var_sls_u_wp_lf_neg,
        var_sls_u_wp_iaf, var_sls_u_wp_iaf_pos, var_sls_u_wp_iaf_neg,
        dr_var_wp_vs_iaf_pos, dr_var_wp_vs_iaf_neg, auc_var_wp_vs_ly_pos, auc_var_wp_vs_ly_neg,
        dr_var_wp_vs_iaf, auc_var_wp_vs_ly, st_var,
        open_receipt_qty, order_qty_moq, st_pos_variance, st_neg_variance)
     select 
        dept, l3_name, channel, sub_channel, fiscal_year, hierarchy_code, l2_name,
        wp_written_sales_dollars, wp_written_sales_cost, wp_written_sales_unit,
        ty_written_sales_dollars, ly_written_sales_dollars, op_written_sales_dollars,
        lf_written_sales_dollars, wp_eop_units, wp_discount_rate, iaf_discount_rate,
        wp_auc_first_cost, ly_auc_first_cost, wp_unplaced_total_units,
        var_sls_u_wp_op, var_sls_u_wp_op_pos, var_sls_u_wp_op_neg,
        var_sls_u_wp_lf, var_sls_u_wp_lf_pos, var_sls_u_wp_lf_neg,
        var_sls_u_wp_iaf, var_sls_u_wp_iaf_pos, var_sls_u_wp_iaf_neg,
        dr_var_wp_vs_iaf_pos, dr_var_wp_vs_iaf_neg, auc_var_wp_vs_ly_pos, auc_var_wp_vs_ly_neg,
        auc_var_wp_vs_ly, open_receipt_qty, order_qty_moq, st_pos_variance, st_neg_variance, st_var ,dr_var_wp_vs_iaf
        from ' || tbl;

      raise notice '%', v_sql;
      execute v_sql;
      raise notice '% populated', tbl;
    end loop;
  end loop;
end;
$procedure$
;
