--liquibase formatted sql
--changeset chandranil.ghosh:get_oms_vendor_projection_report_update_15 runOnChange:true stripComments:false splitStatements:false context:MTP-76874 labels:get_oms_vendor_projection_report_update3
--comment: Fixed Order of columns.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_vendor_projection_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION oms.get_oms_vendor_projection_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_forecast_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
   v_vendor_projection_report_sql text:='';

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
     v_col_value := 'ovp.order_quantity';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'ovp.order_quantity_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );
   v_vendor_projection_report_sql := 'select * from crosstab(
		$$select
            paf.article,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.product_description,
            paf.vendor,
            paf.primary_vendor_name,
            ovp.vendor_code,
            ovp.vendor_name,
            CASE 
                  WHEN oor.pack_id IS NOT NULL AND oor.pack_id <> ''WP'' THEN ''View Pack Config''
                  ELSE ''-''
            END AS view_pack_config,
            paf.fiscal_year_month,
            avg(coalesce('||v_col_value||',0))::int
            
            from oms.oms_vendor_projection ovp 
            join (
              select * from ('||v_pa_sql||') p cross join (
																select 
																distinct fiscal_year_month from  global.fiscal_date_mapping 
																where fiscal_year_month>=(select min(fiscal_year_month) 
																from oms.oms_vendor_projection) and  fiscal_year_month<=(select max(fiscal_year_month) from oms.oms_vendor_projection)
													) X 
		) paf
		on ovp.product_code = paf.product_code and ovp.fiscal_year_month = paf.fiscal_year_month
		 INNER JOIN oms.oms_orders_recommended oor
		on oor.article = paf.article
    --INNER JOIN  oms.oms_mapping_table mt ON paf.primary_wh=mt.value AND mt.variable=''store'' AND mt.true_false=''true'' 
    where paf.product_code in (select distinct product_code from global.product_attributes_filter paf where ordering =''Y'')
    group by paf.article,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
			paf.product_description,
			paf.vendor,
			paf.primary_vendor_name,
            ovp.vendor_code,
            ovp.vendor_name,
            oor.pack_id,
            paf.fiscal_year_month,
            paf.product_code
        order by paf.product_code, paf.fiscal_year_month
		$$,
		$$select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month$$
	) as X(
			article text, 
			l0_name text,
			l1_name text,
			l2_name text,
			l3_name text,
			product_description text,
			vendor text,
			primary_vendor_name text,
 			vendor_code text,
			vendor_name text,
			view_pack_config text, '|| v_fiscal_year_months ||')
   '||v_meta_cls;       
   
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN v_vendor_projection_report_sql;
 end
 $function$
;