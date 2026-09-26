--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:if_plan_got_data_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-40173
--comment:  fwos edge case 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.if_plan_got_data(p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.if_plan_got_data(p_plan_code integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  v_channel        text[];
  v_fiscal_year_prior_weeks int[];
  v_classes        text;
  v_weeks          int[];
  v_plan_status    int4;
  v_level_id       int4;
  v_table_name     text;
  v_query_source   text;
  v_query_combine  text := '';
  v_return         boolean:= false;
begin
  select
    channels,
    l3_name,
    weeks,
    status
  into
    v_channel,
    v_classes,
    v_weeks,
    v_plan_status
  from
    plan_smart.vw_plan_master 
  where
    plan_code = p_plan_code;



  select
    '{' || array_to_string(array_agg(DISTINCT fiscal_year_prior_weeks), ',') || '}' as fiscal_year_weeks
  into 
   v_fiscal_year_prior_weeks
  from 
    plan_smart.dim_time_with_prior_weeks
  where  
    fiscal_year_prior in (
                        SELECT fiscal_year_prior
                        FROM plan_smart.dim_time
                        WHERE fiscal_year_week = any(v_weeks)
                );


  v_weeks := v_weeks || v_fiscal_year_prior_weeks;
                
  raise notice 'v_weeks: %', v_weeks;
   
  select
    plan_table_text,
    product_hierarchy_filter_level_id
  into
    v_table_name,
    v_level_id
  from
    plan_smart.get_query_source(1,v_plan_status);
  
  if v_plan_status is not null
  then
    v_query_combine := format('
    SELECT
      CASE
        WHEN
          EXISTS (
            SELECT
              1
            FROM
              %s
            WHERE
              channel = ANY(%L)
            AND
              current_week = ANY(%L::int4[])
            AND
              class = ANY(%L::text[])
          )
        THEN
          TRUE
        ELSE
          FALSE
      END;
    ',
    v_table_name,
    v_channel,
    v_weeks,
    v_classes
    );
    raise notice '%', v_query_combine;
    execute v_query_combine into v_return;
  end if;
  return v_return;
END
$function$
;

