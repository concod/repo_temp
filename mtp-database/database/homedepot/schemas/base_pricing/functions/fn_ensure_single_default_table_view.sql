--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:fn_ensure_single_default_table_view_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_ensure_single_default_table_view_v1

DROP FUNCTION IF EXISTS base_pricing.fn_ensure_single_default_table_view(integer, character varying, bigint);

CREATE OR REPLACE FUNCTION base_pricing.fn_ensure_single_default_table_view(p_user_id integer, p_table_name character varying, p_table_view_id bigint DEFAULT NULL::bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
    BEGIN
        -- If there's an existing default view for this user_id and table_name
        -- (excluding the current table_view_id if provided)
        UPDATE base_pricing.bp_table_views
        SET is_default = false,
            updated_by = p_user_id,  -- Assuming the user making the change is the same
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id
        AND table_name = p_table_name
        AND (p_table_view_id IS NULL OR table_view_id <> p_table_view_id)
        AND is_default = true;
    END;
    $function$
;
