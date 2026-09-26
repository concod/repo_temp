--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:perform_match_with_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-44717
--comment:  match with op fixed
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.perform_match_with(p_kpis_to_copy text[], kpis_to_calculate jsonb, p_from_plan_code integer, p_to_plan_code integer, p_from_version integer, p_plan_type character varying);
CREATE OR REPLACE FUNCTION plan_smart.perform_match_with(p_kpis_to_copy text[], kpis_to_calculate jsonb, p_from_plan_code integer, p_to_plan_code integer, p_from_version integer, p_plan_type character varying DEFAULT 'SALES'::character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare 
 v_return int:=0;
begin 
	if p_from_version  in (8,10) 
	then
	  raise notice 'call to plan_smart.perform_match_with_iaf';
	  select * into v_return 
	  from plan_smart.perform_match_with_iaf(p_kpis_to_copy, kpis_to_calculate, p_from_plan_code , p_to_plan_code , p_from_version, 'SALES');
	elsif p_from_version in (6,7)
	then 
	  raise notice 'call to plan_smart.perform_match_with_ly';
      select * into v_return
      from plan_smart.perform_match_with_ly(p_kpis_to_copy, kpis_to_calculate, p_from_plan_code , p_to_plan_code , p_from_version, 'SALES');  
    else
      raise notice 'call to plan_smart.perform_match_with_ty';
     select * into v_return
     from  plan_smart.perform_match_with_ty(p_kpis_to_copy ,kpis_to_calculate, p_from_plan_code , p_to_plan_code , p_from_version, 'SALES');
	end if;
raise notice 'v_return=%', v_return;
 return v_return;
end;
$function$
;

