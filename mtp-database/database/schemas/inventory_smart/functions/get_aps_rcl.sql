--liquibase formatted sql
--changeset liquibase:get_aps_rcl_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-64501_fix labels:MTP-64501_fix
--comment:  validators fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_aps_rcl(jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_aps_rcl(input jsonb)
RETURNS TABLE(article text, aps integer, wos integer, min_stock integer, max_stock integer, min_stock_validator integer, max_stock_validator integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
#variable_conflict use_column
DECLARE
  vl_unique_identifier    text := '';
  _psm_input_table        text := '';
  _psm_input_table_query_f      text := '';
  _psm_input_query        text := '';
  _rcl_psm_query          text := '';
  _rcl_psm_table          text := '';
  _rcl_psm_query_f        text := '';
  _rcl_const_query        text := '';
  _rcl_const_query_f      text := '';
  _rcl_const_table        text := '';
  _rcl_const_join_query   text := '';
  _rcl_select_column      text := '';
  ph_configuration_mapping text := '';
  _count_check int;
  _temp_query text := '';
_rcl_input_query text := '';
BEGIN

SELECT replace(gen_random_uuid()::text, '-', '_') INTO vl_unique_identifier;
ph_configuration_mapping := '_ph_configuration_mapping_' || vl_unique_identifier;
  -- _rcl_const_join_query this string will come from the input jsonb and will be placed in the join clause of the _rcl_const_query_f 
  _rcl_const_join_query := (SELECT value->>'rcl_const_join_query' FROM jsonb_array_elements(input) limit 1);
  -- if _rcl_const_join_query is null then default is l0_name=psaf.l0_name
  if _rcl_const_join_query is null then
    _rcl_const_join_query := ' and paf.l0_name=psaf.l0_name';
  end if;
  RAISE NOTICE '_rcl_const_join_query: %', _rcl_const_join_query;
  -- _rcl_select_column this string will come from the input jsonb and will be placed in the select clause of the _rcl_const_query_f
  _rcl_select_column := (SELECT value->>'rcl_select_column' FROM jsonb_array_elements(input) limit 1);
  if _rcl_select_column is null then
    _rcl_select_column := ', paf.l0_name';
  end if;
  RAISE NOTICE '_rcl_select_column: %', _rcl_select_column;
  _psm_input_table_query_f := format($$
    WITH unpack_json AS (
      SELECT
        replace(replace(value->>'upc', '[', '{'), ']', '}')::varchar[] AS product_codes,
        replace(replace(value->>'store_group_code', '[', '{'), ']', '}')::int4[] AS store_group_codes
      FROM
        jsonb_array_elements(
        '%1$s'
        )
    ),
    product_store_groups AS (
      SELECT product_code, unnest(store_group_codes) sg_code FROM (
        SELECT unnest(product_codes) AS product_code, store_group_codes FROM unpack_json
      ) t1
    )
    SELECT paf.article, psg.product_code, sgm.store_code, psafs.psa_code FROM product_store_groups psg
    JOIN "global".store_groups_mapping sgm ON sgm.sg_code = psg.sg_code
    JOIN "global".product_attributes_filter paf ON paf.product_code = psg.product_code
    JOIN "global".product_store_attributes_filter_store_code psafs ON psafs.store_code=sgm.store_code AND paf.l0_name = psafs.l0_name
    GROUP BY 1, 2, 3, 4
  $$, input);
  _psm_input_table := 'public.psm_input_data_' || vl_unique_identifier;
  _psm_input_query:= 'CREATE UNLOGGED TABLE ' || _psm_input_table || ' AS ( ' || _psm_input_table_query_f || ' );';
  RAISE NOTICE '_psm_input_query: %', _psm_input_query;
  EXECUTE 'DROP TABLE IF EXISTS ' || _psm_input_table ||' CASCADE; ';
  EXECUTE _psm_input_query;
  _rcl_psm_query_f = format('
    SELECT
      *
    FROM global.generate_rcl_psm_data(''%1$s'', 101, CURRENT_DATE)
  ', _psm_input_table);
  _rcl_psm_table := 'public.rcl_psm_input_data_' || vl_unique_identifier;
  _rcl_psm_query := 'CREATE UNLOGGED TABLE ' || _rcl_psm_table || ' AS ( ' || _rcl_psm_query_f || ' );';
  RAISE NOTICE '_rcl_psm_query: %', _rcl_psm_query;
  EXECUTE 'DROP TABLE IF EXISTS ' || _rcl_psm_table ||' CASCADE; ';
  EXECUTE _rcl_psm_query;
  _rcl_const_table := 'public.rcl_constraint_input_data_' || vl_unique_identifier;
  _rcl_const_query_f := format('CREATE UNLOGGED TABLE %1$s AS (
    SELECT distinct psm.product_code, psm.store_code, paf.article %4$s FROM %2$s psm 
    JOIN 
      global.product_attributes_filter paf USING (product_code) 
    JOIN
      global.product_store_attributes_filter psaf 
      ON psm.store_code=psaf.store_code %3$s
    );',
    _rcl_const_table, _rcl_psm_table, _rcl_const_join_query, _rcl_select_column);
  -- _rcl_const_query := format('CREATE TEMP TABLE constraints_resolved_data_%2$s AS (
  --   SELECT * FROM inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, CURRENT_DATE)
  -- )', _rcl_const_table, vl_unique_identifier);
  -- RAISE NOTICE ' constraints resolution query: % ', _rcl_const_query;
  EXECUTE format('DROP TABLE IF EXISTS %1$s CASCADE;', _rcl_const_table);
  EXECUTE _rcl_const_query_f;
  -- EXECUTE format('DROP TABLE IF EXISTS constraints_resolved_data_%1$s', vl_unique_identifier);
  -- EXECUTE _rcl_const_query;

  execute format('drop table if exists prod_data_%1$s cascade;', vl_unique_identifier);
  _temp_query := format('create unlogged table prod_data_%1$s as (select distinct(product_code) as product_code from  %2$s);',vl_unique_identifier, _rcl_const_table);
  raise notice ' prod data query %', _temp_query;
  execute _temp_query;

	execute format('drop table if exists %1$s cascade', ph_configuration_mapping);
   _temp_query := format (
					'create temp table %1$s as (
									select array_agg(resolved_data.product_code) as product_codes,
											max(resolved_data.default_store_groups) as default_store_groups,
											max(resolved_data.default_product_profile) as default_product_profile,
											max(resolved_data.default_store_groups) as default_store_groups_selected,
											max(dc_store_rule) as dc_store_rule,
											psaf.article, psaf.ph_code
                                            from
									(
										select * from inventory_smart.generate_rcl_dc_store_policy(''prod_data_%2$s'', 10003, current_date)
                                    ) resolved_data
									join
									(
										select unnest(product_codes) as product_code,
											article, ph_code
										from inventory_smart.ph_master
									) psaf
									using (product_code)
									group by psaf.article, psaf.ph_code
								);',
					ph_configuration_mapping, vl_unique_identifier
				);

raise notice 'ph  configuration data query : %', _temp_query;
execute _temp_query;

  execute format('drop table if exists constraints_resolved_data_v_%1$s', vl_unique_identifier);
				_rcl_input_query := format('create temp table constraints_resolved_data_v_%2$s as (
					select * from inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, current_date)
				)', _rcl_const_table, vl_unique_identifier);

  execute _rcl_input_query;

  execute format('drop table if exists constraints_resolved_data_%1$s', vl_unique_identifier);
                execute format('select count(1) from constraints_resolved_data_v_%1$s where min_distribution is not null', vl_unique_identifier) into _count_check;

                if (_count_check > 0) then 
                 _rcl_input_query := format('create temp table constraints_resolved_data_%2$s as (
                   select * from inventory_smart.calculate_min_strategy(''%1$s'',''constraints_resolved_data_v_%2$s'')
                     )', ph_configuration_mapping, vl_unique_identifier);
                else 
                 _rcl_input_query := format('create temp table constraints_resolved_data_%1$s as (
                    select * from constraints_resolved_data_v_%1$s
                      )', vl_unique_identifier);
                end if;
  
   execute _rcl_input_query;

  RETURN QUERY EXECUTE format($$
   	WITH input_table AS (
    SELECT
        jsonb_array_elements_text(value->'upc') AS product_code,
        (value->>'setall_min_stock')::INTEGER AS setall_min_stock,
        (value->>'setall_max_stock')::INTEGER AS setall_max_stock,
        (value->>'setall_wos')::INTEGER AS setall_wos
    FROM
        jsonb_array_elements('%3$s') value
	),
	article_list as(
		select 
			article,
			AVG(setall_min_stock) as setall_min_stock,
			AVG(setall_max_stock) as setall_max_stock,
			AVG(setall_wos) as setall_wos
		from input_table it 
		join "global".product_attributes_filter paf ON paf.product_code = it.product_code
		group by article
	)
	SELECT 
    	paf.article::text, 
    	CAST(SUM(cs.aps) AS INTEGER) AS aps, 
    	CAST(COALESCE(
            (SELECT al.setall_wos FROM article_list al WHERE al.article = paf.article),
            ROUND(AVG(cs.wos))) AS INTEGER) AS wos,
    	CAST(COALESCE(
            (SELECT al.setall_min_stock FROM article_list al WHERE al.article = paf.article),
            ROUND(AVG(cs.min_stock))) AS INTEGER) AS min_stock,
    	CAST(COALESCE(
            (SELECT al.setall_max_stock FROM article_list al WHERE al.article = paf.article),
            ROUND(AVG(cs.max_stock))) AS INTEGER) AS max_stock,
		  CAST(COALESCE(
            (SELECT al.setall_max_stock FROM article_list al WHERE al.article = paf.article),
            ROUND(MIN(cs.max_stock))) AS INTEGER) AS min_stock_validator,
		  CAST(COALESCE(
            (SELECT al.setall_min_stock FROM article_list al WHERE al.article = paf.article),
            ROUND(MAX(cs.min_stock))) AS INTEGER) AS max_stock_validator
	FROM constraints_resolved_data_%1$s cs
	JOIN (
    	SELECT product_code, article 
    	FROM %2$s
	) paf 
	ON paf.product_code = cs.product_code
	GROUP BY paf.article
  $$, vl_unique_identifier, _psm_input_table, input); 
END
$function$
;