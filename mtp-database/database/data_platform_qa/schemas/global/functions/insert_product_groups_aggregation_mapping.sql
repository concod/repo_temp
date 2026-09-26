--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:MTP-57165 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-57165
--comment: insert SP for product_groups_aggregation_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.insert_product_groups_aggregation_mapping();
CREATE OR REPLACE FUNCTION global.insert_product_groups_aggregation_mapping()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    insert_delete_query text;
BEGIN
    insert_delete_query := $$
        WITH deleted AS (
            DELETE FROM "global".product_groups_aggregation_mapping
            WHERE pg_code NOT IN (SELECT pg_code FROM "global".product_groups_mapping)
            RETURNING *
        )
        INSERT INTO "global".product_groups_aggregation_mapping (pg_code, aggregation_code, ref_pg_code, avg_st_perc, rev_con_perc)
        SELECT pg.pg_code, paf.article AS aggregation_code, pg.ref_pg_code, pg.avg_st_perc, pg.rev_con_perc
        FROM "global".product_groups_mapping pg
        JOIN "global".product_attributes_filter paf ON pg.product_code = paf.product_code
        WHERE paf.article IS NOT NULL
        ON CONFLICT (pg_code, aggregation_code) DO NOTHING;
    $$;
    EXECUTE insert_delete_query;
    RAISE NOTICE 'Insert and Delete Query Executed: %', insert_delete_query;
END;
$function$
;