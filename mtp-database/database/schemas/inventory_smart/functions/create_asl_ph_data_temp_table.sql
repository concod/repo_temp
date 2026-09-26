--liquibase formatted sql
--changeset nibeel.yunus:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-95638 labels:MTP-95638
--comment: MTP-95638
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.create_asl_ph_data_temp_table(text, text, text, text, text, integer, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.create_asl_ph_data_temp_table(
    p_ph_data_id text, 
    p_alloc_type text, 
    p_filter text, 
    p_query_pa text, 
    p_ph_sort text, 
    p_offset integer, 
    p_gen_random_uuid text,
    p_limit_clause text,
    p_client_config jsonb DEFAULT '{}'::jsonb
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 
    DECLARE
        _temp_query text;
        v_gen_random_uuid text := COALESCE(p_gen_random_uuid, '');
        _join_clause text := '';
		_ph_sort_final text;
		_join_col text := '';
		_alloc_ph_config jsonb;
		_aid_join boolean;
		_saf_join boolean;
		_column_to_fetch text;

    BEGIN
        -- Drop existing table
        _temp_query := format('drop table if exists %1$s cascade;', p_ph_data_id);
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_ph_data_temp_table', 'Before executing first temp_query', _temp_query, jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
        execute _temp_query;
		
		_ph_sort_final := replace(
    		COALESCE(NULLIF(btrim(p_ph_sort), ''), 'ORDER BY article ASC'),
    		'%','%%'
		);

        if p_alloc_type = 'po' then
            _join_col := 'article' || COALESCE(', ' || (p_client_config->'alloc_level_ph_config'->p_alloc_type->>'join_cols'), ''); 
            _aid_join := COALESCE((p_client_config->'alloc_level_ph_config'->p_alloc_type->>'aid_join')::boolean, false);
            _column_to_fetch := 'article' || COALESCE(', ' || (p_client_config->'alloc_level_ph_config'->p_alloc_type->>'column_to_fetch'), '');

            _join_clause := 'join (select distinct '||_join_col||', dc_code from inventory_smart.po_master %5$s ) po using('||_join_col||') join (select distinct article from inventory_smart.sku_po_available_units where oh > 0) sku using (article) ';
            if _aid_join then
                _join_clause := _join_clause || ' join (select distinct '||_column_to_fetch||' from inventory_smart.article_inventory_dashboard) aid using (article)';
            end if;

        elsif p_alloc_type = 'asn' then
            _join_col := 'article' || COALESCE(', ' || (p_client_config->'alloc_level_ph_config'->p_alloc_type->>'join_cols'), '');

            if COALESCE((p_client_config->'alloc_level_ph_config'->p_alloc_type->>'asn_master_join')::boolean, true) then
                _join_clause := 'join (select distinct '||_join_col||', dc_code from inventory_smart.asn_master %5$s ) po using('||_join_col||') join (select distinct article from inventory_smart.sku_asn_available_units where oh > 0) sku using (article) ';
            else
                _join_clause := 'join (select distinct '||_join_col||' from inventory_smart.sku_asn_available_units where oh > 0) sku using ('||_join_col||') ';
            end if;

        elsif p_alloc_type = 'pdq' then
            _join_clause := 'join (select distinct article from inventory_smart.article_inventory_dashboard ) aid using (article) join (select distinct pack_type_id as article from inventory_smart.sku_dc_available_units where oh > 0) sku using (article)';

        elsif p_alloc_type = 'nc' then
            _join_clause := 'join (select distinct article from inventory_smart.article_inventory_dashboard aid join global.store_attributes_filter saf using(store_code) where store_category = ''STORE'') aid using (article)';

        elsif p_alloc_type = 'ns' then
            _join_clause := 'join (select distinct article from inventory_smart.sku_ns_available_units where oh > 0) sku using (article) ';

        else
            _alloc_ph_config := p_client_config->'alloc_level_ph_config'->p_alloc_type;
            _aid_join := COALESCE((_alloc_ph_config->>'aid_join')::boolean, true);
            _saf_join := COALESCE((_alloc_ph_config->>'saf_join')::boolean, false);
            _column_to_fetch := 'article' || COALESCE(', ' || (_alloc_ph_config->>'column_to_fetch'), '');

            IF _aid_join THEN
                IF _saf_join THEN
                    _join_clause := 'join (select distinct ' || _column_to_fetch || ' from inventory_smart.article_inventory_dashboard aid join global.store_attributes_filter saf using(store_code) where store_category = ''STORE'') aid using (article) ';
                ELSE
                    _join_clause := 'join (select distinct ' || _column_to_fetch || ' from inventory_smart.article_inventory_dashboard ) aid using (article) ';
                END IF;
                _join_clause := _join_clause || 'join (select distinct article from inventory_smart.sku_dc_available_units where oh > 0) sku using (article) ';
            END IF;
        end if;

        -- Create new temp table
        _temp_query := format(
            'create temp table %2$s as (
                with ph_data_without_offset as (
                    select * from inventory_smart.ph_master
                    ' || _join_clause || '
                    ' || p_query_pa || '
                )
                SELECT *, ROW_NUMBER () OVER (' || _ph_sort_final || ') as offset
                FROM ph_data_without_offset ' || p_limit_clause || '
            )',
            p_limit_clause,
            p_ph_data_id,
            _join_clause,
            p_offset,
			p_filter
        );

        raise notice ' ph _Data query %', _temp_query;
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_ph_data_temp_table', 'Before executing second temp_query', _temp_query, jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
        execute _temp_query;
        
    END
 $function$
;