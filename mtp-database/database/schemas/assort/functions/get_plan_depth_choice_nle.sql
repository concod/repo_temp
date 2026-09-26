--liquibase formatted sql
--changeset sadhana.jaiswal@impactanalytics.co:depth-choice-query-update runOnChange:true stripComments:false splitStatements:false context:MTP-45088 handled_qtr_empty_data labels:liquibase_project_start
--comment: MTP-45088
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_plan_depth_choice_nle(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_plan_depth_choice_nle(input jsonb)
 RETURNS TABLE(plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, channel text, sub_channel text, drop text, flow text, flow_penetration_ty double precision, aur_ty double precision, drop_receipt_quantity_ty double precision, drop_penetration_ty double precision, quarter integer, flow_receipts_quantity_ty double precision, "receipt$" double precision)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort.get_plan_depth_choice_nle
 Created by: Hemant Kumar
 Created at: 06-Fab-2024
 Update at: 06-Fab-2024
 No of input parameter: 1
 Parameter Description : $1, jsonb

 Purpose: This function been created to get for 2-2 screen depth & choice for NLE size review details

 Calling Statement:
SELECT assort.get_plan_depth_choice_nle('{"filters":[{"attribute_name":"plan_code","value":[2655],"operator":"in"}]}');


 Hemant Kumar:
 */
 declare
 	_query_combine text;
 	_where text;
 	_input_data jsonb;
 	_filter_data jsonb;
 	begin
 		_where:=null;
 		_input_data:= $1::jsonb;
 		_filter_data:=(_input_data->>'filters')::jsonb;

     	-- prepare where clause
         _where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );

 		_query_combine := 'with depth_choice as (
  select
      plan_culs_dc.plan_code,
      plan_culs_dc.l0_name,
      plan_culs_dc.l1_name,
      plan_culs_dc.l2_name,
      plan_culs_dc.l3_name,
      plan_culs_dc.channel,
      plan_culs_dc.sub_channel,
      plan_culs_dc.drop,
      pbmd.flow,
      pbmd.flow_penetration_ty,
      avg(plan_l3_opt.aur_ty) aur_ty,
                                               coalesce(NULLIF(SUM(SUM(round(plan_culs_dc.depth) * round(plan_culs_dc.choice) * (y.store_cnt) * pbmd.flow_penetration_ty)) OVER (PARTITION BY plan_culs_dc.plan_code, plan_culs_dc.l0_name, plan_culs_dc.l1_name, plan_culs_dc.l2_name, plan_culs_dc.l3_name, plan_culs_dc.channel, plan_culs_dc.sub_channel, plan_culs_dc.drop), 0),0) drop_receipt_quantity_ty,
      COALESCE(
                 NULLIF(SUM(SUM(round(plan_culs_dc.depth) * round(plan_culs_dc.choice) * (y.store_cnt) * pbmd.flow_penetration_ty)) OVER (PARTITION BY plan_culs_dc.plan_code, plan_culs_dc.l0_name, plan_culs_dc.l1_name, plan_culs_dc.l2_name, plan_culs_dc.l3_name, plan_culs_dc.channel, plan_culs_dc.sub_channel, plan_culs_dc.drop), 0) /
                 NULLIF(SUM(SUM(round(plan_culs_dc.depth) * round(plan_culs_dc.choice) * (y.store_cnt) * pbmd.flow_penetration_ty)) OVER (PARTITION BY plan_culs_dc.plan_code, plan_culs_dc.l0_name, plan_culs_dc.l1_name, plan_culs_dc.l2_name, plan_culs_dc.l3_name, plan_culs_dc.channel, plan_culs_dc.sub_channel), 0),0) as drop_penetration_ty
from
      (
      select
          plan_code ,
          levels->>''l0_name'' as l0_name ,levels->>''l1_name'' as l1_name ,levels->>''l2_name'' as l2_name ,levels->>''l3_name'' as l3_name ,levels->>''sub_channel'' as sub_channel ,levels->>''channel'' as channel ,levels->>''drop'' as drop,
          levels->>''cluster_code'' cluster_code,
          NULLIF(attribute_value->>''depth_ty'', '''')::float8 depth,
          NULLIF(attribute_value->>''choice_ty'', '''')::float8 choice
      from
          assort.plan_cluster_depth_choice
          ' || _where ||'
       group by 1,2,3,4,5,6,7,8,9,10,11) as plan_culs_dc
  join (
      select
          cm.cluster_plan_code as plan_code ,
          cm.cluster_name cluster_code,
          count(cbma.attribute_value) as store_cnt
      from
          cluster_smart.plan_cluster_final cm
      join cluster_smart.plan_cluster_store_final cbma on
          cm.cluster_code_id = cbma.cluster_code_id
       where cluster_plan_code in  ( SELECT attribute_value::int4 FROM assort.plan_attributes
                    ' || _where ||'   and attribute_name =''cluster_plan_code'')  and cbma.attribute_name = ''store_code''
      group by
          cm.cluster_name,
          cm.cluster_plan_code) y on
      y.cluster_code = plan_culs_dc.cluster_code
  left join (
      select
          plan_code,
          levels->>''l0_name'' as l0_name ,levels->>''l1_name'' as l1_name ,levels->>''l2_name'' as l2_name ,levels->>''l3_name'' as l3_name ,levels->>''sub_channel'' as sub_channel ,levels->>''channel'' as channel ,levels->>''drop'' as drop,
          (attribute_value->>''aur_ty'')::float8 aur_ty
      from
          assort.plan_l3_opt_master
         ' || _where ||'  and levels ->> ''optimization_level'' = ''l3_optimization'') plan_l3_opt on
      plan_culs_dc.l0_name = plan_l3_opt.l0_name  and plan_culs_dc.l1_name = plan_l3_opt.l1_name  and plan_culs_dc.l2_name = plan_l3_opt.l2_name  and plan_culs_dc.drop = plan_l3_opt.drop  and plan_culs_dc.sub_channel = plan_l3_opt.sub_channel  and plan_culs_dc.channel = plan_l3_opt.channel  and plan_culs_dc.l3_name = plan_l3_opt.l3_name
      join(select a.plan_code,a.l0_name,a.l1_name,a.l2_name,a.l3_name,a.channel,a.sub_channel,a.drop,
       case when a.flow = ''-_'' then ''-''
       else a.flow end flow,
       a.flow_penetration_ty
                      from
                      (select plan_code,
                      concat(split_part(attribute_name,''_'',1), ''_'',  split_part(attribute_name,''_'',2)) as drop,
                      concat(split_part(attribute_name,''_'',3), ''_'',  split_part(attribute_name,''_'',4)) as flow,
                      attribute_value::int as flow_length
                      from assort.plan_attributes
                         ' || _where ||'  and attribute_name like (''%flow%'')) pa
                      right join(
                      select plan_code,l0_name,l1_name,l2_name,l3_name,drop,channel,sub_channel,
                      concat(split_part(attribute_name,''_'',1), ''_'',  split_part(attribute_name,''_'',2)) as flow,
                      attribute_value as flow_penetration_ty
                      from(
                      SELECT
                        plan_code,levels->>''l0_name'' l0_name,levels->>''l1_name'' l1_name,levels->>''l2_name'' l2_name,levels->>''l3_name'' l3_name,levels ->>''channel'' channel,levels ->>''sub_channel'' sub_channel,attribute_value ->>''drop'' drop,
                        key AS attribute_name,
                        (value::float8) AS attribute_value
                      FROM
                        assort.plan_budget_master_drop pbmd ,
                        jsonb_each_text(attribute_value) AS flattened_json
                          ' || _where ||'  and key LIKE ''%flow%'' and key like ''flow_%_penetration_ty''
                       union
                       SELECT
                        plan_code,levels->>''l0_name'' l0_name,levels->>''l1_name'' l1_name,levels->>''l2_name'' l2_name,levels->>''l3_name'' l3_name,levels ->>''channel'' channel,levels ->>''sub_channel'' sub_channel,attribute_value ->>''drop'' drop,
                        ''-'' attribute_name,
                        sum(value::float8) AS flow_penetration_ty
                      FROM
                        assort.plan_budget_master_drop pbmd ,
                        jsonb_each_text(attribute_value) AS flattened_json
                          ' || _where ||'  and key = ''-_penetration_ty''
                       group by 1,2,3,4,5,6,7,8) flow_pen)a
                       on a.drop = pa.drop and a.flow = pa.flow
                       order by 1,2,3,4,5,6,7,8,9
                 ) pbmd on
        plan_l3_opt.l0_name = pbmd.l0_name and plan_l3_opt.l1_name = pbmd.l1_name and plan_l3_opt.l2_name = pbmd.l2_name and plan_l3_opt.l3_name = pbmd.l3_name and plan_l3_opt.drop = pbmd.drop and plan_l3_opt.plan_code = pbmd.plan_code
        and plan_l3_opt.sub_channel = pbmd.sub_channel and plan_l3_opt.channel = pbmd.channel
      group by 1,2,3,4,5,6,7,8,9,10),
       fiscal_base as (select distinct on (flow) * from (
            select distinct drop, flow,min(Quarter)Quarter, sum(count_days) as days
            from(
            select drop,flow,fm,(fm::int - 1)/3 + 1 as Quarter, count(distinct calendar_date) as count_days
            from (
            select drop,flow,flow_length,
                 (selling_period_edate - interval ''1 WEEK''*(weeks_from_end) + interval ''1 DAY'')flow_start_date,
                 (selling_period_edate - interval ''1 WEEK''*(weeks_from_end - flow_length))flow_end_date
                 , selling_period_sdate,selling_period_edate
            from
                 (select *,sum(flow_length) over (partition by drop order by flow_rank) as weeks_from_end
                 from(
                 select * ,
                 rank() over (partition by drop order by flow desc) as flow_rank
                 from (
                      select plan_code,concat(split_part(attribute_name,''_'',1), ''_'',  split_part(attribute_name,''_'',2)) as drop,
                      concat(split_part(attribute_name,''_'',3), ''_'',  split_part(attribute_name,''_'',4)) as flow,
                      attribute_value::int as flow_length
                      from assort.plan_attributes
                         ' || _where ||'  and attribute_name like (''%flow%'')
                      )a)b
                 left join (select plan_code, selling_period_sdate,selling_period_edate from assort.plan_master) pms
                 using(plan_code)) as base) flow_base
            join assort.fiscal_calendar fc
            on fc.calendar_date  between flow_base.flow_start_date and flow_base.flow_end_date
            group by drop, flow, fm
            ) as base
            where count_days > (7/2)
            group by 1,2) a
            order by flow,days desc)
       select distinct depth_choice.*, coalesce(quarter,0) quarter,
                      coalesce(round((drop_receipt_quantity_ty * (flow_penetration_ty)::float8)::numeric ,2)::float,0) flow_receipts_quantity_ty,
                      coalesce((((drop_receipt_quantity_ty * (flow_penetration_ty)::float8) * aur_ty)::float8),0) receipt$
                      from
       depth_choice
       left join fiscal_base
       using(flow)
							 ';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
