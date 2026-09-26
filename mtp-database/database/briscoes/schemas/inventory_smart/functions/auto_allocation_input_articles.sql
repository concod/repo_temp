--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:auto_allocation_input_articles_func_up runOnChange:true stripComments:false splitStatements:false context:MTP-69074 commit labels:MTP-69074
--comment: MTP-69074-auto_allocation_input_articles
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();
DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles(int4);
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles(batch_id int4 DEFAULT 1)
RETURNS TABLE(
    sales_org_name varchar,
    category varchar,
    sub_category varchar,
    brand varchar,
    merchandise_category varchar,
    auto_approve_no int4,
    auto_approve_flag bool,
    int_div varchar,
    user_code int4,
    total_style_count int4,
    style_count_per_row int4,
    article_list _varchar,  -- Fixed: Changed _varchar to varchar[]
    row_num int4,
    allocation_code varchar,
    auto_release bool,
    allocation_type varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
RETURN QUERY EXECUTE
--$$
'
SELECT DISTINCT sales_org_name, category, sub_category, brand, merchandise_category, auto_approve_no,
    auto_approve_flag, int_div, user_code, total_style_count, style_count_per_row,
    article_list, row_num, allocation_code,auto_release,alloc_type as allocation_type
FROM (
    SELECT *, unnest(article_list) AS article  -- Fixed typo: `artile_list` -> `article_list`
    FROM inventory_smart.auto_allocation_input
    WHERE batch_number = ' || batch_id || '
) a
WHERE article NOT IN (
    SELECT DISTINCT article
    FROM inventory_smart.create_allocation_result_flat_gurobi carfg
    WHERE
    carfg.created_at >= (date((now() at TIME zone ''Pacific/Auckland''::text))::timestamp without time zone at TIME zone ''Pacific/Auckland''::text)
    and carfg.created_at <= ((date((now() at TIME zone ''Pacific/Auckland''::text))::timestamp without time zone at TIME zone ''Pacific/Auckland''::text) + ''23:59:59''::interval)
)
AND allocation_code NOT IN (
    SELECT plan_code
    FROM inventory_smart.plan_master pm
    WHERE type = 2
    AND (created_at AT TIME ZONE ''Pacific/Auckland'')::date = (now() AT TIME ZONE ''Pacific/Auckland'')::date
    AND NOT is_deleted
)
'
--$$
;
END;
$function$;