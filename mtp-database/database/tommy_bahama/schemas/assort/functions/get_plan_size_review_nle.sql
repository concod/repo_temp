--liquibase formatted sql
--changeset sadhanaj:MTP-49575updated_query runOnChange:true stripComments:false splitStatements:false context:MTP-49575  labels:liquibase_project_start
--comment: MTP-49575 updated query for get_plan_size_review_nle
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_plan_size_review_nle(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_plan_size_review_nle(input jsonb)
 RETURNS TABLE(plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, channel text, sub_channel text, drop text, flow text, drop_penetration_ty double precision, drop_receipt_quantity_ty double precision, flow_penetration_ty double precision, aur_ty double precision, quarter integer, flow_receipts_quantity_ty double precision, "receipt$" double precision)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort.get_plan_size_review_nle
 Created by: Hemant Kumar
 Created at: 05-Fab-2024
 Update at: 05-Fab-2024
 No of input parameter: 1
 Parameter Description : $1, jsonb

 Purpose: This function been created to get for 2-4 screen details for NLE size review details

 Calling Statement:
SELECT assort.get_plan_size_review_nle('{"filters":[{"attribute_name":"plan_code","value":[2655],"operator":"in"}]}');

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

    _query_combine := 'with size_split as (

                    select
                      a.plan_code,
                      a.l0_name,
                      a.l1_name,
                      a.l2_name,
                      a.l3_name,
                      a.channel,
                      a.sub_channel,
                      a.drop,
                      a.flow,
                      COALESCE(
                      NULLIF(SUM(SUM(a.qty)) OVER (PARTITION BY a.plan_code, a.l0_name, a.l1_name, a.l2_name, a.l3_name, a.channel, a.sub_channel, a.drop), 0) /
                      NULLIF(SUM(SUM(a.qty)) OVER (PARTITION BY a.plan_code, a.l0_name, a.l1_name, a.l2_name, a.l3_name, a.channel, a.sub_channel), 0),0) as drop_penetration_ty,
                      NULLIF(SUM(SUM(a.qty)) OVER (PARTITION BY a.plan_code, a.l0_name, a.l1_name, a.l2_name, a.l3_name, a.channel, a.sub_channel, a.drop), 0) as drop_receipt_quantity_ty,
                      coalesce(round(avg(b.drop_flow_perc)::numeric ,2)::float,0) flow_penetration_ty,
                      coalesce(avg(l3_opt.aur_ty),0) aur_ty
                      from (
                        select
                          plan_code,
                          levels->>''l0_name'' l0_name,
                          levels->>''l1_name'' l1_name,
                          levels->>''l2_name'' l2_name,
                          levels->>''l3_name'' l3_name,
                          levels->>''drop'' drop,
                          levels->>''flow'' flow,
                          levels ->> ''channel'' channel,
                          levels ->> ''sub_channel'' sub_channel,
                          (attribute_value->>''drop_flow_perc'') ::float8 drop_flow_perc
                        from assort.plan_wedge_opt_master pwom
                          ' || _where ||'
                        group by 1,2,3,4,5,6,7,8,9,10) b
                      join(
                        select
                          plan_code,
                          levels->>''l0_name'' l0_name,
                          levels->>''l1_name'' l1_name,
                          levels->>''l2_name'' l2_name,
                          levels->>''l3_name'' l3_name,
                          levels->>''drop'' drop,
                          levels->>''flow'' flow,
                          levels ->> ''channel'' channel,
                          levels ->> ''sub_channel'' sub_channel,
                          sum((attributes->>''Quantity'')::float8) as qty
                        from assort.plan_finalize_size_master pfsm
                        group by 1,2,3,4,5,6,7,8,9) a
                      using(plan_code,l0_name,l1_name,l2_name,l3_name,drop,flow, channel, sub_channel)
                      join (
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

                          group by 1,2,3,4,5,6,7,8) l3_opt
                          using(plan_code,l0_name,l1_name,l2_name,l3_name,drop, channel, sub_channel)

                      group by 1,2,3,4,5,6,7,8,9
                      order by 1,2,3,4,5,6,7,8,9
                      ),

                    fiscal_base as (

                    select distinct on (drop,flow) * from (
                          select distinct drop, flow, min(Quarter) Quarter, sum(count_days) as days
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
                                ' || _where ||' and attribute_name like (''%flow%'')
                              )a)b
                            left join (select plan_code, selling_period_sdate,selling_period_edate from assort.plan_master) pms
                            using(plan_code)) as base) flow_base
                          join assort.fiscal_calendar fc
                          on fc.calendar_date  between flow_base.flow_start_date and flow_base.flow_end_date
                          group by drop, flow, fm
                          ) as base
                          where count_days > (7/2)
                          group by 1,2) a
                          order by drop,flow,days desc

                          ),

quarter_drop AS (
    SELECT ''-'' as flow, drop, quarter, days
    FROM fiscal_base
    WHERE SUBSTRING(drop, 6, 7) = SUBSTRING(flow, 5, 6)
),

fiscal_base_final as (
SELECT * FROM fiscal_base
union distinct
SELECT * FROM quarter_drop),


            all_combs as (
            select * from (

            select plan_code, l0_name, l1_name, l2_name, l3_name, channel, sub_channel
            from size_split
            group by plan_code, l0_name, l1_name, l2_name, l3_name, channel, sub_channel

            ) as wedge_combs
            cross join (select distinct drop, flow from fiscal_base_final) as drop_flow_combs


            ),

            size_split_final as (
            select all_combs.plan_code, l0_name, l1_name, l2_name, l3_name, channel, sub_channel, drop, flow,
            case when drop_penetration_ty is null then 0 else drop_penetration_ty end as drop_penetration_ty,
            case when drop_receipt_quantity_ty is null then 0 else drop_receipt_quantity_ty end as drop_receipt_quantity_ty,
            case when flow_penetration_ty is null then 0 else flow_penetration_ty end as flow_penetration_ty,
            case when aur_ty is null then 0 else aur_ty end as aur_ty
            from all_combs
            left join size_split
            using(l0_name, l1_name, l2_name, l3_name, channel, sub_channel, drop, flow)
            )

                              select distinct size_split_final.*, coalesce(quarter,0) quarter,
                                    --flow_penetration_ty as flow_penetration_ty,
                                    coalesce(round((drop_receipt_quantity_ty * flow_penetration_ty)::numeric ,2)::float,0) flow_receipts_quantity_ty,
                                    coalesce((((drop_receipt_quantity_ty * flow_penetration_ty) * aur_ty)::float8)::float,0) receipt$
                                    from
                              size_split_final
                              left join fiscal_base_final
                              using(drop,flow)

               ';
    raise notice '%', _query_combine;
    RETURN QUERY execute _query_combine;
    end
 $function$
;


