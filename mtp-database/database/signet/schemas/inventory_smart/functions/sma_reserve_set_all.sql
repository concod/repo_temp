--liquibase formatted sql
--changeset liquibase:sma_reserve runOnChange:true stripComments:false splitStatements:false context:MTP-48022 labels:MTP-48022
--comment: SMA - Fixed set all issue
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sma_reserve_set_all(jsonb, integer);
DROP FUNCTION IF EXISTS inventory_smart.sma_reserve_set_all(jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.sma_reserve_set_all(jsonb, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 #variable_conflict use_column
 declare
 		_query_pa text := '';
		_query_combine text := '';
    _query_table_filters text := global.form_table_query($2);
 begin
 		_query_pa := global.form_main_table_filters('product_attributes_filter', $1);
    _query_combine := '
      with sku_rule as (
        select ph_code, article as product_code ,unnest (default_store_groups) as sg_code 
        from inventory_smart.ph_configuration_mapping pcm 
        left join inventory_smart.ph_master pm using (ph_code)
      ),
      sku_dc_available_units as (
        select product_code, dc_code, sum(oh) as oh
	    from
		    inventory_smart.sku_dc_available_units
		  group by
		  1,
		  2
      ),
      sku_univ as (
        select li.product_code, oh 
        from inventory_smart.latest_inventory li
        where store_code in (''D.8408'',''D.8410'',''D.8591'',''D.8407'',''D.8409'',''A.8460'',''A.8415'',''A.8461'',''D.8411'', ''W.KJOO'', ''W.BBBB'', ''W.9999'')
        group by 1,2
        having oh > 0
        union all
        SELECT DISTINCT product_code, 0 as oh 
        FROM inventory_smart.po_master pm
        WHERE not_before_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30
      ),
      product_list as (
        select distinct product_code from sku_rule b join sku_univ using(product_code)
      ),
      product_masters as (select * from "global".product_attributes_filter paf' || _query_pa || ' and product_code in (select product_code from product_list)),
      latest_inventory_data as (select product_code, oh from inventory_smart.latest_inventory li where store_code in (''A.8461'', ''D.8411'')),
      sma_result as (
        select
        pm.product_code,
        pm.product_description,
        pm.l0_name,
        pm.l1_name,
        pm.l2_name,
        pm.merchandise_category,
        coalesce(sdc.oh, 0) as dc_oh,
        coalesce(drq.quantity,0) as total_reserve_qty,
        sma_reserve_qty,
        dc_reserve_qty,
        coalesce(li.oh, 0) oh,
        net_ecom_reserve,
        coalesce(sma_percentage, 0) sma_percentage
        from product_masters pm
        left join sku_dc_available_units sdc on pm.product_code = sdc.product_code
        left join inventory_smart.dc_reserve_quantity drq on pm.product_code = drq.product_code
        left join inventory_smart.sma_reserve_quantity sma on sma.product_code = drq.product_code
        left join latest_inventory_data li on li.product_code = drq.product_code,
        lateral coalesce(ROUND((sma_percentage::float/100)::numeric, 2), 0) calculated_sma_percentage,
        lateral ROUND((coalesce(drq.quantity,0) * calculated_sma_percentage)::numeric, 0) as sma_reserve_qty,
        lateral ROUND((coalesce(drq.quantity,0) - sma_reserve_qty):: numeric, 2) dc_reserve_qty,
        lateral ROUND((sma_reserve_qty - coalesce(li.oh, 0)):: numeric, 2) net_sma_reserve,
        lateral ROUND((CASE WHEN (dc_reserve_qty + net_sma_reserve) < 0 THEN 0 ELSE (dc_reserve_qty + net_sma_reserve) END):: numeric, 2) net_ecom_reserve
        where drq.type = ''E''
      )
      INSERT INTO inventory_smart.sma_reserve_quantity (product_code, sma_percentage)
      SELECT product_code, $1
      FROM (SELECT distinct product_code FROM sma_result ' ||_query_table_filters|| ') AS input_data
      ON CONFLICT (product_code) DO UPDATE
      SET sma_percentage = EXCLUDED.sma_percentage;
    ';
  
	RAISE NOTICE ' %', _query_combine;
  EXECUTE _query_combine USING $3;
  end
 $function$
;

