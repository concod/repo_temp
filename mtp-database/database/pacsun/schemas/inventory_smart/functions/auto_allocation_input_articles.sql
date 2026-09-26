--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:auto_allocation_input_articles_func_up_v3 runOnChange:true stripComments:false splitStatements:false context:MTP-69074 commit labels:MTP-69074
--comment: MTP-69074-auto_allocation_input_articles_v2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles()
RETURNS TABLE( 
    division varchar,
    department varchar,
    sub_department varchar,
    "class" varchar,
    auto_approve_flag bool,
    int_div varchar,
    user_code int4,
    total_style_count int4,
    style_count_per_row int4,
    article_list _varchar,
    row_num int4,
    allocation_code varchar,
    asn_id varchar,
    allocation_type varchar,
    auto_release bool,
    mapped_stores jsonb,
    store_groups jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$ 
BEGIN
RETURN QUERY EXECUTE 
$$ 
SELECT DISTINCT division, department, sub_department, "class", 
    auto_approve_flag, int_div, user_code, total_style_count, style_count_per_row, 
    article_list, row_num, allocation_code,asn_id,allocation_type,auto_release,mapped_stores,store_groups
FROM (
    SELECT division, department, sub_department, "class", auto_approve_flag, 
    int_div, user_code, total_style_count, style_count_per_row, article_list, 
    row_num, allocation_code, auto_approve_no, unnest(article_list) AS article,asn_id,allocation_type,auto_release,mapped_stores,store_groups
    FROM inventory_smart.auto_allocation_input
) a
WHERE article NOT IN (
    SELECT DISTINCT article 
    FROM inventory_smart.create_allocation_result_flat_gurobi carfg
    WHERE 
    carfg.created_at >= (date((now() at TIME zone 'America/New_York'::text))::timestamp without time zone at TIME zone 'America/New_York'::text)
    and carfg.created_at <= ((date((now() at TIME zone 'America/New_York'::text))::timestamp without time zone at TIME zone 'America/New_York'::text) + '23:59:59'::interval)
)
AND allocation_code NOT IN (
    SELECT plan_code 
    FROM inventory_smart.plan_master pm
    WHERE type = 2   
    AND (created_at AT TIME ZONE 'America/New_York')::date = (now() AT TIME ZONE 'America/New_York')::date
    AND NOT is_deleted
)
$$; 
END;
$function$;