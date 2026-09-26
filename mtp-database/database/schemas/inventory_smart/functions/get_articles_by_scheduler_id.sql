--liquibase formatted sql
--changeset liquibase:get_articles_by_scheduler_id_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-87268 labels:MTP-87268
--comment: Updated get_articles_by_scheduler_id to use OUT parameter and return aggregated JSONB for .callproc() compatibility

--rollback: SELECT 1


DROP FUNCTION IF EXISTS inventory_smart.get_articles_by_scheduler_id(INT, OUT result JSONB);

CREATE OR REPLACE FUNCTION inventory_smart.get_articles_by_scheduler_id(
    sched_id INT,
    OUT result JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    rcl_code_value INT;
    rule_code_value INT;
    rcl_dimension_value JSONB;
    condition TEXT;
    partial_result JSONB;
BEGIN
    result := '[]'::JSONB;

    FOR rcl_code_value, rule_code_value IN
        SELECT rcl_code, rule_code
        FROM inventory_smart.rcl_dc_store_policy
        WHERE auto_allocation_schedular = sched_id AND is_deleted IS FALSE
    LOOP
        FOR rcl_dimension_value IN
            SELECT rcl_dimension
            FROM inventory_smart.rcl_dc_store_policy_rule
            WHERE rcl_code = rcl_code_value AND rule_code = rule_code_value
        LOOP
            condition := (
                SELECT string_agg(format('%I = %L', key, value), ' AND ')
                FROM jsonb_each_text(rcl_dimension_value)
            );

            IF condition IS NOT NULL THEN
                EXECUTE format(
                    'SELECT jsonb_agg(article) FROM (SELECT DISTINCT article FROM global.product_attributes_filter t WHERE %s) t',
                    condition
                )
                INTO partial_result;

                IF partial_result IS NOT NULL THEN
                    result := result || partial_result;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;