--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:copy_wp_plan_chg3 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-49945
--comment: channel array
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.copy_wp_plan(integer, character varying);
CREATE OR REPLACE FUNCTION plan_smart.copy_wp_plan(integer, character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare _new_planid int := 0;
_in_planid int := 0;
_status int := 0;
_plan_display_name character varying;
_weeks text [];
_phf_level int;
_hcodes int [];
_plan_status int;
_channel text;
_plan_table text;
_plan_type text;
_kpi_str text;
_sql_text text;
begin _in_planid := $1;
_plan_display_name := $2;
select channels,
    weeks::text [],
    status,
    coalesce(plan_type, 'SALES') as plan_type into _channel,
    _weeks,
    _plan_status,
    _plan_type
from plan_smart.vw_plan_master
where plan_code = _in_planid;
select distinct plan_table,
    product_hierarchy_filter_level into _plan_table,
    _phf_level
from plan_smart.query_source_mappings
where plan_type = _plan_type
    and plan_status = _plan_status;
raise notice '%',
_plan_type;
raise notice '%',
_plan_status;
raise notice '%',
_plan_table;
raise notice '%',
_phf_level;
if _plan_status = 4 then _status = 3;
elsif _plan_status = 0 then _status = 2;
end if;
INSERT INTO plan_smart.plan_master (
        "name",
        plan_period_sdate,
        plan_period_edate,
        compare_year,
        channel,
        updated_by,
        created_by,
        plan_type,
        special_classification,
        planning_level_hierarchy,
        plan_display_name
    )
SELECT "name",
    plan_period_sdate,
    plan_period_edate,
    compare_year,
    channel,
    updated_by,
    created_by,
    plan_type,
    special_classification,
    planning_level_hierarchy,
    _plan_display_name
FROM plan_smart.plan_master
WHERE plan_code = _in_planid
returning plan_code into _new_planid;
insert into plan_smart.plan_attributes(plan_code, attribute_name, attribute_value)
select _new_planid,
    attribute_name,
    attribute_value
FROM plan_smart.plan_attributes
WHERE plan_code = _in_planid;
update plan_smart.plan_attributes
set attribute_value = _status
where plan_code = _new_planid
    and attribute_name = 'status';
perform plan_smart.populate_plan_filter_mappings(_new_planid);
perform plan_smart.create_plan_modification_partition(_new_planid);
if _status in (2, 3) then _sql_text := format(
    '
     select array_agg(distinct hierarchy_code)
       from plan_smart.product_hierarchies_filter 
      where l0_name = ANY(select unnest(l0_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = %L)
        and l1_name = ANY(select unnest(l1_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = %L)
        and l2_name = ANY(select unnest(l2_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = %L)
        and l3_name = ANY(select unnest(l3_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = %L)
        and level = %L',
    _in_planid,
    _in_planid,
    _in_planid,
    _in_planid,
    _phf_level
);
raise notice '%',
_sql_text;
execute _sql_text into _hcodes;
select string_agg('kpi' || kpino, ', ') into _kpi_str
from generate_series(1, 250) AS kpino;
_sql_text := format(
    'insert into plan_smart.plan_modifications_%1s
      select 
        %2L as plan_code,
        channel,
 		class,
 	    current_week,
        hierarchy_code,
        %3s,
        %4L
     from
        %5s
     where 
       channel = any(%6L)
     and
       current_week = any(%7L)
     and
       hierarchy_code = any(%8L)',
    _new_planid::text,
    _new_planid,
    _kpi_str,
    'WP',
    _plan_table,
    _channel,
    _weeks,
    _hcodes
);
raise notice '%',
_sql_text;
execute _sql_text;
end if;
return _new_planid;
end;
$function$
;
