--liquibase formatted sql
--changeset aniruddh.singh:create_agent_allocation_input_articles_overload_int runOnChange:true stripComments:false splitStatements:false context:agent_allocation_input labels:agents
--comment: overload to accept integer user_id and cast to varchar
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.agent_allocation_input_articles(varchar[], varchar, integer);

CREATE OR REPLACE FUNCTION inventory_smart.agent_allocation_input_articles(
    article_list varchar[],
    source varchar,
    user_id integer
)
RETURNS TABLE(
    type                  varchar,
    channel               varchar,
    l0_name               varchar,
    l1_name               varchar,
    l2_name               varchar,
    auto_approve_flag     boolean,
    int_div               int,
    user_code             varchar,
    auto_approve_no       int,
    total_article_count   int,
    article_count_per_row int,
    article_list          varchar,
    row_num               int
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
    SELECT DISTINCT
        $2::varchar AS type,
        ph.channel::varchar,
        ph.l0_name::varchar,
        ph.l1_name::varchar,
        ph.l2_name::varchar,
        false AS auto_approve_flag,
        1 AS int_div,
        ($3::varchar) AS user_code,
        0 AS auto_approve_no,
        1 AS total_article_count,
        1 AS article_count_per_row,
        ph.article::varchar AS article_list,
        1 AS row_num
    FROM inventory_smart.ph_master ph
    join inventory_smart.article_inventory_dashboard aid on ph.article = aid.article
    LEFT JOIN inventory_smart.asn_master am
        ON ph.article = am.article
       AND lower($2) = 'asn'
    WHERE ph.article = ANY($1);
$function$;