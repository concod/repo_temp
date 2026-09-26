--liquibase formatted sql
--changeset shekharkrishna.nirnakar@impactanalytics.co:query_run_error_fix runOnChange:true stripComments:false splitStatements:false context:auto_allocation_input_articles labels:retrigger_aa_input_articles
--comment: auto_allocation_input_articles_allocs_not_in_pm
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();
DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles(int4);
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles(batch_id int4 DEFAULT 1)
RETURNS TABLE(
    "type" varchar,
    channel varchar,
    l0_name varchar,
    l1_name varchar,
    l2_name varchar,
    auto_approve_flag bool,
    int_div int4,
    user_code varchar,
    auto_approve_no int4,
    total_article_count int4,
    article_count_per_row int4,
    article_list _varchar,
    row_num int4,
    allocation_code varchar,
    article_dc_mapping jsonb,
    mapped_stores jsonb,
    batch_number int4
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    _query text;
BEGIN
    _query := '
  	select distinct type, channel, l0_name, l1_name, l2_name, auto_approve_flag,
	int_div, user_code, auto_approve_no, total_article_count, article_count_per_row,
	article_list, row_num, allocation_code, article_dc_mapping, mapped_stores, batch_number
	from (
    SELECT *, unnest(article_list) article FROM inventory_smart.auto_allocation_input
    WHERE batch_number = ' || batch_id || ') a
    WHERE allocation_code not in (
     select distinct plan_code
     from inventory_smart.plan_master
     where (created_at AT TIME ZONE ''America/Los_Angeles'')::date = (now() AT TIME ZONE ''America/Los_Angeles'')::date
    )';
    RAISE NOTICE 'auto_allocation_input_articles: batch_id=%', batch_id;
    RAISE NOTICE 'auto_allocation_input_articles: query=%', _query;
    RETURN QUERY EXECUTE _query;
END
$function$;