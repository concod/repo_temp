--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:sync_store_groups_figs runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:figs_sync_store_groups
--comment: initial changeset for update_store_code_data
--rollback: SELECT 1


-- PROCEDURE: global.update_store_code_data()

DROP PROCEDURE IF EXISTS global.update_store_code_data();

CREATE OR REPLACE PROCEDURE global.update_store_code_data(
	)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    _tbl text;
    _has_store_code boolean;
    _has_store_name boolean;
    _set_clause text;
    _where_col text;
	_store_name_type text;
	_map record;
     _sql text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := '"global".update_store_code_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN

call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);

    -- Loop through mapping table
    FOR _map IN
        SELECT dummy_store_code, store_code AS actual_store
        FROM global.store_code_mapping
        WHERE COALESCE(status,'') <> 'Updated'
    LOOP
        RAISE NOTICE 'Processing dummy store: % → %', _map.dummy_store_code, _map.actual_store;

        --  Insert actual store into store_master based on dummy record
        IF EXISTS (SELECT 1 FROM global.store_master WHERE store_code = _map.dummy_store_code) THEN
            IF NOT EXISTS (SELECT 1 FROM global.store_master WHERE store_code = _map.actual_store) THEN
                -- insert actual store based on dummy record
                EXECUTE format(
                    'INSERT INTO global.store_master (%s)
                     SELECT %s FROM global.store_master
                     WHERE store_code = %L',
                    string_agg(quote_ident(column_name), ', '),
                    string_agg(
                        CASE WHEN column_name='store_code' OR column_name='store_name'
                             THEN quote_literal(_map.actual_store)
                             ELSE quote_ident(column_name)
                        END, ', '
                    ),
                    _map.dummy_store_code
                )
                FROM information_schema.columns
                WHERE table_schema='global' AND table_name='store_master';

                RAISE NOTICE 'Inserted actual store % into store_master based on dummy record', _map.actual_store;
            END IF;
        END IF;

        -- Update all child/parent tables except store_master
        FOREACH _tbl IN ARRAY ARRAY[
            'global.new_store_mapping',
            'global.new_store_attributes',
            'global.new_store_projections',
            'global.new_store_reserve',
         --   'global.store_attributes',
         --   'global.store_attributes_filter',
            'global.store_groups_mapping',
            'global.store_time_attributes',
            'global.product_store_attributes_filter',
            'global.product_store_attributes_filter_store_code',
            'inventory_smart.article_inventory_dashboard',
            'inventory_smart.alerts_product_store_level',
            'inventory_smart.article_store_grade',
            'inventory_smart.constraint_master',
            'inventory_smart.create_allocation_result_flat_gurobi',
            'inventory_smart.excess_units',
            'inventory_smart.fwos_sku_store_table',
            'inventory_smart.latest_inventory',
            'inventory_smart.loss_units',
            'inventory_smart.product_profile_attributes_filter',
            'inventory_smart.product_profile_mapping',
            'inventory_smart.product_profile_user_mapping_size',
            'inventory_smart.rcl_dc_store_policy_store_level',
            'inventory_smart.store_clusters',
            'global.new_store_data',
            'global.product_mapping'
        ]
        LOOP
            -- Check if table has store_code / store_name
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = split_part(_tbl,'.',1)
                  AND table_name   = split_part(_tbl,'.',2)
                  AND column_name  = 'store_code'
            ) INTO _has_store_code;

            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = split_part(_tbl,'.',1)
                  AND table_name   = split_part(_tbl,'.',2)
                  AND column_name  = 'store_name'
            ) INTO _has_store_name;
--------------------------------
			IF _has_store_name THEN
		    SELECT data_type
		    INTO _store_name_type
		    FROM information_schema.columns
		    WHERE table_schema = split_part(_tbl,'.',1)
		      AND table_name   = split_part(_tbl,'.',2)
		      AND column_name  = 'store_name';
		  END IF;
----------------------------------

            IF NOT _has_store_code AND NOT _has_store_name THEN
                CONTINUE;
            END IF;

            _set_clause := '';
            _where_col  := NULL;

            IF _has_store_code THEN
                _set_clause := 'store_code = ' || quote_literal(_map.actual_store);
                _where_col := 'store_code = ' || quote_literal(_map.dummy_store_code);
            END IF;

            -- IF _has_store_name THEN
            --     _set_clause := _set_clause ||
            --         CASE WHEN _set_clause <> '' THEN ', ' ELSE '' END ||
            --         'store_name = ' || quote_literal(_map.actual_store);

            --     IF _where_col IS NULL THEN
            --         _where_col := 'store_name';
            --     END IF;
            -- END IF;

		IF _has_store_name AND _store_name_type = 'ARRAY' THEN
    _set_clause := _set_clause ||
        CASE WHEN _set_clause <> '' THEN ', ' ELSE '' END ||
        'store_name = array_replace(store_name, '
            || quote_literal(_map.dummy_store_code)
            || ', '
            || quote_literal(_map.actual_store)
            || ')';

    IF _where_col IS NULL THEN
        _where_col := 'store_name @> ARRAY[' || quote_literal(_map.dummy_store_code) || ']';
    END IF;
	ELSIF _has_store_name THEN
    _set_clause := _set_clause ||
        CASE WHEN _set_clause <> '' THEN ', ' ELSE '' END ||
        'store_name = ' || quote_literal(_map.actual_store);

    IF _where_col IS NULL THEN
        _where_col := 'store_name = ' || quote_literal(_map.dummy_store_code);
    END IF;
END IF;



            -- Execute update
           _sql := format(
			    'UPDATE %s SET %s WHERE %s',
			    _tbl,
			    _set_clause,
			    _where_col
			);


		RAISE NOTICE 'Executing on %, SQL: %', _tbl, _sql;

            EXECUTE _sql;

           -- RAISE NOTICE 'Updated table %', _tbl;
        END LOOP;

        --  Delete dummy record from store_master
        DELETE FROM global.store_master
        WHERE store_code = _map.dummy_store_code;

        RAISE NOTICE 'Deleted dummy store % from store_master', _map.dummy_store_code;

        -- status mapping updated
        UPDATE global.store_code_mapping
        SET status = 'Updated',
            updated_at = NOW()
        WHERE dummy_store_code = _map.dummy_store_code;

    END LOOP;
	
 RAISE NOTICE 'store code/store name mapping updated successfully';
 call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;

END;
$BODY$;