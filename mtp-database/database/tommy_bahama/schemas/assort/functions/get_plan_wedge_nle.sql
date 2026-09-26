--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:revert back to interger runOnChange:true stripComments:false splitStatements:false context:MTP-42922_MTP-46831 handled_qtr_empty_data, fixes qry_nle,int  labels:liquibase_project_start
--comment: handled_qtr_empty_data, fix_qry_nle, revert back to interger
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_plan_wedge_nle(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_plan_wedge_nle(input jsonb)
 RETURNS TABLE(plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, channel text, sub_channel text, drop text, flow text, drop_penetration_ty double precision, drop_receipt_quantity_ty double precision, flow_penetration_ty double precision, aur_ty double precision, quarter integer, flow_receipts_quantity_ty double precision, "receipt$" double precision)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort.get_plan_wedge_nle
 Created by: Hemant Kumar
 Created at: 24-Jan-2024
 Update at: 27-Mar-2024
 No of input parameter: 1
 Parameter Description : $1, jsonb

 Purpose: This function been created to get plan_wedge_opt_master details for NLE wedge details

 Calling Statement:
SELECT assort.get_plan_wedge_nle('{"filters":[{"attribute_name":"plan_code","value":[2655],"operator":"in"}]}');


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

 		_query_combine := '
with drop_flows as (
(
                                                                      select distinct flow_pen.plan_code, drop, flow                                                                   from(
                                                                      SELECT
                                                                        plan_code,levels->>''l0_name'' l0_name,levels->>''l1_name'' l1_name,levels->>''l2_name'' l2_name,levels ->>''channel'' channel,attribute_value ->>''sub_channel'' sub_channel,attribute_value ->>''drop'' drop,
                                                                        concat(split_part(key,''_'',1), ''_'',  split_part(key,''_'',2)) AS flow,
                                                                        (value::float8) AS flow_penetration_ty
                                                                      FROM
                                                                        assort.plan_budget_master_drop pbmd ,
                                                                        jsonb_each_text(attribute_value) AS flattened_json
                                                                         ' || _where ||' and key LIKE ''%flow%'' and key like ''flow_%_penetration_ty''
                                                                       union
                                                                       SELECT
                                                                        plan_code,levels->>''l0_name'' l0_name,levels->>''l1_name'' l1_name,levels->>''l2_name'' l2_name,levels ->>''channel'' channel,attribute_value ->>''sub_channel'' sub_channel,attribute_value ->>''drop'' drop,
                                                                        ''-'' flow,
                                                                        value::float8 AS flow_penetration_ty
                                                                      FROM
                                                                        assort.plan_budget_master_drop pbmd ,
                                                                        jsonb_each_text(attribute_value) AS flattened_json
                                                                         ' || _where ||'
                                                                        and key = ''-_penetration_ty''
                                                                       group by 1,2,3,4,5,6,7,8,9) flow_pen)
),
wedge as
                                             (
                                                       select plan_code,
                                                            levels ->> ''l0_name'' as l0_name,
                                                            levels ->> ''l1_name'' as l1_name,
                                                            levels ->> ''l2_name'' as l2_name,
                                                            levels ->> ''l3_name'' as l3_name,
                                                            levels ->> ''channel'' as channel,
                                                            levels ->> ''sub_channel'' as sub_channel,
                                                            levels ->> ''drop'' as drop,
                                                            levels ->> ''flow'' as flow,
                                                            -- Calculating drop penetration    by dividing (qty at l3-channel-drop level) by (qty at l3-channel level)
                                                            COALESCE(
                                                            NULLIF(SUM(SUM(cluster_store_count * cluster_qty)) OVER (PARTITION BY plan_code, levels ->> ''l0_name'', levels ->> ''l1_name'', levels ->> ''l2_name'', levels ->> ''l3_name'', levels ->> ''channel'', levels ->> ''sub_channel'', levels ->> ''drop''), 0) /
                                                            NULLIF(SUM(SUM(cluster_store_count * cluster_qty)) OVER (PARTITION BY plan_code, levels ->> ''l0_name'', levels ->> ''l1_name'', levels ->> ''l2_name'', levels ->> ''l3_name'', levels ->> ''channel'', levels ->> ''sub_channel''), 0),0) as drop_penetration_ty,
                                                            sum(cluster_store_count * cluster_qty) as drop_receipt_quantity_ty,
                                                            round(avg(drop_flow_perc)::numeric ,2)::float as flow_penetration_ty
                                                       from
                                                            (
                                                            select plan_code,
                                                                 levels,
                                                                 attribute_value,
                                                                 (attribute_value->> ''cluster_qty'' ) :: float as cluster_qty ,
                                                                 (attribute_value->> ''cluster_store_count'') :: float cluster_store_count,
                                                                 (attribute_value ->> ''flow_cluster_perc'') :: float flow_cluster_perc,
                                                                 (attribute_value ->> ''drop_flow_perc'') :: float drop_flow_perc
                                                            from
                                                                 assort.plan_wedge_opt_master
                                                               ' || _where ||'
                                             )vv
                                             group by
                                                  1,2,3,4,5,6,7,8,9
                                             order by 1,2,3,4,5,6,7,8,9
                                             ),

all_combs as (
select * from (select l0_name, l1_name, l2_name, l3_name, channel, sub_channel
from wedge
group by l0_name, l1_name, l2_name, l3_name, channel, sub_channel) as wedge_combs
cross join drop_flows
),
wedge_final as (
select plan_code, l0_name, l1_name, l2_name, l3_name, channel, sub_channel, drop, flow,
case when drop_penetration_ty is null then 0 else drop_penetration_ty end as drop_penetration_ty,
case when drop_receipt_quantity_ty is null then 0 else drop_receipt_quantity_ty end as drop_receipt_quantity_ty,
case when flow_penetration_ty is null then 0 else flow_penetration_ty end as flow_penetration_ty
from all_combs
left join wedge
using(plan_code, l0_name, l1_name, l2_name, l3_name, channel, sub_channel, drop, flow)
),
                                             fiscal_base as(
                                                 select flow, min(((fm::int - 1)/3 + 1)::int4) as Quarter
                                                 from(
                                                 select drop,flow,fm, count(distinct calendar_date) as count_days
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
                                                 where count_days > (7/2) group by flow),
                                             aur_data as
                                             (
                                                                 select
                                                                 plan_code,
                                                                 levels->>''l0_name'' l0_name,
                                                                 levels->>''l1_name'' l1_name,
                                                                 levels->>''l2_name'' l2_name,
                                                                 levels->>''l3_name'' l3_name,
                                                                 levels->>''drop'' drop,
                                                                 levels ->> ''channel'' channel,
                                                                 levels ->> ''sub_channel'' sub_channel,
                                                                 avg((attribute_value->>''aur_ty'')::float8) aur_ty
                                                                 from assort.plan_l3_opt_master pl
                                                                    ' || _where ||'
                                                                 group by 1,2,3,4,5,6,7,8
                                             )

                                             select
                                                  wedge_final.*, coalesce(aur_ty,0) as aur_ty,
                                                  -- Having quarter as 0 when it is null
                                                  case when Quarter is null then 0 else Quarter end as Quarter,
                                                  coalesce(round((drop_receipt_quantity_ty * flow_penetration_ty)::numeric, 2)::float,0) flow_receipts_quantity_ty,
                                                  coalesce(round(((drop_receipt_quantity_ty * flow_penetration_ty) * aur_ty)::numeric, 2)::float,0) receipt$
                                             from
                                                  wedge_final
                                             left join fiscal_base
                                                       using(
                                                  flow)
                                             left join aur_data
                                             using (plan_code, l0_name, l1_name, l2_name, l3_name, drop, channel, sub_channel)
							 ';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
