--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:add_lock_info runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-50282
--comment:  initial changeset for add_lock_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.add_lock_info(p_season_type character varying, p_channel text[], p_l0_name text[], p_l1_name text[], p_l2_name text[], p_l3_name text[], p_weeks integer[], p_action_code integer, p_user integer);
CREATE OR REPLACE FUNCTION plan_smart.add_lock_info(p_season_type character varying, p_channel text[], p_l0_name text[], p_l1_name text[], p_l2_name text[], p_l3_name text[], p_weeks integer[], p_action_code integer, p_user integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare 
  v_week                int4;
  v_channel             text;
  phf_rec               record;
  v_max_id              int8;
  v_id                  int8;
  v_product_filters_sql text:='';
  v_l0_predicate        text:='';
  v_l1_predicate        text:='';
  v_l2_predicate        text:='';
  v_l3_predicate        text:='';
  v_actioned_ts         timestamptz := now();
begin

 v_product_filters_sql :=
   'select distinct l0_name, l1_name, l2_name , l3_name
     from  plan_smart.product_hierarchies_filter phf';
 
 if cardinality(p_l0_name) <> 0 
 then
   v_l0_predicate := ' where l0_name = ANY(''{' || array_to_string(p_l0_name, ',') || '}'')';
 end if;

 if cardinality(p_l1_name) <> 0 
 then
   v_l1_predicate := ' and l1_name = ANY(''{' || array_to_string(p_l1_name, ',') || '}'')';
 end if;

 if cardinality(p_l2_name) <> 0 
 then
   v_l2_predicate := ' and l2_name = ANY(''{' || array_to_string(p_l2_name, ',') || '}'')';
 end if;


 if cardinality(p_l3_name) <> 0 
 then
   v_l3_predicate := ' and l3_name = ANY(''{' || array_to_string(p_l3_name, ',') || '}'')';
 end if;


 raise notice 'v_product_filters_sql %',v_product_filters_sql; 

 v_product_filters_sql := v_product_filters_sql || v_l0_predicate || v_l1_predicate || v_l2_predicate || v_l3_predicate;
 v_product_filters_sql := v_product_filters_sql || 'and l3_name is not null';

 raise notice 'v_product_filters_sql %',v_product_filters_sql; 

 for phf_rec in execute v_product_filters_sql
 loop
   foreach v_channel in array p_channel
   loop
     foreach v_week in array p_weeks
     loop
       select id 
       into v_id
       from plan_smart.lock_info 
       where season_type = p_season_type
       and channel = v_channel
       and l0_name = phf_rec.l0_name
       and l1_name = phf_rec.l1_name
       and l2_name = phf_rec.l2_name
       and l3_name = phf_rec.l3_name
       and week    = v_week;
       raise notice 'v_id %',v_id;
    
       select coalesce(max(id),0)
       into v_max_id
       from plan_smart.lock_info ;
      
   
       if v_id is null
       then
         insert into plan_smart.lock_info(
           id,         
	       season_type,
           channel,
	       l0_name,
	       l1_name,
	       l2_name,
	       l3_name,
           week,
           action_code
          )
         values(
           v_max_id+1,         
	       p_season_type,
           v_channel,
	       phf_rec.l0_name,
	       phf_rec.l1_name,
	       phf_rec.l2_name,
	       phf_rec.l3_name,
           v_week,
           p_action_code
          ) returning id into v_id;
         
         insert into plan_smart.lock_audit (
           id,
           lock_id,
           action_code,
           created_ts,
           created_by
           )
         values
          (
           nextval('plan_smart.lock_audit_id_seq'),
           v_id,
           p_action_code,
           v_actioned_ts,
           p_user
          );
       else
         update plan_smart.lock_info 
         set action_code =  p_action_code
         where id = v_id;
         
      
         insert into plan_smart.lock_audit (
           id,
           lock_id,
           action_code,
           created_ts,
           created_by
           )
         values(nextval('plan_smart.lock_audit_id_seq'),
           v_id,
           p_action_code,
           v_actioned_ts,
           p_user
          );      
       end if;
     end loop;
   end loop;
end loop;
return true;
end;
$function$
;
