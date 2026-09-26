--liquibase formatted sql
--changeset ananya.gupta:store_mapping_partition_trigger runOnChange:true stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Create trigger and function to auto-create partitions for store_mapping table

 DROP TRIGGER IF EXISTS create_store_mapping_partition ON inventory_smart.store_transfer_rule;
  DROP FUNCTION IF EXISTS inventory_smart.create_store_mapping_partition_function();

CREATE OR REPLACE FUNCTION inventory_smart.create_store_mapping_partition_function()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    partition_table_name TEXT;
    rule_val INT;
BEGIN
    -- Get the rule ID being inserted
    rule_val := NEW.rule_id;
    partition_table_name := format('store_mapping_%s', rule_val);

    -- Check if partition already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'inventory_smart'
          AND c.relname = partition_table_name
    ) THEN     
        call global.build_list_partitions('store_mapping' || ':' || rule_val);
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER create_store_mapping_partition
AFTER INSERT
ON inventory_smart.store_transfer_rule
FOR EACH ROW
EXECUTE PROCEDURE inventory_smart.create_store_mapping_partition_function();
