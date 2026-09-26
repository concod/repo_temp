--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:create_promo_store_partition_table_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for create_promo_store_partition_table


DROP FUNCTION IF EXISTS price_promo.fn_create_promo_store_partition_table;
CREATE OR REPLACE FUNCTION price_promo.fn_create_promo_store_partition_table(p_promo_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _partition_name TEXT;
    _index_name TEXT;
    _index_exists BOOLEAN;
BEGIN
    _partition_name := 'promo_store_' || p_promo_id;
    _index_name := _partition_name || '_promo_id_idx';
    
    -- Create a new partition if it doesn't already exist
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS price_promo.%I 
        PARTITION OF price_promo.promo_store
        FOR VALUES IN (%L)', _partition_name, p_promo_id);
    
    -- Create the index if it doesn't exist
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON price_promo.%I (promo_id)', _index_name, _partition_name);

END;
$function$
;
