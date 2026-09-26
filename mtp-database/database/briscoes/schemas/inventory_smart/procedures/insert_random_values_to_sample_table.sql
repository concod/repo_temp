--liquibase formatted sql
--changeset rajan.sahu@impactanalytics.co:random value insertion on configurator sample table runOnChange:true stripComments:false splitStatements:false context:MTP-119036 commit labels:MTP-119036
--comment: MTP-119036-random_value_insertion_on_configurator_sample_table
--rollback: SELECT 1

drop PROCEDURE if exists  inventory_smart.insert_random_values_to_sample_table( JSON);

CREATE OR REPLACE PROCEDURE inventory_smart.insert_random_values_to_sample_table(
    json_input JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    tbl JSONB;
    tbl_name TEXT;
    row_count INT;
    field_key TEXT;
    keys TEXT[];
    field_values JSONB;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.insert_random_values_to_sample_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();

    col_list TEXT;
    val_list TEXT;
    random_value TEXT;
    sql TEXT;

    i INT;
    col_exists BOOLEAN;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Loop through each table entry in JSON
    FOR tbl IN SELECT * FROM jsonb_array_elements(json_input->'tables')
    LOOP
        tbl_name := tbl->>'table_name';
        row_count := (tbl->>'row_count')::INT;

        -- Extract field list
        SELECT array_agg(key)
        INTO keys
        FROM jsonb_object_keys(tbl->'fields') AS key;

        -- Column Validation
        FOREACH field_key IN ARRAY keys LOOP
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = split_part(tbl_name, '.', 1)
                  AND table_name = split_part(tbl_name, '.', 2)
                  AND column_name = field_key
            )
            INTO col_exists;

            IF NOT col_exists THEN
                RAISE EXCEPTION 
                    'Column "%" does not exist in table "%"', field_key, tbl_name;
            END IF;
        END LOOP;


        -- Build column list
        col_list := '';
        FOREACH field_key IN ARRAY keys LOOP
            col_list := col_list || format('%I,', field_key);
        END LOOP;

        col_list := left(col_list, -1);

        -- Insert rows
        FOR i IN 1..row_count LOOP
            val_list := '';

            FOREACH field_key IN ARRAY keys LOOP
                field_values := tbl->'fields'->field_key;

                -- Pick random value from array
                SELECT (field_values->> (floor(random() * jsonb_array_length(field_values))::int))
                INTO random_value;

                -- Put appropriate value type
                val_list := val_list ||
                    CASE 
                        WHEN random_value ~ '^[0-9.]+$' THEN random_value
                        WHEN random_value IN ('true','false') THEN random_value
                        ELSE quote_literal(random_value)
                    END || ',';
            END LOOP;

            val_list := left(val_list, -1);

            sql := format(
                'INSERT INTO %s (%s) VALUES (%s);',
                tbl_name, col_list, val_list
            );

            EXECUTE sql;
        END LOOP;

    END LOOP;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;