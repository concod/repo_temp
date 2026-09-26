--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:populate_plans_chg6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39944
--comment: Create and persist Audit Trail of all PlanSmart Edit operations and link it to Plan Version tables
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.populate_plans(p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.populate_plans(p_plan_code integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_week                 int4[];
    v_channel              text;
    v_plan_status          int4;
    v_level_id             int4;
    v_kpi_str1             text := '';
    v_kpi_str2             text := '';
    v_hierarchy_code_list  jsonb;
    v_sql                  text;
    v_sql_plan_mod         text;
    v_l0_name              text[];
    v_l1_name              text[];
    v_l2_name              text[];
    v_l3_name              text[];
    v_business_unit        text;
    v_created_by           int4;
    v_created_at           timestamptz;
    v_plan_table           text;
    v_plan_type            text;
    v_affected_rows        int4:=-1; 
    i                      record;
begin
	
	select
	  'channel,class,current_week,hierarchy_code,'||string_agg('kpi' || kpino, ', '),
	  'channel,class,current_week,hierarchy_code,'||string_agg('0 as kpi' || kpino, ', ')
	into
	  v_kpi_str1,
	  v_kpi_str2
    FROM generate_series(1, 250) AS kpino ;
   	
    select
      channel,
      l0_name,
      l1_name,
      l2_name,
      l3_name,
      weeks,
      status,
      coalesce(plan_type,'SALES') as plan_type,
      business_unit,
      created_by,
      created_at
    into
      v_channel,
      v_l0_name,
      v_l1_name,
      v_l2_name,
      v_l3_name,
      v_week,
      v_plan_status,
      v_plan_type,
      v_business_unit,
      v_created_by,
      v_created_at
    from
      plan_smart.vw_plan_master
    where
      plan_code = p_plan_code;
     
    raise notice 'v_plan_type:%', v_plan_type;
    raise notice 'v_plan_status:%', v_plan_status;
   
    for i in (
        select
          distinct plan_table,
          product_hierarchy_filter_level
        from
          plan_smart.query_source_mappings
        where
          plan_type = v_plan_type
        and
          plan_status = v_plan_status
    )
    loop
      
	  call plan_smart.create_plan_schema(split_part(i.plan_table,'.',2),array[v_channel]::text[], v_week);
      
	  v_sql = format('
       select
         json_object_agg(hierarchy_code, l2_name)
       from
         plan_smart.product_hierarchies_filter 
       where
         l0_name = ANY(%L)
       and
         l1_name = ANY(%L)
       and
         l2_name = ANY(%L)
       and
         l3_name = ANY(%L)
       and
        level = %L
	     and
        business_unit @> %L'
      ,v_l0_name
      ,v_l1_name
      ,v_l2_name
      ,v_l3_name
      ,i.product_hierarchy_filter_level
      ,array[v_business_unit]
      );
     
      raise notice 'v_sql:%', v_sql;
     
      execute v_sql into v_hierarchy_code_list;
     
      v_sql = format('
      insert into %s(%s,created_by,created_at,updated_by,updated_at)
      select 
       %s,%L,%L,%L,%L
      from
        (select %L as channel) a
      cross join
        (select key::int as hierarchy_code, value as class from jsonb_each_text(%L)) b
      cross join 
        (select unnest(%L::int[]) as current_week) c
      on conflict ON CONSTRAINT %s do nothing'
      ,i.plan_table
      ,v_kpi_str1
      ,v_kpi_str2
      ,v_created_by,v_created_at,null,null
      ,v_channel
      ,v_hierarchy_code_list
      ,v_week
      ,'pk_'||split_part(i.plan_table  ,'.',2) 
      ); 
      
      execute v_sql;
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT ;     
      
      if v_business_unit = 'Wholesale' and v_plan_status in (2,3)
      then
        v_sql_plan_mod := format('
         insert into %s(%s,created_by,created_at,updated_by,updated_at)
         select 
         %s,%L,%L,%L,%L
        from
          (select %L as channel) a
        cross join
          (select key::int as hierarchy_code, value as class from jsonb_each_text(%L)) b
        cross join 
          (select unnest(%L::int[]) as current_week) c
        on conflict ON CONSTRAINT %s do nothing'
        ,'plan_smart.plan_modifications_'||p_plan_code::text
        ,'plan_code,'||v_kpi_str1||',edits_from'
        ,p_plan_code::text
         ||','
         ||v_kpi_str2
         ||','
         ||case 
	         when v_plan_status = 2 then '''SP'''
	         when v_plan_status = 3 then '''SF'''
	       end
	      ,v_created_by,v_created_at,null,null
        ,v_channel 
        ,v_hierarchy_code_list
        ,v_week
        ,'plan_modifications_'||p_plan_code::text||'_pkey'
        ); 
        raise notice 'v_sql:%', v_sql;
        raise notice 'v_sql_plan_mod:%', v_sql_plan_mod;
        execute v_sql;
        GET DIAGNOSTICS v_affected_rows = ROW_COUNT ;
        execute v_sql_plan_mod;
      end if; 
    end loop;
    insert into plan_smart.plan_master_audit
        (plan_code
        ,action_code
        ,user_code
        ,plan_actioned_ts
        ,"comment"
        )
    values
        (p_plan_code
        ,'create_plan'
        ,v_created_by
        ,v_created_at
        ,v_sql
        );  
   return v_affected_rows;
end;
$function$
;
