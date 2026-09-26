--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:merge_working_plan_to_final_plan_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-26928
--comment: Lock and Approve audit view fixed
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.merge_working_plan_to_final_plan(p_channel text, p_product_filters jsonb, p_weeks integer[], p_final_plan_status integer, p_user integer, p_plan_type character varying);
CREATE OR REPLACE FUNCTION plan_smart.merge_working_plan_to_final_plan(p_channel text, p_product_filters jsonb, p_weeks integer[], p_final_plan_status integer, p_user integer, p_plan_type character varying DEFAULT 'SALES'::character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
/*
 select * 
 from plan_smart.merge_working_plan_to_final_plan(
 'Full Line Retail',
 '{
    "l0_name": [{"type": "list", "operator": "in", "values": ["Bags"]}], 
    "l1_name": [{"type": "list", "operator": "in", "values": ["Baby Bags"]}], 
    "l2_name": [{"type": "list", "operator": "in", "values": ["Baby Bags"]}]
  }'::jsonb,
  ARRAY[202414, 202415, 202416, 202417, 202418, 202419, 202420, 202421, 202422, 202423, 202424, 202425, 202426]::int[],
  5,--plan status (1 for OP and 5 for OF)
  250
 ) 
 */

declare
  v_l0               text[];
  v_l1               text[];
  v_classes          text[];
  v_affected_rows    int:=0;
  v_paf              text;
  v_classes_list_sql text;
  v_kpi_str          text;
  v_upd_kpi_str      text;
  v_sql              text;
  i                  int;
  j                  record;
  v_actioned_ts      timestamptz := now();
begin
  v_paf := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'product_code', p_product_filters);  
    raise notice '%', v_paf;

  v_classes_list_sql := 'select array_agg( distinct l0_name),array_agg( distinct l1_name),array_agg( distinct l2_name) from ('||v_paf||') paf';
  execute v_classes_list_sql into v_l0,v_l1,v_classes;
  raise notice '%', v_classes;
  select
    string_agg('kpi'||kpino, ',') as kpi_str ,
    string_agg('kpi'||kpino||' = excluded.kpi'||kpino, ',') as upd_kpi_str
  into
    v_kpi_str,
    v_upd_kpi_str
  from
    generate_series(1,250) kpino ;
   
  for j in (select distinct plan_table 
              from plan_smart.query_source_mappings qsm 
             where plan_status = p_final_plan_status
               and plan_type = p_plan_type
           )
  loop
    call plan_smart.create_plan_schema(replace(j.plan_table,'plan_smart.',''),
                                       ('{"'||p_channel||'"}')::text[],
                                       p_weeks::int[]
                                       );                               
    v_sql := 
      'insert into '||j.plan_table||'(
  	     channel,
 	     hierarchy_code,
 	     class,
 	     current_week,
         '||v_kpi_str||'
         )
       select
         p.channel,
 	     p.hierarchy_code,
 	     p.class,
 	     p.current_week,
         '||v_kpi_str||'
       from '||replace(replace(j.plan_table,'op','wp'),'lf','wf')||' p
       where p.channel = '''||p_channel||'''
       and p.class = ANY(''{' || array_to_string(v_classes, ',') || '}'')
       and p.current_week = ANY(''{' || array_to_string(p_weeks, ',') || '}'')
       on conflict ON CONSTRAINT pk_'||replace(j.plan_table,'plan_smart.','') ||' do update 
       set '||v_upd_kpi_str;

    raise notice '%', v_sql;
    execute v_sql;

    GET DIAGNOSTICS v_affected_rows =  ROW_COUNT;
    raise notice '%',v_affected_rows;
  end loop;
   
  if v_affected_rows > 0
  then
      -- unlock the plan rows
      update plan_smart.lock_info 
      set action_code = (select action_code from "global".action_master where action = 'unlock')
      where season_type  =  case when p_final_plan_status = 5 then 'in-season' 
                                 when p_final_plan_status = 1 then 'pre-season' 
                            end
      and l0_name =  ANY(coalesce(v_l0,'{}'))
      and l1_name =  ANY(coalesce(v_l1,'{}'))
      and l2_name =  ANY(coalesce(v_classes,'{}'))
      and week = ANY(coalesce(p_weeks,'{}'))
      and channel = p_channel;
     
      -- audit approve action
      insert into plan_smart.lock_audit (
           id,
           lock_id,
           action_code,
           created_ts,
           created_by
           )
      select 
           nextval('plan_smart.lock_audit_id_seq'),
           id,
           (select action_code from "global".action_master where action = 'approve'),
           v_actioned_ts,
           p_user
      from plan_smart.lock_info 
      where season_type  =  case when p_final_plan_status = 5 then 'in-season' 
                                 when p_final_plan_status = 1 then 'pre-season' 
                            end
      and l0_name =  ANY(coalesce(v_l0,'{}'))
      and l1_name =  ANY(coalesce(v_l1,'{}'))
      and l2_name =  ANY(coalesce(v_classes,'{}'))
      and week = ANY(coalesce(p_weeks,'{}'))
      and channel = p_channel;
         
  end if;
   
  return v_affected_rows;
end;  
$function$
;
