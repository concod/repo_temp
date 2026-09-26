--liquibase formatted sql
--changeset aman_lakkoju:Added filter for A/M runOnChange:true stripComments:false splitStatements:false context:MTP-51712 labels:subclass_summary_change
--comment:Added filter for A/M
--rollback:SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_subclass_otb_summary(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_subclass_otb_summary(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql           text:='';
   v_otb_summ_sql     text:='';
   v_date_filter      text:='';
   v_date_rec         record;
  
  
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
  for v_date_rec in select * from jsonb_to_recordset($3) as x(attribute_name text, "start_date" date, "end_date" date)
 	loop
 		v_date_filter := v_date_filter||' and oor.'||v_date_rec.attribute_name||' between ''' ||v_date_rec.start_date||''' and '''||v_date_rec.end_date||'''';
 	end loop;  
 v_otb_summ_sql := 
 	'select
      aggr.l2_name,
      aggr.channel,
      aggr.planning_ownership,
      aggr.fiscal_month_name as fiscal_year_month,
	  aggr.fiscal_year_month as year_month,
      sum(coalesce(aggr.mfp, 0)) mfp,
      sum(coalesce(aggr.receipt_cost, 0)) as recom_receipts,
	  sum(coalesce(aggr.receipt_cost_all_recom,0)) as receipt_cost_all_recom,
	  sum(coalesce(aggr.mfp_receipt_cost, 0)) as mfp_recom_receipts,
	  sum(coalesce(aggr.mfp_receipt_cost_all_recom,0)) as mfp_receipt_cost_all_recom,      
      sum(coalesce(aggr.po_receipts_cost, 0)) as approved_po_old,
      sum(coalesce(aggr.approved_receipt_cost, 0)) as approved_po_new,
      sum(coalesce(cast(aggr.mfp as float8)-cast(aggr.approved_receipt_cost as float8) -
      cast(aggr.po_receipts_cost as float8),0)) as otb
  	from
      (
       with fiscal_calendar as (
                              select "date",
                              fiscal_year_month,
                              fiscal_month_name
                              from "global".fiscal_date_mapping
                              order by
                          fiscal_year_month)
      
          select
              tab_a.l2_name,
              tab_a.channel,
              tab_a.planning_ownership,
              tab_a.fiscal_year_month,
              tab_a.fiscal_month_name,
              coalesce(ooo.approved_otb, 0) approved_otb,
              coalesce(ooo.otb, 0) otb,
              coalesce(ooo.mfp, 0) mfp,
              coalesce(ooo.total_cost,0) as po_receipts_cost, 
              coalesce(tab_b.receipt_cost, 0) as receipt_cost,
              coalesce(tab_b.mfp_receipt_cost, 0) as mfp_receipt_cost,              
			  coalesce(tab_d.receipt_cost_all_recom,0) as receipt_cost_all_recom,
			  coalesce(tab_d.mfp_receipt_cost_all_recom,0) as mfp_receipt_cost_all_recom,              
              coalesce(tab_c.approved_receipt_cost, 0) as approved_receipt_cost
          from
              (
                  with l2_list as (
                      select
                          pf.l2_name,
                          pf.product_channel_name as channel,
                          pf.planning_ownership
                      from
                           ('||v_pa_sql||') pf 
                           where planning_ownership not like ''S''
                      group by
                          l2_name,
                          channel,
                          planning_ownership
                  )
                  
                  select
                      l2_name,
                      channel,
                      planning_ownership,
                      fiscal_year_month,
                      fiscal_month_name
                  from
                      l2_list
                      cross join 
                      (select distinct  fiscal_year_month,fiscal_month_name from fiscal_calendar where
                       date between current_date and current_date + 180) as fdm
              ) tab_a
              left join (
                  with orders as (
                      select 
                          l2_name,
                          product_channel_name as channel,
                          planning_ownership,
                          oor.editable_not_before_date,
                          oor.unit_cost,
                          oor.order_quantity,
                          oor.roq_constrained
                      from
                          inventory_smart.oms_orders_recommended oor
                          inner join (
                              '||v_pa_sql||'
                          ) paf on oor.product_code = paf.product_code
                      where
                          oor.order_status_id = 0
                          and oor.editable_not_before_date between current_date
                          and current_date + 180
                          and not oor.is_deleted
			              '||v_date_filter||'			   
                  )
                  select
                      l2_name,
                      channel,
                      planning_ownership,
                      fdm.fiscal_year_month,
                      fdm.fiscal_month_name,
                      sum((orders.unit_cost * orders.order_quantity)) as receipt_cost,
                      sum((orders.unit_cost * orders.roq_constrained)) as mfp_receipt_cost
                  from
                      orders
                      join fiscal_calendar fdm on orders.editable_not_before_date = fdm."date"
  
                  group by
                      l2_name,
                      channel,
                      planning_ownership,
                      fdm.fiscal_year_month,
                      fdm.fiscal_month_name
              ) tab_b on tab_a.l2_name = tab_b.l2_name and tab_a.channel=tab_b.channel and tab_a.planning_ownership=tab_b.planning_ownership
              and tab_a.fiscal_year_month = tab_b.fiscal_year_month
			
              left join (
                  with approved_orders as (
                      select
                          l2_name,
                          product_channel_name as channel,
                          planning_ownership,
                          ooa.not_before_date,
                          ooa.unit_cost,
                          ooa.order_quantity
                      from
                          inventory_smart.oms_orders_approved ooa
                          inner join ('||v_pa_sql||') paf 
                          on ooa.product_code = paf.product_code
                      where
                          ooa.order_status_id = 3
                          and ooa.order_placement_date = (select ((current_timestamp at time zone ''UTC'')::date)))
                  select
                      l2_name,
                      channel,
                      planning_ownership,
                      fdm.fiscal_year_month,
                      fdm.fiscal_month_name,
                      sum((approved_orders.unit_cost * approved_orders.order_quantity)) as approved_receipt_cost
                  from
                      approved_orders
                      join fiscal_calendar fdm on approved_orders.not_before_date = fdm."date"
                  group by
                      l2_name,
                      channel,
                      planning_ownership,
                      fdm.fiscal_year_month,
                      fdm.fiscal_month_name
              ) tab_c on tab_a.l2_name = tab_c.l2_name and tab_a.channel=tab_c.channel and tab_a.planning_ownership=tab_c.planning_ownership
              and tab_a.fiscal_year_month = tab_c.fiscal_year_month

			  left join (
                 with four_weeks_recom_order as (
                      select 
                          l2_name,
                          product_channel_name as channel,
                          planning_ownership,
                          oor.editable_not_before_date,
                          oor.unit_cost,
                          oor.order_quantity,
                          oor.roq_constrained
                      from
                          inventory_smart.oms_orders_recommended oor
                           left join (
                              select * from "global".product_attributes_filter 
                          ) paf on oor.product_code  = paf.product_code
                      where
                          oor.order_status_id = 0
                          and oor.editable_not_before_date between current_date
                          and current_date + 180
                          and not oor.is_deleted
                  ),
                  max_fw as (
					  select MAX(ROP) AS max_fw from inventory_smart.oms_orders_recommended oor
				),
				 next_few_weeks_recom_order as(
						select 
						
                          l2_name,
                          product_channel_name as channel,
                          planning_ownership,
                          oorb.not_before_date as editable_not_before_date,
                          oorb.unit_cost,
                          oorb.roq as order_quantity,
                          oorb.constrained_roq as roq_constrained
                      from
                          inventory_smart.oms_orders_recommended_base oorb
                          left join (
                              select * from "global".product_attributes_filter 
                          ) paf on oorb.product_code = paf.product_code
                      where
                          oorb.order_status_id = 0
                          and oorb.not_before_date between current_date
                          and current_date + 180
                          and not oorb.is_deleted
                          and start_week_date>(SELECT max_fw FROM  max_fw)
				 
				)
				
                  select
                      l2_name,
                      channel,
                      planning_ownership,
                      fdm.fiscal_year_month,
                      fdm.fiscal_month_name,
                      sum((t.unit_cost * t.order_quantity)) as receipt_cost_all_recom,
                      sum((t.unit_cost*t.roq_constrained)) as mfp_receipt_cost_all_recom
                  from
                      (select * from four_weeks_recom_order 
                      union 
                      select * from next_few_weeks_recom_order) t
                      join 
                      	fiscal_calendar fdm on t.editable_not_before_date = fdm."date"
                  group by
                      l2_name,
                      channel,
                      planning_ownership,
                      fdm.fiscal_year_month,
                      fdm.fiscal_month_name
              ) tab_d on tab_a.l2_name = tab_d.l2_name and tab_a.channel=tab_d.channel and tab_a.planning_ownership=tab_d.planning_ownership
              and tab_a.fiscal_year_month = tab_d.fiscal_year_month

              left join inventory_smart.oms_otb_output ooo on tab_a.l2_name = ooo.l2_name and tab_a.channel=ooo.channel and tab_a.planning_ownership=ooo.planning_ownership 
              and tab_a.fiscal_year_month = ooo.fiscal_year_month
      ) aggr
  group by
      aggr.l2_name,
      aggr.channel,
      aggr.planning_ownership,
      aggr.fiscal_month_name,
      aggr.fiscal_year_month
  order by
      aggr.l2_name,
      aggr.channel,
      aggr.planning_ownership';
  
   raise notice 'v_otb_summ_sql %',v_otb_summ_sql;
   open $1 for execute v_otb_summ_sql;
   RETURN $1;
 end
 $function$
;
