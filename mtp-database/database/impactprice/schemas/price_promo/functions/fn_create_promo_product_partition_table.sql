--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_create_promo_product_partition_table_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: exclusion tables added + security definer


Drop function if exists price_promo.fn_create_promo_product_partition_table;
CREATE OR REPLACE FUNCTION price_promo.fn_create_promo_product_partition_table(p_promo_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _partition_name TEXT;
    _inclusion_partition_name text;
    _exclusion_partition_name text;
	_ps_scenario_discounts_partition_name text;
    _index_name TEXT;
    _index_exists BOOLEAN;
	query text;
BEGIN
	_partition_name := 'promo_product_' || p_promo_id;
    _inclusion_partition_name := 'included_products_' || p_promo_id;
	_exclusion_partition_name := 'excluded_products_' || p_promo_id;
	_ps_scenario_discounts_partition_name := 'ps_scenario_discounts_' || p_promo_id;
    _index_name := _partition_name || '_promo_id_idx';

    -- Create a new partition if it doesn't already exist
	query =  format('
        CREATE TABLE IF NOT EXISTS price_promo.%I
        PARTITION OF price_promo.promo_product
        FOR VALUES IN (%L)', _partition_name, p_promo_id);
    EXECUTE query;
	
	

   	-- Added new partition for inclusion-exclusion flow
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS price_promo.%I
        PARTITION OF price_promo.included_products
        FOR VALUES IN (%L)', _inclusion_partition_name, p_promo_id);
	
    execute format('CREATE INDEX if not exists %1$s_promo_id_idx ON price_promo.%1$s (promo_id)', _inclusion_partition_name);
	
	EXECUTE format('
        CREATE TABLE IF NOT EXISTS price_promo.%I
        PARTITION OF price_promo.ps_scenario_discounts
        FOR VALUES IN (%L)', _ps_scenario_discounts_partition_name, p_promo_id);
	
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS price_promo.%I
        PARTITION OF price_promo.excluded_products
        FOR VALUES IN (%L)', _exclusion_partition_name, p_promo_id);
	
     execute format('CREATE INDEX if not exists %1$s_product_cid_idx ON price_promo.%1$s (product_cid)', _exclusion_partition_name);
	
    -- Check if the index already exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = _index_name
        AND n.nspname = 'price_promo'
    ) INTO _index_exists;
	
    -- Create the index if it doesn't exist
    IF NOT _index_exists THEN
        EXECUTE format('CREATE INDEX %I ON price_promo.%I (promo_id)', _index_name, _partition_name);
    END IF;
END;
$function$
;
