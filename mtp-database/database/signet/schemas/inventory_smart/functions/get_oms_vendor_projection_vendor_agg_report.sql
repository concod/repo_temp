--liquibase formatted sql
--changeset jitendra.singh:get_oms_vendor_projection_vendor_agg_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-30313
--comment: type cast cols get_oms_vendor_projection_vendor_agg_report
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_vendor_projection_vendor_agg_report(input refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_vendor_projection_vendor_agg_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_vendor_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
  
   if $4 = 'unit'
   then
     v_col_value := 't1.sum_roq_unconstrained';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 't1.sum_total_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );
   v_vendor_projection_report_sql := 'SELECT *
		FROM crosstab(
		    $$SELECT
		        t1.vendor_code,
                t1.vendor_name,
		        t1.fiscal_year_month,
		        ('||v_col_value||'::numeric)::int
		    FROM (
		        SELECT
		            ovp.vendor_code,
		            ovp.fiscal_year_month,
                    max(paf.vendor_name) as vendor_name,
		            SUM(ovp.roq_unconstrained) AS sum_roq_unconstrained,
		            SUM(ovp.total_cost) AS sum_total_cost
		        FROM inventory_smart.oms_vendor_projection ovp
		        INNER JOIN ('||v_pa_sql||') paf ON ovp.product_code = paf.product_code
		        GROUP BY 1, 2
		    ) t1
		    ORDER BY 1, 2
		    $$,
		    $$SELECT DISTINCT fiscal_year_month FROM inventory_smart.oms_vendor_projection ORDER BY fiscal_year_month$$
	) as X(vendor_code text, vendor_name text, '|| v_fiscal_year_months ||')
   '||v_meta_cls;       
   
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN $1;
 end
 $function$
;
