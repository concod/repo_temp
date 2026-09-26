--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:default_store_groups runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:default_store_groups
--comment: initial changeset for default_store_groups


DROP PROCEDURE IF EXISTS public.default_store_group();

CREATE OR REPLACE PROCEDURE public.default_store_group()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid()::varchar;
    _sp_name  varchar := 'public.default_store_group';
    _log_step varchar;
    _st       timestamptz := clock_timestamp();

    _bls_codes     text[];
    _bfl_codes     text[];
    _bealls_codes  text[];
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name',  _sp_name,  true);

    BEGIN
        _log_step := 'validate_store_groups';

        IF NOT EXISTS (SELECT 1 FROM global.store_groups WHERE sg_code = 126) THEN
            RAISE EXCEPTION 'sg_code 126 missing in global.store_groups';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM global.store_groups WHERE sg_code = 125) THEN
            RAISE EXCEPTION 'sg_code 125 missing in global.store_groups';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM global.store_groups WHERE sg_code = 51) THEN
            RAISE EXCEPTION 'sg_code 51 missing in global.store_groups';
        END IF;

        --------------------------------------------------------------------
        -- 1) Collect current active store lists
        --------------------------------------------------------------------
        _log_step := 'collect_store_codes';

        SELECT COALESCE(array_agg(DISTINCT saf.store_code ORDER BY saf.store_code), ARRAY[]::text[])
        INTO _bls_codes
        FROM global.store_attributes_filter saf
        WHERE saf.active = true
          AND saf.store_type = 'STORE'
          AND saf.s0_id = '30';

        SELECT COALESCE(array_agg(DISTINCT saf.store_code ORDER BY saf.store_code), ARRAY[]::text[])
        INTO _bfl_codes
        FROM global.store_attributes_filter saf
        WHERE saf.active = true
          AND saf.store_type = 'STORE'
          AND saf.s0_id = '20';

        SELECT COALESCE(array_agg(DISTINCT saf.store_code ORDER BY saf.store_code), ARRAY[]::text[])
        INTO _bealls_codes
        FROM global.store_attributes_filter saf
        WHERE saf.active = true
          AND saf.store_type = 'STORE';

        --------------------------------------------------------------------
        -- 2) Update extra in store_groups
        --------------------------------------------------------------------
        _log_step := 'update_store_groups_extra';

        UPDATE global.store_groups
        SET extra = jsonb_build_object('store_codes', to_jsonb(_bls_codes)),
            updated_at = now()
        WHERE sg_code = 126;

        UPDATE global.store_groups
        SET extra = jsonb_build_object('store_codes', to_jsonb(_bfl_codes)),
            updated_at = now()
        WHERE sg_code = 125;

        UPDATE global.store_groups
        SET extra = jsonb_build_object('store_codes', to_jsonb(_bealls_codes)),
            updated_at = now()
        WHERE sg_code = 51;

        --------------------------------------------------------------------
        -- 3) Delete removed mappings
        --------------------------------------------------------------------
        _log_step := 'delete_removed_mappings';

        DELETE FROM global.store_groups_mapping gm
        WHERE gm.sg_code = 126
          AND NOT EXISTS (
              SELECT 1
              FROM unnest(_bls_codes) AS x(store_code)
              WHERE x.store_code = gm.store_code
          );

        DELETE FROM global.store_groups_mapping gm
        WHERE gm.sg_code = 125
          AND NOT EXISTS (
              SELECT 1
              FROM unnest(_bfl_codes) AS x(store_code)
              WHERE x.store_code = gm.store_code
          );

        DELETE FROM global.store_groups_mapping gm
        WHERE gm.sg_code = 51
          AND NOT EXISTS (
              SELECT 1
              FROM unnest(_bealls_codes) AS x(store_code)
              WHERE x.store_code = gm.store_code
          );

        --------------------------------------------------------------------
        -- 4) Insert new mappings
        --------------------------------------------------------------------
        _log_step := 'insert_new_mappings';

        INSERT INTO global.store_groups_mapping (sg_code, store_code)
        SELECT 126, x.store_code
        FROM unnest(_bls_codes) AS x(store_code)
        WHERE NOT EXISTS (
            SELECT 1
            FROM global.store_groups_mapping gm
            WHERE gm.sg_code = 126
              AND gm.store_code = x.store_code
        );

        INSERT INTO global.store_groups_mapping (sg_code, store_code)
        SELECT 125, x.store_code
        FROM unnest(_bfl_codes) AS x(store_code)
        WHERE NOT EXISTS (
            SELECT 1
            FROM global.store_groups_mapping gm
            WHERE gm.sg_code = 125
              AND gm.store_code = x.store_code
        );

        INSERT INTO global.store_groups_mapping (sg_code, store_code)
        SELECT 51, x.store_code
        FROM unnest(_bealls_codes) AS x(store_code)
        WHERE NOT EXISTS (
            SELECT 1
            FROM global.store_groups_mapping gm
            WHERE gm.sg_code = 51
              AND gm.store_code = x.store_code
        );

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN others THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, COALESCE(_log_step,'error'), SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END
$procedure$
;
