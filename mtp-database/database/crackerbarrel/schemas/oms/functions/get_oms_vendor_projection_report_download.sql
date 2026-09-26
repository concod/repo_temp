--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:get_oms_vendor_projection_report_download runOnChange:true stripComments:false splitStatements:false context:MTP-98028 labels:MTP-98028.
--comment: MTP-98028
--rollback: SELECT 1

DROP FUNCTION if exists inventory_smart.get_oms_vendor_projection_report_download(refcursor, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_vendor_projection_report_download(input refcursor, jsonb, jsonb, text)
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
                                                     ,'product_code'
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
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_int_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );

    v_sum_fiscal_year_months := (
    SELECT string_agg('sum(coalesce(fym' || fiscal_year_month::text || ',0)) as fym' || fiscal_year_month::text, ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_vendor_projection_report_sql := 'SELECT * from (
	SELECT 
	    paf.article,
      X.loc_code,
	    X.size,
		  MAX(paf.l0_name) AS l0_name,
MAX(paf.l1_name) AS l1_name,
	    MAX(paf.l2_name) AS l2_name,
	    MAX(paf.l3_name) AS l3_name,
	    MAX(paf.l4_name) AS l4_name,
	    MAX(paf.l5_name) AS l5_name,
      MAX(paf.product_attribute_8) AS product_attribute_8,
		  MAX(paf.product_description) AS product_description,
	    MAX(paf.vendor) AS vendor,
      MAX(paf.primary_vendor_name) AS primary_vendor_name,
	    MAX(paf.primary_trait_desc) AS primary_trait_desc,
	CASE 
    WHEN EXISTS (
        SELECT 1 
        FROM inventory_smart.oms_pack_config opc
        WHERE opc.article = paf.article 
        AND opc.size = X.size
    ) THEN ''View Pack Config''
    ELSE ''-''
END AS view_pack_config,
	    '||v_sum_fiscal_year_months ||'
	    FROM (
		    SELECT 
          split_part(pls, ''::'', 1) AS product_code,
          split_part(pls, ''::'', 2) AS loc_code,
          split_part(pls, ''::'', 3) AS size,
          '|| v_fiscal_year_months ||'
		    FROM crosstab(
		        $$
					      SELECT 
		            product_code || ''::'' || loc_code || ''::'' || size  AS pls,
		            fiscal_year_month, 
		            coalesce(sum('||v_col_value||'::numeric)::int,0)
                FROM inventory_smart.oms_vendor_projection ovp
                GROUP BY 1,2
                ORDER BY 1,2
				    $$,
		        $$
					      SELECT DISTINCT fiscal_year_month 
		          	FROM inventory_smart.oms_vendor_projection 
		          	ORDER BY fiscal_year_month
				    $$
		    ) AS pivot_table( pls TEXT, '|| v_int_fiscal_year_months ||')
		) X 
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = X.product_code and paf.ordering = ''Y''
		GROUP BY 1,2,3
		ORDER BY 1,2,3
	)Z
   '||v_meta_cls;         
   
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN v_vendor_projection_report_sql;
 end
 $function$
;
