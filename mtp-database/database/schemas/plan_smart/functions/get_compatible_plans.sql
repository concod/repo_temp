--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_compatible_plans runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-24724
--comment: plan_display_name column added in returning refcursor
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_compatible_plans(input refcursor, p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.get_compatible_plans(input refcursor, p_plan_code integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_sql  text;
   v_plan_type_operator text;
 begin
 	
   select
     case 
	   when plan_type_desc  = 'pre-season' then 'in' 
	   else 'not in'
	 end as plan_type_operator
   into
     v_plan_type_operator
   from
     plan_smart.vw_plan_master 
   where
     plan_code = p_plan_code;
 
   v_sql :=           '(select
 						              available_plans.plan_code,
                          available_plans.name,
                          available_plans.scenario_name,
                          available_plans.plan_display_name,
                          available_plans.year,
                          to_char(available_plans.created_at,''yyyy-mm-dd'') as create_at,
                          available_plans.status,
                          available_plans.l0_name::text[],
                          available_plans.l1_name::text[],
                          available_plans.l2_name::text[],
 						              available_plans.weeks::integer[],
 						              available_plans.description,
 						              available_plans.channel,
 						              available_plans.created_at,
 						              available_plans.updated_at,
 						              available_plans.created_by,
 						              available_plans.season::text[],
                          plan_smart.if_plan_got_data('||p_plan_code||')
                        from
                          (
                            select
 	                         *
                            from
 	                         plan_smart.vw_plan_master
                            where
 	                         plan_code = '||p_plan_code
                          ||') current_plan
                        inner join 
                          (
                            select
 	                         *
                            from
 	                         plan_smart.vw_plan_master
                            where
 	                         plan_code <> '||p_plan_code
 	                    ||'
                            and
                              status '||v_plan_type_operator||' (0, 1, 2)  
                            and
                              not is_deleted 
                           ) available_plans
                         on
                           current_plan.channel = available_plans.channel
                         and
                           current_plan.l2_name::text[] @> available_plans.l2_name::text[]
                         and 
                           current_plan.l2_name::text[] <@ available_plans.l2_name::text[]
                         and
                           current_plan.weeks::integer[] @> available_plans.weeks::integer[]
                         and
                           current_plan.weeks::integer[] <@ available_plans.weeks::integer[]
 
                        )';
   raise notice 'QUERY: %', v_sql;                   
   open $1 for execute v_sql;
   return $1;
 end
 $function$
;
