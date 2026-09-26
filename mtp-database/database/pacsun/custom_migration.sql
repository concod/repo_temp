--liquibase formatted sql
--     
--      #######  ##    ## ##       ##    ##          ###    ########  ########  ######## ##    ## ########   ######  
--     ##     ## ###   ## ##        ##  ##          ## ##   ##     ## ##     ## ##       ###   ## ##     ## ##    ## 
--     ##     ## ####  ## ##         ####          ##   ##  ##     ## ##     ## ##       ####  ## ##     ## ##       
--     ##     ## ## ## ## ##          ##          ##     ## ########  ########  ######   ## ## ## ##     ##  ######  
--     ##     ## ##  #### ##          ##          ######### ##        ##        ##       ##  #### ##     ##       ## 
--     ##     ## ##   ### ##          ##          ##     ## ##        ##        ##       ##   ### ##     ## ##    ## 
--      #######  ##    ## ########    ##          ##     ## ##        ##        ######## ##    ## ########   ######  
--                                                                                     
--     ##    ##  #######        ########  ########  ##        ######                                                 
--     ###   ## ##     ##       ##     ## ##     ## ##       ##    ##                                                
--     ####  ## ##     ##       ##     ## ##     ## ##       ##                                                      
--     ## ## ## ##     ##       ##     ## ##     ## ##        ######                                                 
--     ##  #### ##     ##       ##     ## ##     ## ##             ##                                                
--     ##   ### ##     ##       ##     ## ##     ## ##       ##    ##                                                
--     ##    ##  #######        ########  ########  ########  ######                                                 
--  

--changeset ashish@impactanalytics.co:reset_custom_migration stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: initial changeset for custom_migration
DELETE FROM liquibase.databasechangelog where filename like '%custom_migration.sql%';

--changeset linu.nazil:constraint_multi_store_att_updates stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: constraint_multi_store_att_updates
update inventory_smart.rcl_constraint_master_rule set store_hierarchy_level = 'psa_name' where true;

--changeset sreevathsa.sp:truncating_tables_for_historic stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: truncating tables for historic run
TRUNCATE TABLE inventory_smart.dc_transit_time_mapping CASCADE;
TRUNCATE TABLE global.product_mapping_product_dc CASCADE;
TRUNCATE TABLE global.product_mapping_store_dc CASCADE;
TRUNCATE TABLE global.product_time_attributes CASCADE;
TRUNCATE TABLE global.store_time_attributes CASCADE;
TRUNCATE TABLE global.rcl_product_mapping_product_store CASCADE;
TRUNCATE TABLE global.rcl_product_mapping_product_store_rule CASCADE;

--changeset abijthsarath.menon:truncating asn tables stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: truncating asn tables
TRUNCATE TABLE inventory_smart.latest_asn_delta CASCADE;
TRUNCATE TABLE inventory_smart.intermediate_cyclic_asn CASCADE;

--changeset sreevathsa.sp:truncating store-dc tables stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: truncating store-dc tables
TRUNCATE TABLE global.product_mapping_store_dc CASCADE;

--changeset abijthsarath.menon:changing rule names stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: changing rule names
UPDATE inventory_smart.rcl_constraint_master_rule
SET rule_name = 'Default'
WHERE rcl_code = 3;

--changeset bhaskar.reddy:truncating store_time_attributes tables stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: truncating store_time_attributes
TRUNCATE TABLE global.store_time_attributes CASCADE;

--changeset abijthsarath.menon:sample DC auto allocation stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: sample DC auto allocation
INSERT INTO inventory_smart.auto_allocation_input (
    division,
    department,
    sub_department,
    "class",
    style,
    article,
    auto_approve_flag,
    int_div,
    user_code,
    total_style_count,
    style_count_per_row,
    article_list,
    row_num,
    allocation_code,
    auto_approve_no,
    asn_id,
    allocation_type,
    auto_release,
    allocation_status,
    updated_at,
    mapped_stores,
    store_groups
)
VALUES (
    'MENS',
    'M BOTTOMS',
    'M CASUAL PANTS',
    '0133_M BASIC CASUAL PANTS',
    NULL,
    NULL,
    FALSE,
    '0',
    1008,
    1,
    1,
    ARRAY['0133-48426-0023-001']::varchar[],
    58,
    '6_1008_MENS_20251109T191521963136230',
    0,
    NULL,
    'DC',
    TRUE,
    'completed',
    '2025-11-10 00:50:39.266+05:30'::timestamptz,
    '{}'::jsonb,
    '{}'::jsonb
);

--changeset abijthsarath.menon:sample_DC_auto_allocation_v2 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: sample_DC_auto_allocation_v2
INSERT INTO inventory_smart.auto_allocation_input (
    division,
    department,
    sub_department,
    "class",
    style,
    article,
    auto_approve_flag,
    int_div,
    user_code,
    total_style_count,
    style_count_per_row,
    article_list,
    row_num,
    allocation_code,
    auto_approve_no,
    asn_id,
    allocation_type,
    auto_release,
    allocation_status,
    updated_at,
    mapped_stores,
    store_groups
)
VALUES (
    'MENS',
    'M BOTTOMS',
    'M CASUAL PANTS',
    '0133_M BASIC CASUAL PANTS',
    NULL,
    NULL,
    FALSE,
    '0',
    1008,
    1,
    1,
    ARRAY['0133-48426-0023-001']::varchar[],
    58,
    '6_1008_MENS_20251109T191521963136230',
    0,
    NULL,
    'DC',
    FALSE,
    ' ',
    '2025-11-10 00:50:39.266+05:30'::timestamptz,
    '{}'::jsonb,
    '{}'::jsonb
);

--changeset abijthsarath.menon:sample_DC_auto_allocation_v3 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: sample_DC_auto_allocation_v3
INSERT INTO inventory_smart.auto_allocation_input (
    division,
    department,
    sub_department,
    "class",
    style,
    article,
    auto_approve_flag,
    int_div,
    user_code,
    total_style_count,
    style_count_per_row,
    article_list,
    row_num,
    allocation_code,
    auto_approve_no,
    asn_id,
    allocation_type,
    auto_release,
    allocation_status,
    updated_at,
    mapped_stores,
    store_groups
)
VALUES
(
    'MENS',
    'M BOTTOMS',
    'M CASUAL PANTS',
    '0133_M BASIC CASUAL PANTS',
    NULL,
    NULL,
    FALSE,
    '0',
    1008,
    1,
    1,
    ARRAY['0133-48426-0023-001']::varchar[],
    59,
    '6_1008_MENS_20251109T191521963136742',
    0,
    NULL,
    'DC',
    FALSE,
    ' ',
    '2025-11-12 00:50:39.266+05:30'::timestamptz,
    '{}'::jsonb,
    '{}'::jsonb
),
(
    'MENS',
    'M BOTTOMS',
    'M CASUAL PANTS',
    '0133_M BASIC CASUAL PANTS',
    NULL,
    NULL,
    FALSE,
    '0',
    1008,
    1,
    1,
    ARRAY['0133-48426-0016-001']::varchar[],
    58,
    '6_1008_MENS_20251109T191521963136742',
    0,
    NULL,
    'DC',
    FALSE,
    ' ',
    '2025-11-12 00:50:39.266+05:30'::timestamptz,
    '{}'::jsonb,
    '{}'::jsonb
);

--changeset chandrashekar.s@impactanalytics.co:deleting entry in user_preference_table_config stripComments:false splitStatements:false context:Release_1 labels:deleting entry in user_preference_table_config 
--comment: deleting entry in user_preference_table_config
DELETE FROM global.user_preference_table_config WHERE tc_code = 500;

--changeset abijthsarath.menon:DC_auto_allocation_v4 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: DC_auto_allocation_v4
INSERT INTO inventory_smart.auto_allocation_input (
    division,
    department,
    sub_department,
    "class",
    style,
    article,
    auto_approve_flag,
    int_div,
    user_code,
    total_style_count,
    style_count_per_row,
    article_list,
    row_num,
    allocation_code,
    auto_approve_no,
    asn_id,
    allocation_type,
    auto_release,
    allocation_status,
    updated_at,
    mapped_stores,
    store_groups
)
VALUES
(
    'MENS',
    'M BOTTOMS',
    'M CASUAL PANTS',
    '0133_M BASIC CASUAL PANTS',
    NULL,
    NULL,
    FALSE,
    '0',
    1008,
    1,
    1,
    ARRAY['0133-48426-0023-001']::varchar[],
    59,
    '6_1008_MENS_20251109T191521963136742',
    0,
    NULL,
    'DC',
    FALSE,
    ' ',
    '2025-11-13 00:50:39.266+05:30'::timestamptz,
    '{}'::jsonb,
    '{}'::jsonb
),
(
    'MENS',
    'M BOTTOMS',
    'M CASUAL PANTS',
    '0133_M BASIC CASUAL PANTS',
    NULL,
    NULL,
    FALSE,
    '0',
    1008,
    1,
    1,
    ARRAY['0133-48426-0016-001']::varchar[],
    58,
    '6_1008_MENS_20251109T191521963136742',
    0,
    NULL,
    'DC',
    FALSE,
    ' ',
    '2025-11-13 00:50:39.266+05:30'::timestamptz,
    '{}'::jsonb,
    '{}'::jsonb
);

--changeset abijthsarath.menon:DC_auto_allocation_v5 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: DC_auto_allocation_v5
UPDATE inventory_smart.auto_allocation_input
SET allocation_code = '6_1008_MENS_20251113T191521963136840'
where allocation_code = '6_1008_MENS_20251113T191521963136840'

--changeset abijthsarath.menon:DC_auto_allocation_v6 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: DC_auto_allocation_v6
UPDATE inventory_smart.auto_allocation_input
SET allocation_code = '6_1008_MENS_20251113T191521963136840'
where allocation_code = '6_1008_MENS_20251109T191521963136742'

--changeset parmanand.mishra@impactanalytics.co:Distribution_centres_v3 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Distribution_centres_v3_markinhg_4901_false_for_is_deleted_flag
UPDATE global.distribution_centres
SET is_deleted = FALSE 
where dc_code = 2 ;

--changeset tarun.tyagi:update_rule_expression_auto_allocation stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Update rule_expression column for auto-allocation rule_type with prefix notation (Polish notation) using AND operator
UPDATE inventory_smart.dc_store_policy_user_rule
SET rule_expression = (
    SELECT
        -- Build prefix expression array: (N-1 "AND" operators) + (N keys)
        ARRAY(
            -- Generate N-1 "AND" operators where N is the number of keys
            SELECT 'AND'
            FROM generate_series(1, GREATEST(array_length(filtered_keys, 1) - 1, 0))
        ) || filtered_keys
    FROM (
        -- Extract keys from values JSONB, excluding auto_approve and auto_release_required
        SELECT ARRAY(
            SELECT key
            FROM jsonb_object_keys(dc_store_policy_user_rule.values) AS key
            WHERE key NOT IN ('auto_approve', 'auto_release_required')
            ORDER BY key  -- Maintain consistent ordering
        ) AS filtered_keys
    ) AS subquery
)
WHERE rule_type = 'auto-allocation'
  AND rule_expression IS NULL;

--changeset bhaskar.reddy@impactanalytics.co:auto_allocations_v4 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment:auto_allocations_v4
UPDATE inventory_smart.asn_to_allocate_alert
SET handling_type = 'ECOMM'
WHERE l3_id_name = '0740_W SWEATERS';


--changeset bhaskar.reddy@impactanalytics.co:plansmart_v4 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment:plansmart_v4
UPDATE inventory_smart.plan_master
SET is_deleted = TRUE
where cast(created_at as date) = '2026-01-27' 
and name like '%auto%';

--changeset bhaskar.reddy@impactanalytics.co:Distribution_centres_v4 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Distribution_centres_v4_markinhg_4905_false_for_is_active
UPDATE global.distribution_centres
SET is_active = FALSE
where dc_code = 1 ;

--changeset bhaskar.reddy@impactanalytics.co:auto_allocations_v5 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment:auto_allocations_v5
UPDATE inventory_smart.asn_to_allocate_alert
SET handling_type = 'ECOMM'
WHERE l3_id_name in ('0131_M BASIC DENIM', '0140_M ACTIVE TOPS');

--changeset parmanand.mishra@impactanalytics.co:Distribution_centres_v5 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Distribution_centres_v5_markinhg_4905_false_for_is_active
UPDATE global.distribution_centres
SET is_active = FALSE
where dc_code = 1 ;

--changeset parmanand.mishra@impactanalytics.co:Distribution_centres_v6 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Distribution_centres_v6_markinhg_4905_false_for_is_active
UPDATE global.distribution_centres
SET is_active = FALSE
where dc_code = 1 ;

--changeset parmanand.mishra@impactanalytics.co:Distribution_centres_v7_1 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Distribution_centres_v7_1_markinhg_4905_false_for_is_active
UPDATE global.distribution_centres
SET is_active = FALSE
where dc_code = 1 ;

--changeset parmanand.mishra@impactanalytics.co:Store_time_attributes_v2 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Store_time_attributes_v2_marking_updated_fields_null_for_store_1
UPDATE global.store_time_attributes 
SET 
    updated_by = NULL,
    updated_at = NULL
WHERE store_code = '4905' ;

--changeset bhaskar.reddy:store_attributes_filter_dc_name_null_v2 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Store_attributes_filter_dc_name_null_v2
UPDATE global.store_attributes_filter
SET 
dc_name=NULL
WHERE store_code = '4905' ;


--changeset bhaskar.reddy:store_attributes_removing_4905 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment:store_attributes_removing_4905
DELETE from global.store_attributes  WHERE store_code = '4905' AND attribute_name ='dc_name' ;

--changeset bhaskar.reddy:Distribution_centres_v7 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Distribution_centres_v7_deleteing_dc_4905
DELETE FROM global.distribution_centres
WHERE dc_code = 1;

--changeset bhaskar.reey@impactanalytics.co:ingestion_timing_change context:Release_1 labels:Custom_Migration_Technique
--comment: Update ingestion timing for sourcing configuration ingestion pipeline test

UPDATE data_platform.data_ingestion_config
SET attribute_value='59 20 * * MON-SAT; 59 23 * * SUN'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_cutoff_time'
AND "module"='trigger_sourcing_configuration';

UPDATE data_platform.data_ingestion_config
SET attribute_value='05 18 * * MON-SAT; 05 22 * * SUN'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_warning_time'
AND "module"='trigger_sourcing_configuration';

--changeset parmanand.mishra@impactanalytics.co:ingestion_timing_change_v0 context:Release_1 labels:Custom_Migration_Technique
--comment: Update ingestion timing for sourcing configuration ingestion pipeline

UPDATE data_platform.data_ingestion_config
SET attribute_value= '30 18 * * WED-SAT; 30 19 * * TUE'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_cutoff_time'
AND "module"='trigger_sourcing_configuration';

UPDATE data_platform.data_ingestion_config
SET attribute_value= '05 18 * * WED-SAT;05 19 * * TUE'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_warning_time'
AND "module"='trigger_sourcing_configuration';

--changeset parmanand.mishra@impactanalytics.co:ingestion_timing_change_v_1 context:Release_1 labels:Custom_Migration_Technique
--comment: Update ingestion timing for sourcing configuration ingestion pipeline

UPDATE data_platform.data_ingestion_config
SET attribute_value= '30 18 * * WED-SAT;30 19 * * TUE'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_cutoff_time'
AND "module"='trigger_sourcing_configuration';

--changeset parmanand.mishra@impactanalytics.co:ingestion_timing_change_v_2 context:Release_1 labels:Custom_Migration_Technique
--comment: Update ingestion timing for sourcing configuration ingestion pipeline

UPDATE data_platform.data_ingestion_config
SET attribute_value= '59 20 * * THU-SAT;59 23 * * WED'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_cutoff_time'
AND "module"='trigger_sourcing_configuration';

UPDATE data_platform.data_ingestion_config
SET attribute_value= '05 18 * * THU-SAT;05 22 * * WED'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_warning_time'
AND "module"='trigger_sourcing_configuration';


--changeset parmanand.mishra@impactanalytics.co:ingestion_timing_change_v_3 context:Release_1 labels:Custom_Migration_Technique
--comment: Update ingestion timing for sourcing configuration ingestion pipeline

UPDATE data_platform.data_ingestion_config
SET attribute_value= '59 20 * * MON-SAT;59 23 * * SUN'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_cutoff_time'
AND "module"='trigger_sourcing_configuration';

UPDATE data_platform.data_ingestion_config
SET attribute_value= '05 18 * * MON-SAT;05 22 * * SUN'
WHERE is_deleted=false
AND is_latest=true
AND attribute_name='trigger_warning_time'
AND "module"='trigger_sourcing_configuration';