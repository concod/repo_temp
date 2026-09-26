--liquibase formatted sql
--changeset zainab.firdous@impactanalytics.co populate_allocation_rule_product_mapping_bulk stripComments:false splitStatements:false context:Release_1_1 runOnChange:true labels:liquibase_project_start
--comment: initial changeset for populate_allocation_rule_product_mapping_bulk

DROP FUNCTION IF EXISTS source_smart.populate_allocation_rule_product_mapping_bulk;

CREATE OR REPLACE FUNCTION source_smart.populate_allocation_rule_product_mapping_bulk(
    p_rule_ids INT[],
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- ========================
    -- ACTIVATE RULES → INSERT
    -- ========================
    IF p_is_active THEN
        INSERT INTO source_smart.allocation_rule_product_mapping (
            rule_id,
            rule_code,
            product_code,
            rcl_id,
            rcl_priority
        )
        WITH rule_data AS (
            SELECT
                r.rule_id,
                r.rule_code,
                r.rcl_id,
                r.category,
                r.season_id,
                r.sourcing_class_id,
                r.subcategory,
                r.calender,
                r.expected_toolset,
                r.product_team
            FROM source_smart.allocation_rule_ua r
            WHERE r.rule_id = ANY(p_rule_ids)
        ),
        rcl_data AS (
            SELECT
                rd.rule_id,
                p.priority
            FROM rule_data rd
            JOIN source_smart.allocation_rcl_ua p
                ON p.rcl_id = rd.rcl_id
        )
        SELECT
            rd.rule_id,
            rd.rule_code,
            paf.product_code,
            rd.rcl_id,
            rc.priority
        FROM rule_data rd
        JOIN source_smart.season_product_mapping_ua spm
            ON spm.season_id = rd.season_id
        JOIN "global".product_attributes_filter paf
            ON paf.product_code = spm.product_code
        JOIN rcl_data rc
            ON rc.rule_id = rd.rule_id
        WHERE
            (rd.category IS NULL OR paf.l0_name = rd.category)
        AND (rd.sourcing_class_id IS NULL OR paf.sourcing_class_id = rd.sourcing_class_id)
        AND (rd.subcategory IS NULL OR paf.subcategory = rd.subcategory)
        AND (rd.calender IS NULL OR paf.calendar = rd.calender)
        AND (rd.expected_toolset IS NULL OR paf.expected_toolset = rd.expected_toolset)
        AND (rd.product_team IS NULL OR paf.l2_name = rd.product_team)
        ON CONFLICT (rule_id, product_code) DO NOTHING;

    -- ========================
    -- DEACTIVATE RULES → DELETE
    -- ========================
    ELSE
        DELETE FROM source_smart.allocation_rule_product_mapping
        WHERE rule_id = ANY(p_rule_ids);
    END IF;
END;
$$;
