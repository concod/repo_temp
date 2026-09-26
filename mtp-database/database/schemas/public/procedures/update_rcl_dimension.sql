--liquibase formatted sql
--changeset liquibase:update_rcl_dimension runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_rcl_dimension
--rollback: SELECT 1
--Dependent on: sync_hierarchy_reclassification
DROP PROCEDURE IF EXISTS public.update_rcl_dimension();
CREATE OR REPLACE PROCEDURE public.update_rcl_dimension(IN _target_table text, IN _temp_table text, IN _new_table text)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _rcl_code INT;
    _keys TEXT[];
    _sql TEXT;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.update_rcl_dimension';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    FOR _rcl_code IN
        EXECUTE format('SELECT DISTINCT rcl_code FROM %I', _temp_table)
    LOOP
        EXECUTE format(
            'SELECT array_agg(distinct keys) ---------
                FROM (
                    SELECT jsonb_object_keys(rcl_dimension) AS keys
                    FROM %I
                    WHERE rcl_code = %L
                ) b;',
            _temp_table, _rcl_code
        )
        INTO _keys;
        raise notice '_keys: %', _keys;

        _sql := format($f$
            UPDATE %s rcm
            SET rcl_dimension = hierarchy_vals
            FROM (
                SELECT DISTINCT jsonb_build_object(%s) AS hierarchy_vals,
                                rcmr.rcl_code, rcmr.rule_code
                FROM global.product_attributes_filter paf
				join %s hd using(product_code)
                JOIN %s rcmr
                  ON md5(rcmr.rcl_dimension::text) = (hd.rcl_hash_old ->> %L)
            ) b
            WHERE rcm.rule_code = b.rule_code
			and b.rule_code not in (select rule_code from %s where rcl_code = %L)
        $f$,
            _target_table,
            (SELECT string_agg(format('%L, paf.%I', k, k), ', ') FROM unnest(_keys) AS k),
			_temp_table,
            _target_table,
            _rcl_code,
			_new_table,
			_rcl_code
        );
        RAISE NOTICE '_sql: %', _sql;
        EXECUTE _sql;


    END LOOP;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;