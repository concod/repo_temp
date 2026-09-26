--liquibase formatted sql
--changeset nuttu.hariprasad:get_oms_vendor_projection_report_update_16 runOnChange:true stripComments:false splitStatements:false context:MTP-106856 labels:get_oms_vendor_projection_report_update3
--comment: MTP-106856 - optimized the query.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_vendor_projection_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_vendor_projection_report(input refcursor, jsonb, jsonb, text)
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
   v_where_clause text:='';

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
   SELECT string_agg(
     'SUM(total_value) FILTER (WHERE fiscal_year_month=''' || fiscal_year_month::text || ''') AS fym' || fiscal_year_month::text,
     ', '
   )
   FROM (
     select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
   ) t
 );

 IF v_meta_cls ~* 'WHERE' THEN
	v_where_clause := substring(v_meta_cls FROM 'WHERE\s.*?(?=\sLIMIT|\sOFFSET|$)');
 END IF;

  v_vendor_projection_report_sql := 'WITH tmp_paf AS (
    SELECT
        size,
        vendor,
        article,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        l4_name,
        l5_name,
        ordering,
        product_code,
        primary_trait_desc,
        primary_vendor_name,
        product_attribute_8,
        product_description
    FROM ('|| v_pa_sql ||') paf
    WHERE ordering = ''Y''
),
tmp_projection AS (
    SELECT
        paf.article,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.product_attribute_8,
        paf.product_description,
        paf.vendor,
        paf.primary_vendor_name,
        paf.primary_trait_desc,
        ovp.vendor_code,
        ovp.vendor_name,
        COALESCE(pc.view_pack_config, ''-'') AS view_pack_config,
        ovp.fiscal_year_month,
        SUM(COALESCE('||v_col_value||', 0))::int AS total_value
    FROM inventory_smart.oms_vendor_projection ovp
    JOIN tmp_paf paf
      ON ovp.product_code = paf.product_code
    LEFT JOIN (
        SELECT DISTINCT article, ''View Pack Config'' AS view_pack_config
        FROM inventory_smart.oms_pack_config
    ) pc ON pc.article = paf.article
    GROUP BY
        paf.article, paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_name, paf.l4_name,
        paf.l5_name, paf.product_attribute_8, paf.product_description,
        paf.vendor, paf.primary_vendor_name, paf.primary_trait_desc,
        ovp.vendor_code, ovp.vendor_name, pc.view_pack_config, ovp.fiscal_year_month
)
SELECT * FROM (
    SELECT
        article,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        l4_name,
        l5_name,
        product_attribute_8,
        product_description,
        vendor,
        primary_vendor_name,
        primary_trait_desc,
        vendor_code,
        vendor_name,
        view_pack_config, ' || v_fiscal_year_months || '
    FROM tmp_projection
    GROUP BY
        article, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name,
        product_attribute_8, product_description, vendor, primary_vendor_name,
        primary_trait_desc, vendor_code, vendor_name, view_pack_config
) x
'|| v_where_clause ||'';       
   
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN v_vendor_projection_report_sql;
 end
 $function$
;