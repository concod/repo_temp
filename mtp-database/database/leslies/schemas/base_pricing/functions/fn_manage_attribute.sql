--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_manage_attribute_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_manage_attribute_10

DROP FUNCTION IF EXISTS base_pricing.fn_manage_attribute;

CREATE OR REPLACE FUNCTION base_pricing.fn_manage_attribute(p_schema character varying, p_action character varying, p_new_attribute_name character varying DEFAULT NULL::character varying, p_new_column_name character varying DEFAULT NULL::character varying, p_new_data_type character varying DEFAULT NULL::character varying, p_new_is_active boolean DEFAULT true, p_new_is_editable boolean DEFAULT true, p_new_validation_id integer DEFAULT NULL::integer, p_remove_column_name character varying DEFAULT NULL::character varying, p_old_column_name character varying DEFAULT NULL::character varying, p_updated_attribute_name character varying DEFAULT NULL::character varying, p_updated_column_name character varying DEFAULT NULL::character varying, p_old_validation_id integer DEFAULT NULL::integer, p_updated_validation_id integer DEFAULT NULL::integer, p_backup_table_name text DEFAULT NULL::text, p_original_table_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    backup_table_full_name TEXT := format('%I.%I', p_schema, p_backup_table_name);
    original_table_full_name TEXT := format('%I.%I', p_schema, p_original_table_name);
BEGIN
    -- Step 1: Create a backup of the existing data
    EXECUTE format('CREATE TABLE IF NOT EXISTS %s AS TABLE %s WITH NO DATA;', backup_table_full_name, original_table_full_name);
    EXECUTE format('TRUNCATE TABLE %s;', backup_table_full_name);
    EXECUTE format('INSERT INTO %s SELECT * FROM %s;', backup_table_full_name, original_table_full_name);

    -- Step 2: Perform changes in the metadata
    -- Create a backup of the metadata if necessary
    CREATE TABLE IF NOT EXISTS base_pricing.bp_attributes_metadata_backup AS
    SELECT * FROM base_pricing.bp_attributes_metadata WHERE FALSE;

    -- Clear and re-populate the backup metadata table
    TRUNCATE base_pricing.bp_attributes_metadata_backup;
    INSERT INTO base_pricing.bp_attributes_metadata_backup
    SELECT * FROM base_pricing.bp_attributes_metadata;

    -- Handle adding a new attribute
    IF p_action = 'add' THEN
        -- Check if the new column already exists to prevent duplication
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = p_original_table_name AND column_name = p_new_column_name AND table_schema = p_schema
        ) THEN
            -- Insert metadata for the new attribute
            INSERT INTO base_pricing.bp_attributes_metadata (
                attribute_name, column_name, data_type, is_active, is_editable
            ) VALUES (
                p_new_attribute_name, p_new_column_name, p_new_data_type, p_new_is_active, p_new_is_editable
            );

            -- Add the new column to the main table
            EXECUTE format('ALTER TABLE %s ADD COLUMN %I %s;', original_table_full_name, p_new_column_name, p_new_data_type);

            -- Insert validation information if a validation ID is provided
            IF p_new_validation_id IS NOT NULL THEN
                INSERT INTO base_pricing.bp_validation_master (validation_id, column_name)
                VALUES (p_new_validation_id, p_new_column_name);
            END IF;
        END IF;

    -- Handle removing an attribute
    ELSIF p_action = 'remove' THEN
        -- Deactivate the attribute in metadata
        UPDATE base_pricing.bp_attributes_metadata
        SET is_active = FALSE
        WHERE column_name = p_remove_column_name;

        -- Remove validation mapping if it exists
        DELETE FROM base_pricing.bp_validation_master
        WHERE column_name = p_remove_column_name;

        -- Drop the column from the main table if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = p_original_table_name AND column_name = p_remove_column_name AND table_schema = p_schema
        ) THEN
            EXECUTE format('ALTER TABLE %s DROP COLUMN %I;', original_table_full_name, p_remove_column_name);
        END IF;

    -- Handle updating an attribute's configuration
    ELSIF p_action = 'update' THEN
        -- Ensure the column exists before updating
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = p_original_table_name AND column_name = p_old_column_name AND table_schema = p_schema
        ) THEN
            -- Update attribute metadata
            UPDATE base_pricing.bp_attributes_metadata
            SET
                attribute_name = p_updated_attribute_name,
                is_editable = p_new_is_editable,
                is_active = p_new_is_active
            WHERE
                column_name = p_old_column_name;

            -- Update validation mapping if new validation ID is provided
            IF p_updated_validation_id IS NOT NULL THEN
                UPDATE base_pricing.bp_validation_master
                SET validation_id = p_updated_validation_id
                WHERE column_name = p_old_column_name;
            END IF;

            -- Rename the column if a new name is provided
            IF p_updated_column_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE %s RENAME COLUMN %I TO %I;', original_table_full_name, p_old_column_name, p_updated_column_name);
            END IF;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid action: %', p_action;
    END IF;

    -- Step 3: Recreate the main table schema dynamically
    PERFORM base_pricing.create_table_from_metadata(
        p_original_table_name,
        'product_id BIGINT NOT NULL, store_id INT NOT NULL, original_price FLOAT8 NULL, current_price FLOAT8 NULL,',
        'product_id, store_id'
    );

    -- Step 4: Restore data from the backup table
    EXECUTE format('TRUNCATE TABLE %s;', original_table_full_name);
    EXECUTE format('INSERT INTO %s SELECT * FROM %s;', original_table_full_name, backup_table_full_name);

EXCEPTION WHEN OTHERS THEN
    -- Roll back changes on error
    RAISE NOTICE 'An error occurred: %', SQLERRM;
    RAISE;
END; $function$
;