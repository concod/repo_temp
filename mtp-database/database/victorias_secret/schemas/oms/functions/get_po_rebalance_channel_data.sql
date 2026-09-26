--liquibase formatted sql
--changeset chaitanyakrishna.vb@impactanalytics.co:get_po_rebalance_channel_data_update_5 runOnChange:true stripComments:false splitStatements:false context:MTP-124214 labels:MTP-124214
--comment: Added fiscal_week_status_mapping to categorize weeks by savetype (approve/draft/pending)
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
   v_pa_sql :=global.form_main_table_filters(
		  'product_attributes_filter',
		  product_filter
		);
    meta = global.form_table_query(table_query);
	

  
 v_recommended_orders_sql :=
 '  
	with base as (
select l6_id,l6_name,loc_code,paf.l0_name,paf.l2_name,paf.l3_name,paf.l4_name,paf.l5_name,paf.masterstyle_descr,paf.subbrand_description,paf.product_lifecycle,paf.collection,
paf.color,paf.subbrand_code_desc,paf.current_assortment_group,paf.flex_style,paf.generic,paf.sizes_mat,paf.form,paf.user_defined_1,paf.user_defined_2,paf.user_defined_3,paf.user_defined_4,paf.user_defined_5,paf.user_defined_6,
fiscal_year_week,avg(l4w_ss) as l4w_ss,avg(lw_ss) as lw_ss,sum(dc_inv_bop_post_allocation-store_allocation_unconstrained-safety_stock) as Excess_Deficit,sum(store_allocation_unconstrained) as DC_Inventory_Out,
sum(dc_inv_bop_post_allocation) as DC_BOP_Inv,sum(po_inbound) as PO_Receipt_In,sum(total_store_forecast) as Forecasted_Sales,sum(safety_stock) as Safety_Stock, avg(dc_inv_wos) as DC_Inventory_WOS,avg(store_inv_wos) as Store_Inventory_WOS,sum(total_store_bop_inv) as Store_BOP_Inv
            from
              inventory_smart.po_rebalance_base prb  
            inner join 
            	(select * from "global".product_attributes_filter paf '||v_pa_sql||' ) paf
            on
              prb.product_code = paf.product_code
              
            group by l6_id,l6_name,loc_code,fiscal_year_week,paf.l0_name,paf.l2_name,paf.l3_name,paf.l4_name,paf.l5_name,paf.masterstyle_descr,paf.subbrand_description,paf.product_lifecycle,paf.collection,
            paf.color,paf.subbrand_code_desc,paf.current_assortment_group,paf.flex_style,paf.generic,paf.sizes_mat,paf.form,paf.user_defined_1,paf.user_defined_2,paf.user_defined_3,paf.user_defined_4,paf.user_defined_5, paf.user_defined_6),
po_draft as (
    select l6_id,l6_name,savetype,approved_by,DATE_TRUNC(''second'', approved_at) as approved_at,fiscal_year_week from 
    inventory_smart.oms_po_rebalance_drafts oprd
    group by l6_id,l6_name,savetype,approved_by, DATE_TRUNC(''second'', approved_at), fiscal_year_week
),
draft_agg as (
    select 
        l6_id,
        ARRAY_AGG(DISTINCT savetype) FILTER (WHERE savetype IS NOT NULL) AS savetype_array,
        MIN(savetype) AS savetype,
        STRING_AGG(DISTINCT fiscal_year_week::text, '', '') AS fiscal_year_week_draft,
        STRING_AGG(DISTINCT approved_at::text, '', '') AS approved_at,
        STRING_AGG(DISTINCT u1.name, '', '') AS approved_by
    from po_draft oprd
    left join global.user_master u1 on u1.user_code = oprd.approved_by::int
    group by l6_id
),
fiscal_week_mapping as (
    select
        l6_id,
        jsonb_object_agg(savetype, fiscal_weeks) AS fiscal_week_status_mapping
    from (
        select
            l6_id,
            savetype,
            jsonb_agg(DISTINCT fiscal_year_week::int) as fiscal_weeks
        from po_draft
        where savetype is not null
        group by l6_id, savetype
    ) sub
    group by l6_id
),
channel_agg as (
    SELECT
        base.l6_id,
        base.l6_name,
        l0_name,l2_name,l3_name,l4_name,l5_name,masterstyle_descr,subbrand_description,product_lifecycle,collection,
        color,subbrand_code_desc,current_assortment_group,flex_style,generic,sizes_mat,form,user_defined_1,user_defined_2,user_defined_3,user_defined_4,user_defined_5,user_defined_6,
        base.loc_code AS channel,
        JSONB_BUILD_OBJECT(''channel'', base.loc_code) ||
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
    GROUP BY base.l6_id, base.l6_name, base.loc_code,l0_name,l2_name,l3_name,l4_name,l5_name,masterstyle_descr,subbrand_description,product_lifecycle,collection,
    color,subbrand_code_desc,current_assortment_group,flex_style,generic,sizes_mat,form,user_defined_1,user_defined_2,user_defined_3,user_defined_4,user_defined_5,user_defined_6
)

select * ,COUNT(*) OVER() AS total_count
from (
SELECT
    ca.l6_id AS aggr_column,
    ca.l6_name,
    ca.l0_name,ca.l2_name,ca.l3_name,ca.l4_name,ca.l5_name,ca.masterstyle_descr,ca.subbrand_description,ca.product_lifecycle,ca.collection,
    ca.color,ca.subbrand_code_desc,ca.current_assortment_group,ca.flex_style,ca.generic,ca.sizes_mat,ca.form,ca.user_defined_1,ca.user_defined_2,ca.user_defined_3,ca.user_defined_4,ca.user_defined_5,ca.user_defined_6,
    COALESCE(da.savetype_array, ARRAY[]::text[]) AS savetype_array,
    da.savetype,
    COALESCE(da.fiscal_year_week_draft, '''') AS fiscal_year_week_draft,
    COALESCE(da.approved_at, '''') AS approved_at,
    COALESCE(da.approved_by, '''') AS approved_by,
    COALESCE(fwm.fiscal_week_status_mapping, ''{}''::jsonb) AS fiscal_week_status_mapping,
    JSONB_AGG(ca.channel_data ORDER BY ca.channel) AS status_obj
FROM channel_agg ca
LEFT JOIN draft_agg da ON ca.l6_id = da.l6_id
LEFT JOIN fiscal_week_mapping fwm ON ca.l6_id = fwm.l6_id
GROUP BY ca.l6_id, ca.l6_name, ca.l0_name,ca.l2_name,ca.l3_name,ca.l4_name,ca.l5_name,ca.masterstyle_descr,ca.subbrand_description,ca.product_lifecycle,ca.collection,
    ca.color,ca.subbrand_code_desc,ca.current_assortment_group,ca.flex_style,ca.generic,ca.sizes_mat,ca.form,ca.user_defined_1,ca.user_defined_2,ca.user_defined_3,ca.user_defined_4,ca.user_defined_5,ca.user_defined_6,
    da.savetype_array,da.savetype,da.fiscal_year_week_draft,da.approved_at,da.approved_by,fwm.fiscal_week_status_mapping) X 
' || meta;
   
   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open $1 for execute v_recommended_orders_sql;
   RETURN v_recommended_orders_sql;
 end
 $function$
;
