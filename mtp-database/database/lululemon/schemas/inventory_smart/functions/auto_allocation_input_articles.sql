--liquibase formatted sql
--changeset aniket.nichat@impactanalytics.co:auto_allocation_input_articles runOnChange:true stripComments:false splitStatements:false context:MTP-69074 commit labels:MTP-69074
--comment: auto_allocation_input_articles
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();

CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles()
RETURNS TABLE( 
    channel varchar,
    l0_name varchar,
    l1_name varchar,
    l2_name varchar,
    auto_approve_flag bool,
    int_div varchar,
    user_code int4,
    auto_approve_no int4,
    article_list _varchar,
    row_num int4,
    allocation_code varchar,
    allocation_status varchar,
    updated_at timestamp,
    total_style_count int4,
    style_count_per_row int4
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$ 
BEGIN
RETURN QUERY EXECUTE 
$$
SELECT DISTINCT 
    channel,
    l0_name,
    l1_name,
    l2_name,
    auto_approve_flag,
    int_div,
    user_code,
    auto_approve_no,
    article_list,
    row_num,
    allocation_code,
    allocation_status,
    updated_at,
    total_style_count,
    style_count_per_row
FROM (
    SELECT     
        channel,
        l0_name,
        l1_name,
        l2_name,
        auto_approve_flag,
        int_div,
        user_code,
        auto_approve_no,
        unnest(article_list) article,
        row_num,
        allocation_code,
        allocation_status,
        updated_at,
        total_style_count,
        style_count_per_row    
    FROM inventory_smart.auto_allocation_input
) a
WHERE article NOT IN (
    SELECT DISTINCT article 
    FROM inventory_smart.create_allocation_result_flat_gurobi carfg
    WHERE 
        carfg.created_at >= (
            DATE((NOW() AT TIME ZONE 'America/New_York'))::timestamp 
            AT TIME ZONE 'America/New_York'
        )
        AND carfg.created_at <= (
            DATE((NOW() AT TIME ZONE 'America/New_York'))::timestamp 
            AT TIME ZONE 'America/New_York' + INTERVAL '23:59:59'
        )
)
AND allocation_code NOT IN (
    SELECT plan_code 
    FROM inventory_smart.plan_master pm
    WHERE 
        type = 2   
        AND (created_at AT TIME ZONE 'America/New_York')::date = 
            (NOW() AT TIME ZONE 'America/New_York')::date
        AND NOT is_deleted
);
$$;
END;
$function$;
