--liquibase formatted sql
--changeset gururaj.patil@impactanalytics.co:product profile for generate_rcl_po_store_policy runOnChange:true stripComments:false splitStatements:false context:MTP-119888-112857 labels:MTP-119888-112857
--comment: MTP-119888-112857
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.create_asl_ph_config_temp_table(text, text, text, text, integer, text);
CREATE OR REPLACE FUNCTION inventory_smart.create_asl_ph_config_temp_table(
    p_vl_unique_identifier text,
    p_ph_data_id text,
    p_alloc_type text,
    p_filter text,
    p_default_sg_code integer,
    p_gen_random_uuid text DEFAULT NULL,
    p_client_config jsonb DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _temp_query text;
        v_gen_random_uuid text := COALESCE(p_gen_random_uuid, '');
        prod_data_table text := 'prod_data_' || p_vl_unique_identifier;
        ph_configuration_mapping text := '_ph_configuration_mapping_' || p_vl_unique_identifier;
        _columns_clause text := '';
        _join_clause text := '';
        _store_policy_rcl_function text := '';
        _is_po_store_policy_enabled boolean := false;
        _module_code integer := 10003;
        _data_level text := '';
        _use_precomputed_data boolean := COALESCE((p_client_config->>'use_precomputed_data')::boolean, false);

    BEGIN
        _is_po_store_policy_enabled := COALESCE((p_client_config->'is_po_store_policy_enabled')::boolean, false);

        -- Derive default_store_groups column based on alloc_type and store policy
        IF p_alloc_type = 'ns' OR (p_alloc_type = 'po' AND NOT _is_po_store_policy_enabled) THEN
            _columns_clause := ',ARRAY[' || p_default_sg_code || ']::int[] as default_store_groups';
        ELSE
            _columns_clause := ',max(resolved_data.default_store_groups) as default_store_groups';
        END IF;

        _data_level := 'article' || COALESCE(', ' || (p_client_config->'alloc_level_ph_config'->p_alloc_type->>'join_cols'), '');

        IF p_alloc_type = 'po' THEN
            _join_clause := 'join inventory_smart.po_master using(' || _data_level || ') %5$s';
        ELSIF p_alloc_type = 'asn' THEN
            _join_clause := 'join (select distinct ' || _data_level || ' from inventory_smart.sku_asn_available_units %5$s ) am using(' || _data_level || ') ';
        END IF;

        -- Set RCL function based on alloc_type
        IF _is_po_store_policy_enabled AND p_alloc_type = 'po' THEN
            _store_policy_rcl_function := 'inventory_smart.generate_rcl_po_store_policy';
            _module_code := 10004;
        ELSE
            _store_policy_rcl_function := 'inventory_smart.generate_rcl_dc_store_policy';
            _module_code := 10003;
        END IF;

        -- PROD DATA TEMP TABLE
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_ph_config_temp_table', 'Before executing drop table query for ' || prod_data_table, 'drop table if exists ' || prod_data_table || ' cascade;', jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6));
        execute format('drop table if exists %1$s cascade;', prod_data_table);
        _temp_query := format('
            create unlogged table %1$s as (
                select unnest(product_codes) as product_code from %2$s
            );',
            prod_data_table,
            p_ph_data_id
        );
        raise notice 'prod data query %', _temp_query;
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_ph_config_temp_table', 'Before executing prod data temp_query', _temp_query, jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6));
        execute _temp_query;

        -- PH CONFIGURATION MAPPING TEMP TABLE
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_ph_config_temp_table', 'Before executing drop table query for ' || ph_configuration_mapping, 'drop table if exists ' || ph_configuration_mapping || ' cascade;', jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6));
        execute format('drop table if exists %1$s cascade', ph_configuration_mapping);
        _temp_query := format(
            'create temp table %1$s as (
                select
                    array_agg(resolved_data.product_code) as product_codes,
                    max(resolved_data.default_product_profile) as default_product_profile,
                    max(resolved_data.default_store_groups) as default_store_groups_selected,
                    max(dc_store_rule) as dc_store_rule,
                    psaf.article, psaf.ph_code
                    %4$s
                from
                (
                    select * from ' || _store_policy_rcl_function || '(''%2$s'', ' || _module_code || ', current_date, true, ' || _use_precomputed_data || ')
                ) resolved_data
                join
                (
                    select
                        unnest(product_codes) as product_code,
                        article,
                        ph_code
                    from inventory_smart.ph_master
                    ' || _join_clause || '
                ) psaf
                using (product_code)
                group by psaf.article, psaf.ph_code
            );',
            ph_configuration_mapping,
            prod_data_table,
            _join_clause,
            _columns_clause,
            p_filter
        );
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_ph_config_temp_table', 'Before executing ph configuration temp_query', _temp_query, jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6));
        raise notice 'ph configuration data query : %', _temp_query;
        execute _temp_query;

    END
 $function$
;