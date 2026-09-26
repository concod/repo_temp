--liquibase formatted sql
--changeset nikhil.dhoot:approved_columns_update_4 runOnChange:true stripComments:false splitStatements:false context:MTP-94044_2 labels:MTP-94044_2
--comment: sending aggregated distinct savetype
--rollback: SELECT 1




DROP FUNCTION IF EXISTS inventory_smart.get_po_rebalance_channel_data(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_po_rebalance_channel_data(input refcursor, product_filter jsonb, table_query jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

 declare
 v_recommended_orders_sql text:= '';
   v_pa_sql                  text:='';
   meta text:='';

 begin
   v_pa_sql :=inventory_smart.form_main_table_filters(
		  'ph_master',
		  product_filter
		);
    meta = global.form_table_query(table_query);
	

  
 v_recommended_orders_sql :=
 '  
	with base as (
select l6_id,l6_name,loc_code,paf.l0_name,paf.l2_name,paf.l3_name,paf.l4_name,paf.l5_name,paf.masterstyle_descr,paf.subbrand_description,paf.product_lifecycle,paf.collection,fiscal_year_week,avg(l4w_ss) as l4w_ss,avg(lw_ss) as lw_ss,sum(dc_inv_bop_post_allocation-store_allocation_unconstrained-safety_stock) as Excess_Deficit,sum(store_allocation_unconstrained) as DC_Inventory_Out,
sum(dc_inv_bop_post_allocation) as DC_BOP_Inv,sum(po_inbound) as PO_Receipt_In,sum(total_store_forecast) as Forecasted_Sales,sum(safety_stock) as Safety_Stock, avg(dc_inv_wos) as DC_Inventory_WOS,avg(store_inv_wos) as Store_Inventory_WOS,sum(total_store_bop_inv) as Store_BOP_Inv
            from
              inventory_smart.po_rebalance_base prb  
            inner join 
            	(select * from "global".product_attributes_filter paf '||v_pa_sql||' ) paf
            on
              prb.product_code = paf.product_code
              
            group by l6_id,l6_name,loc_code,fiscal_year_week,paf.l0_name,paf.l2_name,paf.l3_name,paf.l4_name,paf.l5_name,paf.masterstyle_descr,paf.subbrand_description,paf.product_lifecycle,paf.collection),
po_draft as (
    select l6_id,l6_name,savetype,approved_by,DATE_TRUNC(''second'', approved_at) as approved_at,fiscal_year_week from 
    inventory_smart.oms_po_rebalance_drafts oprd
    group by l6_id,l6_name,savetype,approved_by, DATE_TRUNC(''second'', approved_at), fiscal_year_week
)

select * 
from (
            
SELECT
    l6_id AS aggr_column,
    l6_name,
    l0_name,l2_name,l3_name,l4_name,l5_name,masterstyle_descr,subbrand_description,product_lifecycle,collection,
	  ARRAY_AGG(DISTINCT savetype) AS savetype_array,
    MIN(savetype) AS savetype,
    fiscal_year_week_draft,
    approved_at,
    approved_by,
    JSONB_AGG(channel_data ORDER BY channel) AS status_obj
FROM (
    SELECT
        base.l6_id,
        base.l6_name,
        l0_name,l2_name,l3_name,l4_name,l5_name,masterstyle_descr,subbrand_description,product_lifecycle,collection,
        base.loc_code AS channel,
		savetype,
		DATE_TRUNC(''second'', approved_at) as approved_at,
		u1.name as approved_by,
        oprd.fiscal_year_week as fiscal_year_week_draft,
        JSONB_BUILD_OBJECT(''channel'', loc_code) ||
        jsonb_object_agg(
            base.fiscal_year_week,
            jsonb_build_object(
                ''Last_4_week_stock_sales'',l4w_ss,
				        ''Last_week_Stock_Sales'',lw_ss,
                ''Excess_Deficit'', Excess_Deficit,
                ''DC_Inventory_Out'', DC_Inventory_Out,
                ''DC_BOP_Inv'', DC_BOP_Inv,
                ''PO_Receipt_In'', PO_Receipt_In,
                ''Forecasted_Sales'', Forecasted_Sales,
                ''Safety_Stock'', Safety_Stock,
                ''DC_Inventory_WOS'', DC_Inventory_WOS,
                ''Store_Inventory_WOS'', Store_Inventory_WOS,
                ''Store_BOP_Inv'', Store_BOP_Inv
            )
        ) AS channel_data
    FROM base
	left join po_draft oprd on base.l6_id = oprd.l6_id
    left join global.user_master u1 on u1.user_code = oprd.approved_by::int
    GROUP BY base.l6_id, base.l6_name, base.loc_code,l0_name,l2_name,l3_name,l4_name,l5_name,masterstyle_descr,subbrand_description,product_lifecycle,collection,savetype,oprd.fiscal_year_week,u1.name,approved_at
) AS sub
GROUP BY l6_id, l6_name,approved_at,approved_by,fiscal_year_week_draft,l0_name,l2_name,l3_name,l4_name,l5_name,masterstyle_descr,subbrand_description,product_lifecycle,collection) X 
' || meta;
   
   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open $1 for execute v_recommended_orders_sql;
   RETURN v_recommended_orders_sql;
 end
 $function$
;
