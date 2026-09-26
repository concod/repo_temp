--liquibase formatted sql
--changeset anshuman:update_product_rule_sg_pp_dc_mapping stripComments:false splitStatements:false runOnChange:true context:Release_4_0_6 labels: MTP-28858,MTP-105176
--comment : MTP-28858
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_pp_dc_mapping(input jsonb, jsonb, integer[], text, jsonb, integer, integer[]);
DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_pp_dc_mapping(input refcursor, jsonb, jsonb, integer[], text, jsonb, integer, integer[], text);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_rule_sg_pp_dc_mapping(input refcursor, jsonb, jsonb, integer[], text, jsonb, integer, integer[], text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
_query_ph text := '';
_query_sa text := '';
_query_combine text:= '';
_column_name text := '';
_column_value text := '';
_query_l0_name text := '';
_query_table_filters text := '';
_channel text[] := inventory_smart.get_channel_from_input_new($3);
_channel_where_condition text := '';
_channel_select_condition text := '';
_query_in text := '';
_statement_cte_1 text := '';
_statement_cte_2 text := '';
_select_statement text := '';
_update_statement text := '';
_insert_statement text := '';
_where_clause_update text := '';
_where_clause_insert text := '';
_where_clause_cte_1 text := '';
_where_clause_cte_2 text := '';
_select_1 text := 'select 1 as success';
_final_select_cte text := '';

begin
select $2->>'l0_name' into _query_l0_name;
_query_l0_name = format('{"l0_name": %1$s}', _query_l0_name);

raise notice 'l0 query%',_query_l0_name; 

_query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
_query_sa := global.form_main_table_filters('store_attributes', $3);
_query_table_filters := global.form_table_query($6);

if cardinality(_channel) = 0 then
raise notice 'no channel passs %,',_channel;
	SELECT COALESCE(array_agg(DISTINCT channel), ARRAY[]::text[]) INTO _channel FROM global.store_attributes_filter where channel is not null and active;
	_channel_where_condition = ' ';
	_channel_select_condition = ' ';	
else
raise notice 'channel %', _channel;
	_channel_where_condition = ' and channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
	_channel_select_condition = array_to_string(_channel, ',', '');
	raise notice '%',_channel_select_condition; 
end if;

 --raise notice '%,', $7;

	if $5 ilike 'store' then
		_column_name := 'default_store_groups';
		_column_value := $4::text; 
		_query_in := '
		   WITH RECURSIVE split_channels AS (
			  SELECT
			    SUBSTRING(channels || '','' FROM 1 FOR POSITION('','' IN channels || '','') - 1) AS channel,
			    SUBSTRING(channels || '','' FROM POSITION('','' IN channels || '','') + 1) AS remaining_names
			  FROM (
			    SELECT '''||_channel_select_condition||''' AS channels
			  ) AS initial
			  
			  UNION ALL
			  
			  SELECT
	            SUBSTRING(remaining_names FROM 1 FOR POSITION('','' IN remaining_names) - 1) AS channel,
	            SUBSTRING(remaining_names FROM POSITION('','' IN remaining_names) + 1) AS remaining_names
			  FROM split_channels
			  WHERE remaining_names <> ''''
			)
			select channel, column_value from (SELECT 
			    channel, array_agg(sg_code) as column_value 
			    from global.store_groups where sg_code = any('''|| _column_value ||'''::int[]) '|| _channel_where_condition ||'  group by 1) x
			full join
			(SELECT channel
			FROM split_channels where channel != '' '') y using (channel)';
	 raise notice '_query_in %', _query_in;
	
	elsif $5 ilike 'dc' then
		_column_name := 'default_dcs';
		_column_value := $4::text;
		_query_in := 'SELECT unnest('''||_channel::text||'''::text[]) channel, '''||_column_value||'''::int[] AS column_value';
		--raise notice '_query_in %', _query_in;
	else
		_column_name := 'default_product_profile';
		if array_dims($4) is null then
			_column_value := 'NULL::int';
		else 
			_column_value := $4[1]::text;
		end if;
		_query_in := 'SELECT unnest('''||_channel::text||'''::text[]) channel, '||_column_value||' AS column_value';
		--raise notice ' _query_in %', _query_in;
	end if;

_update_statement := 'UPDATE inventory_smart.ph_configuration_mapping psm
		SET
		    '||_column_name||' = z.column_value,
		    updated_by = '||$7||',
		    updated_at = now()';
		    
_select_statement := 'with count as (select 0 as record_count, count(distinct article) as sku_count';
_where_clause_update := 'WHERE psm.ph_code = z.ph_code AND psm.channel = z.channel;';
_insert_statement := 'INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel, '|| _column_name ||', created_by, created_at)
	SELECT z.ph_code, z.channel, z.column_value, '||$7||', now()';
_where_clause_insert := '
		WHERE NOT EXISTS (
		    SELECT 1
		    FROM inventory_smart.ph_configuration_mapping psm
		    WHERE psm.ph_code = z.ph_code AND psm.channel = z.channel
		)
    ON CONFLICT DO NOTHING;';

if $9 ilike 'record_count' then 
	_statement_cte_1 := _select_statement;
	_statement_cte_2 := _select_statement;
	_final_select_cte := ') select jsonb_build_object(''record_count'', record_count, ''sku_count'', sku_count) as count from count';
	_where_clause_cte_1 := '';
	_where_clause_cte_2 := '';
else
	_statement_cte_1 := _update_statement;
	_statement_cte_2 := _insert_statement;
	_where_clause_cte_1 := _where_clause_update;
	_where_clause_cte_2 := _where_clause_insert;
	_final_select_cte := '';
end if;	
	
   
	raise notice '%', _column_value;
	_query_combine := '
	 '||_statement_cte_1||'
		FROM (
		    SELECT x.ph_code, y.channel, y.column_value, article
		    FROM (
		        SELECT *
		        FROM (
		            SELECT *, unnest(product_codes) AS product_code
		            FROM inventory_smart.ph_master '|| _query_ph ||
		        ') ph
		        '|| _query_table_filters ||'
		    ) x
		    CROSS JOIN ('|| _query_in ||') y
		) z
		    '||_where_clause_cte_1||'
		'||_final_select_cte||'	
		';
	raise notice '%', _query_combine;
	if $9 ilike 'select' then
		OPEN $1 FOR EXECUTE _query_combine;
		return $1;
	else 
		execute _query_combine;
	end if;
    _query_combine := '
    	'||_statement_cte_2||'
		FROM (
		    SELECT x.ph_code, y.channel, y.column_value, article
		    FROM (
		        SELECT *
		        FROM (
		            SELECT *, unnest(product_codes) AS product_code
		            FROM inventory_smart.ph_master '|| _query_ph ||'
		        ) ph
				'|| _query_table_filters ||'
		    ) x
		    CROSS JOIN (
		        '|| _query_in ||'
		    ) y
		) z
		'||_where_clause_cte_2||'
		'||_final_select_cte||'	
		';
    raise notice '%', _query_combine;
   	
    if $9 ilike 'record_count' then
		OPEN $1 FOR EXECUTE _query_combine;
		return $1;
	else 
		execute _query_combine;
		OPEN $1 FOR EXECUTE _select_1;
		return $1;
	end if;
end
$function$
;

 --rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1;