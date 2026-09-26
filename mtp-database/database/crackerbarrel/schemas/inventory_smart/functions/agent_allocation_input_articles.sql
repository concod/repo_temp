--liquibase formatted sql
--changeset aniruddh.singh:create_agent_allocation_input_articles_v1.2 runOnChange:true stripComments:false splitStatements:false context:create_agent_allocation_input_articles_v1.2 labels:create_agent_allocation_input_articles_v1.2
--comment: Add change allocation table to aid params
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.agent_allocation_input_articles(varchar[]);

DROP FUNCTION IF EXISTS inventory_smart.agent_allocation_input_articles(varchar[], varchar, int);

CREATE OR REPLACE FUNCTION inventory_smart.agent_allocation_input_articles(article_list varchar[], source varchar, user_id int)
RETURNS TABLE(
    "type" varchar,
    buyer varchar,
    primary_trait varchar,
    style_list varchar,
    auto_approve_flag bool
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    po_join TEXT := '';
    type_label TEXT := source;
    sql TEXT;
BEGIN
    IF lower(source) = 'po' THEN
        po_join := ' INNER JOIN inventory_smart.po_master po ON ph.article = po.article';
    END IF;

    sql := '
        SELECT DISTINCT
            $1::varchar AS type,
            ph.l2_name::varchar AS buyer,
            ph.primary_trait_desc::varchar AS primary_trait,
            ph.article::varchar AS style_list,
            false AS auto_approve_flag
        FROM inventory_smart.ph_master ph
        INNER JOIN inventory_smart.article_inventory_dashboard aid
            ON ph.article = aid.article' || po_join || '
        WHERE ph.article = ANY($2)';

    RETURN QUERY EXECUTE sql USING type_label, article_list;
END
$function$;