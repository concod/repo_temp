--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-79116_adding_sp runOnChange:true stripComments:false splitStatements:false context:MTP-79116_adding_sp labels:liquibase_project_start
--comment: MTP-79116_adding_sp
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.bulk_update_space_constraints_ct(jsonb);

CREATE OR REPLACE FUNCTION space_smart.bulk_update_space_constraints_ct(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

BEGIN
    -- Insert or update records in the space_smart.space_constraints table
    INSERT INTO space_smart.space_constraints (
        store_code, l3_name, l0_name, l5_name, l4_name,
        sellable_sqft_min_per, sellable_sqft_max_per, sq_ft_control, sq_ft_fixed, season_code
    )
    SELECT
        record->>'store_code' AS store_code,
        record->>'l3_name' AS l3_name,
        record->>'l0_name' AS l0_name,
        record->>'l5_name' AS l5_name,
        record->>'l4_name' AS l4_name,
		(COALESCE(NULLIF(record->>'sellable_sqft_min_per', '')::FLOAT, NULL)) AS sellable_sqft_min_per,
		(COALESCE(NULLIF(record->>'sellable_sqft_max_per', '')::FLOAT, NULL)) AS sellable_sqft_max_per,
        record->>'sq_ft_control' AS sq_ft_control,
        record->>'sq_ft_fixed' AS sq_ft_fixed,
        (record->>'season_code')::INT AS season_code
    FROM jsonb_array_elements(json_data) AS record
    ON CONFLICT (store_code, l3_name, l0_name, l5_name, l4_name, season_code)
    DO UPDATE SET
        sellable_sqft_min_per = EXCLUDED.sellable_sqft_min_per,
        sellable_sqft_max_per = EXCLUDED.sellable_sqft_max_per;

    -- Optional: Print a notice indicating the function completion
--    RAISE NOTICE 'Bulk update operation completed.';
END;
$function$
;
