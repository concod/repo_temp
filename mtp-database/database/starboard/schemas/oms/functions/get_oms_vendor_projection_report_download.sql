--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_vendor_projection_report_download_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-98028 labels:MTP-980282.
--comment: MTP-980282
--rollback: SELECT 1

DROP FUNCTION if exists oms.get_oms_vendor_projection_report_download(refcursor, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION oms.get_oms_vendor_projection_report_download(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_vendor_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
   v_sum_fiscal_year_months text:='';
   v_int_fiscal_year_months text:='';

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
     v_col_value := 'order_quantity';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'order_quantity_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg( 'fym'||fiscal_year_month::text , ', ') FROM (
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_int_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );

    v_sum_fiscal_year_months := (
    SELECT string_agg('sum(coalesce(fym' || fiscal_year_month::text || ',0)) as fym' || fiscal_year_month::text, ', ') FROM (
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_vendor_projection_report_sql := 'SELECT * from (
	SELECT 
	    paf.article,
	    MAX(paf.primary_vendor_id) AS vendor_code,
      	MAX(paf.primary_vendor_name) AS vendor_name,
        max(paf.style_color_desc) as style_color_desc,
	    '||v_sum_fiscal_year_months ||'
	    FROM (
		    SELECT 
          pls AS product_code,
          '|| v_fiscal_year_months ||'
		    FROM crosstab(
		        $$
					SELECT 
		            product_code AS pls,
		            fiscal_year_month, 
		            coalesce(sum('||v_col_value||'::numeric)::int,0)
                FROM oms.oms_vendor_projection ovp
                GROUP BY 1,2
                ORDER BY 1,2
				    $$,
		        $$
					      SELECT DISTINCT fiscal_year_month 
		          	FROM oms.oms_vendor_projection 
		          	ORDER BY fiscal_year_month
				    $$
		    ) AS pivot_table( pls TEXT, '|| v_int_fiscal_year_months ||')
		) X 
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = X.product_code and paf.ordering = ''Y''
		GROUP BY 1
		ORDER BY 1
	)Z
   '||v_meta_cls;         
   
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN v_vendor_projection_report_sql;
 end
 $function$
;
