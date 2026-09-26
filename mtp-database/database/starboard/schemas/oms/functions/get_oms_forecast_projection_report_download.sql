--liquibase formatted sql
--changeset piyush.raj:get_oms_forecast_projection_report_download_v1 runOnChange:true stripComments:false splitStatements:false labels:MTP-98490..
--comment: MTP-98490.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_forecast_projection_report_download(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION oms.get_oms_forecast_projection_report_download(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_forecast_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'article'
                                                     , $2
                                                     );
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;

   if $4 = 'unit'
   then
     v_col_value := 'ofp.store_forecast_pred';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'ofp.store_forecast_pred_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );
   v_forecast_projection_report_sql := 'select * from crosstab(
$$select
			paf.article,
			paf.primary_vendor_name,
			paf.primary_vendor_id,
			paf.style_color_desc,
			paf.fiscal_year_month,
      coalesce(sum('||v_col_value||'::numeric)::int,0)
		from oms.oms_vendor_projection ofp 
		join (select * from ('||v_pa_sql||') p cross join (select distinct fiscal_year_month from  global.fiscal_date_mapping where fiscal_year_month>=(select min(fiscal_year_month) from oms.oms_vendor_projection) and  fiscal_year_month<=(select max(fiscal_year_month) from oms.oms_vendor_projection)) X ) paf
		on ofp.product_code = paf.product_code and ofp.fiscal_year_month = paf.fiscal_year_month

    --INNER JOIN  oms.oms_mapping_table mt ON paf.primary_wh=mt.value AND mt.variable=''store'' AND mt.true_false=''true'' 
    where paf.product_code in (select distinct product_code from global.product_attributes_filter paf where ordering =''Y'')
    group by paf.article,
			paf.primary_vendor_name,
			paf.primary_vendor_id,
      paf.style_color_desc,
      paf.fiscal_year_month
      order by paf.article,paf.fiscal_year_month
		$$,
		$$select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month$$
	) as X(
			article text, 
			vendor_name text,
			vendor_code text,
      style_color_desc text, '|| v_fiscal_year_months ||')
   '||v_meta_cls;
   
   raise notice 'v_forecast_projection_report_sql %',v_forecast_projection_report_sql;
   open $1 for execute v_forecast_projection_report_sql;
   RETURN v_forecast_projection_report_sql;
 end
 $function$
;