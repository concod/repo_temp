--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:create_promo_product_partition_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for create_promo_product_partition_table


-- DROP FUNCTION base_pricing.fn_create_promo_product_partition_table(int4);
Drop function if exists base_pricing.fn_create_promo_product_partition_table();

CREATE OR REPLACE FUNCTION base_pricing.fn_create_promo_product_partition_table(p_promo_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _partition_name TEXT;
    _inclusion_partition_name text;
    _index_name TEXT;
    _index_exists BOOLEAN;
BEGIN
	_partition_name := 'promo_product_' || p_promo_id;
    _inclusion_partition_name := 'included_products_' || p_promo_id;
    _index_name := _partition_name || '_promo_id_idx';
    
    -- Create a new partition if it doesn't already exist
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS base_pricing.%I 
        PARTITION OF base_pricing.promo_product 
        FOR VALUES IN (%L)', _partition_name, p_promo_id);
       
    
   	-- Added new partition for exclusion flow
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS base_pricing.%I 
        PARTITION OF base_pricing.included_products 
        FOR VALUES IN (%L)', _inclusion_partition_name, p_promo_id);
    
    
    -- Added `IF NOT EXISTS` clause in the index creation statements:
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I_promo_id_idx ON base_pricing.%I (promo_id)', _inclusion_partition_name, _inclusion_partition_name);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I (promo_id)', _index_name, _partition_name);

    
    
END;
$function$
;
