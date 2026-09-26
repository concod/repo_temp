--liquibase formatted sql
--changeset aman.lakkoju:get_oms_dropship_report runOnChange:true stripComments:false splitStatements:false context:MTP-26861 labels:sp_changes_for_revert_dropship
--comment: added column modelled_flag
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_dropship_report(input refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_dropship_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_dropship_report_sql  text:='';
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
     v_col_value := 'concat(
	    ''{"id": '', odsfp.id,
	    '', "predictions": '', odsfp.predictions,
	    '', "adjusted_predictions": '', odsfp.adjusted_predictions,''}''
     )';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'concat(
	    ''{"id": '', odsfp.id,
	    '', "total_cost": '', odsfp.total_cost,
	    '', "adjusted_total_cost": '', odsfp.adjusted_total_cost, ''}''
     )';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"' || fiscal_year_month::text || '" text', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_drop_ship_forecast_projection order by fiscal_year_month
	) t
    );
   v_dropship_report_sql := 'select * from crosstab(
		$$select
			odsfp.sku_vendor_id as id ,
            odsfp.product_code,
            odsfp.loc_code,
            odsfp.vendor_code,
            odsfp.modelled_flag,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.primary_wh,
            paf.product_description,
            paf.vendor_name,
			odsfp.fiscal_year_month,
            '||v_col_value||'
		from inventory_smart.oms_drop_ship_forecast_projection odsfp
		inner join ('||v_pa_sql||') paf
		on odsfp.product_code = paf.product_code
        order by odsfp.product_code, odsfp.fiscal_year_month
		$$,
		$$select distinct fiscal_year_month from inventory_smart.oms_drop_ship_forecast_projection order by fiscal_year_month$$
	) as X(id text,product_code text, loc_code text, vendor_code text,modelled_flag text, l0_name text, l1_name text, l2_name text, primary_wh text, product_description text, vendor_name text,'|| v_fiscal_year_months ||')
   '||v_meta_cls;       
   
   raise notice 'v_dropship_report_sql %',v_dropship_report_sql;
   open $1 for execute v_dropship_report_sql;
   RETURN v_dropship_report_sql;
 end
 $function$
;
