--liquibase formatted sql
--changeset chaitanyaprasad.reddy:MTP-28130_MTP-34458_bugfix_mtp-61295 runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:MTP-28130_MTP-34458_bugfix_mtp-61295
--comment: soft deletion introduced | MTP-95928
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_fuc_mapping(integer, input jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_fuc_mapping(integer, input jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_screen_name text;
	_attribute_value text;
	_description text;
	_is_default bool;
	_fuc_name text;
	_update_query text;
	_existing_is_default_query text;
	_is_default_update_query text;
	_query_screen_code text;
	_current_screen_code text;
	_new_screen_code int;
	_is_broadcast bool = false;
	_existing_is_broadcast_query text;
	_is_broadcast_update_query text;
	_existing_broadcast_default_query text;
	_broadcast_screen_names text[];
	_existing_broadcast_screen_query text;
	_is_only_default_changed bool = false;
	_updated_at_query text;
	_updated_at_value text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			if _key = 'screen_name' then
				_screen_name := _value;
				_broadcast_screen_names := _broadcast_screen_names || array[lower(_value)];
			elseif _key = 'saved_filter_preference' then
				_attribute_value := '{"' || _key || '":' || _value || '}';
			elseif _key = 'is_default' then
				_is_default := _value;
			elseif _key = 'name' then
				_fuc_name := _value;
			elseif _key = 'is_broadcast' then
				_is_broadcast := _value;
			elseif _key = 'is_only_default_changed' then
				_is_only_default_changed := _value;
			elseif _key = 'description' then
				_description := _value;
			end if;
		end loop;
		
		-- if _description is <NULL> making it '' for further queries
		_description = COALESCE(_description, '');

        _query_screen_code := 'select screen_code from "global".screen_master sm where lower(screen_name) = ''' || lower(_screen_name) || ''' and is_active';
        _current_screen_code := 'select screen_code from "global".filter_user_configurations_mapping where fuc_code = ' || $3 || ' and is_deleted = FALSE';
        raise notice ' screen query %', _query_screen_code;
        raise notice ' current screen query %', _current_screen_code;
        if _is_default then
            _existing_is_default_query := 'select fuc_code from "global".filter_user_configurations_mapping where is_default and created_by = ' || $1 || ' and screen_code in (' || _current_screen_code || ') and is_deleted = FALSE';
            _is_default_update_query := 'update "global".filter_user_configurations_mapping set is_default = false where fuc_code in (' || _existing_is_default_query || ')';
            
            raise notice ' update default query % ', _is_default_update_query;
            
            execute _is_default_update_query;
            
            if _broadcast_screen_names[1] != 'All' then
                            _broadcast_screen_names := _broadcast_screen_names || ARRAY['all'];
            end if;
            raise notice 'broadcast screen names: %', array_to_string(_broadcast_screen_names, ', ');

            _existing_broadcast_screen_query := 'SELECT screen_code FROM "global".screen_master sm ' ||
                'WHERE lower(sm.screen_name) IN (' || array_to_string(array(SELECT quote_literal(unnest(_broadcast_screen_names))), ', ') || ') AND is_active';
        
            raise notice 'existing broadcast screen query: %', _existing_broadcast_screen_query;
        
            _existing_broadcast_default_query := 'UPDATE "global".filter_user_configurations_mapping 
                SET is_default_to_users = is_default_to_users - ' || $1 || '::TEXT
                WHERE is_broadcast IS TRUE and screen_code IN (' || _existing_broadcast_screen_query || ') and is_deleted = FALSE';
            
            raise notice 'existing broadcast default query: %', _existing_broadcast_default_query;
            execute _existing_broadcast_default_query;
            
        end if;

		execute _query_screen_code into _new_screen_code;
		raise notice 'screen_code %', _new_screen_code;
	
	    _updated_at_query := 'SELECT COALESCE(
            (SELECT
                CASE
                    WHEN is_broadcast AND is_default_to_users->>' || quote_literal($1) || ' IS NOT NULL THEN (is_default_to_users->>' || quote_literal($1) || ')::timestamp
                    ELSE updated_at
                END - INTERVAL ' || quote_literal('1 second') || ' AS updated_at
            FROM
                global.filter_user_configurations_mapping
            WHERE
                (
                    (created_by = ' || quote_literal($1) || ' OR is_broadcast IS TRUE) AND 
                    screen_code = ' || quote_literal(_new_screen_code) || ' AND
                    is_deleted = FALSE
                )
            ORDER BY
                CASE
                    WHEN is_broadcast AND is_default_to_users->>' || quote_literal($1) || ' IS NOT NULL THEN TRUE
                    ELSE is_default
                END DESC,
                updated_at DESC
            OFFSET 1 LIMIT 1),
            NOW()
        )';
           
        _update_query := 'UPDATE "global".filter_user_configurations_mapping SET fuc_name = ''' || _fuc_name || ''', attribute_value = ''' || _attribute_value || ''', description = ''' || _description || ''', ';
        IF _is_default AND _is_broadcast then
            -- Add jsonb_set operation
            _is_default := false;
            _update_query := _update_query || 'is_default_to_users = jsonb_set(is_default_to_users, ''{' || $1 || '}'', to_jsonb(now())), ';        
        ELSE
            IF _is_only_default_changed and not _is_default then
                execute _updated_at_query into _updated_at_value;
                raise notice 'updated at max %', _updated_at_value;
                _update_query := _update_query || 'updated_at =' || quote_literal(_updated_at_value) || ', is_default_to_users = is_default_to_users - ' || $1 || '::TEXT, ';
            ELSE
                _update_query := _update_query || ' updated_at = now(), is_default_to_users = is_default_to_users - ' || $1 || '::TEXT, ';
            END IF;
        END IF;

        _update_query := _update_query || 'is_default = ' || _is_default || ', is_broadcast = ' || _is_broadcast || ', screen_code = ' || _new_screen_code || ' WHERE fuc_code = ' || $3 || ' AND is_deleted = FALSE';
        
        raise notice ' update query %', _update_query;
        execute _update_query;
    end $function$
;
