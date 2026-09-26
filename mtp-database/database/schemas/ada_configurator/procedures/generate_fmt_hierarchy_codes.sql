--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:generate_fmt_hierarchy_codes2 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:generate_fmt_hierarchy_codes
--comment: optimized the sp with reclass fix
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS ada_configurator.generate_fmt_hierarchy_codes(varchar, _text, varchar);

CREATE OR REPLACE PROCEDURE ada_configurator.generate_fmt_hierarchy_codes(IN entity character varying, IN levels text[], IN run_type character varying DEFAULT 'non-periodic'::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _hier text;
    _levels_in_order text[];
    _all_levels text[];
    _query_holder text;
    _temp_table_query text;
    _hier_t text;
    _null_value_holder_for_col text[];
    _actual_value_holder_for_col text[]; 
    _flag_to_switch_to_null bool = false;
    _exists int4;
   _count int4;
    _query_at_each_level text[];
    _level_indicator int2;
    _sub_level_query_holder text[];
    _seperator_holder varchar;
    _generic_schema_mapping varchar := $1 || '_generic_schema_mapping';
    _hierarchy_codes_for_modelling varchar := $1 || '_hierarchy_codes_for_modelling' ;
    _hierarchy_path_table varchar := $1 || '_hierarchy_path_to_level_mapping' ;
    _validated_table varchar:= $1 || '_validated_table';
   	i INT;
    _level_subset TEXT;
   
begin
    drop table if exists phf_modeling;
    -- create a array with the hierarchies in order
    for _hier in 
        execute('select generic_column_name
        from global.' || _generic_schema_mapping ||
        ' where hierarchy_level is not null
        order by hierarchy_level')
    loop
        _all_levels := array_append(_all_levels, _hier) ;
    end loop;
   _levels_in_order := $2;
   raise notice '%', _levels_in_order;
    
    -- If the run is non-periodic type then create the hierarchies table
--    if run_type = 'non-periodic' then 
    execute ('SELECT count(*) FROM ada_configurator.' ||_hierarchy_path_table) into _count;
    raise notice '%', _count;
   
   if _count=0 THEN
  
        -- drop the table if already exists
        raise notice 'dropping the existing table'; 
        execute('drop table if exists "ada_configurator".' || _hierarchy_codes_for_modelling);
        
        -- create the schema of the table you upsert into
        _query_holder = '
            create table "ada_configurator".' || _hierarchy_codes_for_modelling || ' (
                hierarchy_code serial primary key,'||
                array_to_string(_all_levels, ' varchar, ') || ' varchar, ' ||
                'level int2 not null,
                active bool default true,
                created_at timestamp default now(),
                updated_at timestamp default now()
            );  
        ';
        
        raise notice 'Create the table :  %', _query_holder;
       execute _query_holder;
      _query_holder = '
            ALTER TABLE "ada_configurator".' || _hierarchy_codes_for_modelling || '
             ADD CONSTRAINT unique_at_' || $1 || '_level UNIQUE (' || array_to_string(_all_levels, ' , ') || ');';
        
        raise notice 'constraint 1 : %', _query_holder;
        execute _query_holder;
        
        -- --  create a unique level index(this is so that nulls are considered equals)
        _query_holder = '
            CREATE UNIQUE INDEX unique_at_' || $1 || '_level_index
            ON "ada_configurator".' || _hierarchy_codes_for_modelling ||
            ' (COALESCE(' || array_to_string(_all_levels, ', ''''),COALESCE(') || ', ''''));';
        raise notice 'constraint 2 : %', _query_holder;
        execute _query_holder;
        
        -- Add constraint and index for using upserting
      --      FOR i IN 1..array_length(_all_levels, 1) LOOP
--        -- Generate constraint for each subset of levels
--        _level_subset := array_to_string(_all_levels[1:i], ', ');
--
--        -- Dynamically build the query to add unique constraints for each subset of levels
--        _query_holder := '
--            ALTER TABLE "ada_configurator".' || _hierarchy_codes_for_modelling || '
--            ADD CONSTRAINT unique_at_' || i ||'_' || $1 || '_level UNIQUE (' || _level_subset || ');';
--        raise notice '% unqiue constraint %',i,_query_holder;
--        -- Execute the query to add the constraint
--        EXECUTE _query_holder;
--      END LOOP;
        
        -- --  add the unique level constraint
--    
--       FOR i IN 1..array_length(_all_levels, 1)
--		LOOP
--		    -- Create unique index dynamically for each level
--		    _query_holder := '
--		    CREATE UNIQUE INDEX unique_at_' || i || '_' || $1 || '_level_index
--		    ON "ada_configurator".' || quote_ident(_hierarchy_codes_for_modelling) || ' (
--		        ' || 
--		        array_to_string(ARRAY(
--		            SELECT 'COALESCE(' || level_column || ', '''')'
--		            FROM unnest(_all_levels[1:i]) AS level_column
--		        ), ', ') || 
--		        ');';
--		
--		    -- Execute the query
--		    EXECUTE _query_holder;
--		END LOOP;
--        
    end if;
           
    
    -- -- perform upsert operations
    

		  FOREACH _hier IN ARRAY _levels_in_order
		    LOOP
		        -- Append the current level to _actual_value_holder_for_col
		        _actual_value_holder_for_col := array_append(_actual_value_holder_for_col, _hier);
		        
		        -- Compute _null_value_holder_for_col based on the current state of _actual_value_holder_for_col
				 _null_value_holder_for_col := ARRAY(
            SELECT 'null as ' || level
            FROM unnest(_all_levels) AS level
            WHERE level <> ALL(_actual_value_holder_for_col)
        );		
		        -- Raise notice to show the current state of the arrays
		        RAISE NOTICE '1: %', _actual_value_holder_for_col; 
		        RAISE NOTICE '2: %', _null_value_holder_for_col;  


    
       raise notice '%',       'SELECT count(*) FROM ada_configurator.' || _hierarchy_path_table || 
		    ' where hierarchy_path = ''{' || array_to_string(_actual_value_holder_for_col, ',') || '}''';
       execute ('SELECT count(*) FROM ada_configurator.' || _hierarchy_path_table || 
		    ' where hierarchy_path = ''{' || array_to_string(_actual_value_holder_for_col, ',') || '}''' ) into _exists;
       raise notice '%', _exists;
        
        IF _exists > 0 THEN
        RAISE NOTICE 'Skipping combination for: %', _hier;
        CONTINUE; -- Skip this iteration of the loop
    	END IF;
     
       execute('INSERT INTO ada_configurator.' || quote_ident(_hierarchy_path_table) || 
         ' (hierarchy_path) VALUES (ARRAY[' || array_to_string(ARRAY(SELECT '''' || elem || '''' FROM unnest(_actual_value_holder_for_col) AS elem), ', ') || '])');

       execute ('SELECT level FROM ada_configurator.' || quote_ident(_hierarchy_path_table) || 
         ' WHERE hierarchy_path = ARRAY[' || array_to_string(ARRAY(SELECT '''' || elem || '''' FROM unnest(_actual_value_holder_for_col) AS elem), ', ') || ']') 
		INTO _level_indicator;
      
	
		raise notice 'this is getting inserted %',_actual_value_holder_for_col;
		raise notice '%',_null_value_holder_for_col;
	    if _null_value_holder_for_col is null then
	      _null_value_holder_for_col = '{}';
	    end if;
	
        if array_length(_null_value_holder_for_col,1) is NULL then
            _seperator_holder = '';
        else
            _seperator_holder = ' , ';
        end if;
            
        _query_holder = '
            select ' || array_to_string(_all_levels, ', ')  || ', level , active 
			from (select *,' ||
                array_to_string(_null_value_holder_for_col, ', ') || _seperator_holder ||
                _level_indicator::varchar || ' as level, ' ||
                'true as active
            from 
                (
                select '||
                    array_to_string(_actual_value_holder_for_col, ' ,') ||
                ' from 
                    public.'|| _validated_table || ' a
				left join  
					(select '|| _actual_value_holder_for_col[array_length(_actual_value_holder_for_col,1)] ||' as p_key
						from "ada_configurator".' || _hierarchy_codes_for_modelling || ' where level ='|| _level_indicator::varchar || ' group by 1 ) b
						on '|| _actual_value_holder_for_col[array_length(_actual_value_holder_for_col,1)] ||' = p_key
				where p_key is null
                group by ' ||
                    array_to_string(_actual_value_holder_for_col, ' , ')||
                ' ) as l' || _level_indicator::varchar ||') as f' || _level_indicator::varchar;
         raise notice 'sub query  %',_query_holder;
        _sub_level_query_holder = array_append(_sub_level_query_holder, _query_holder);
        
    end loop;
    
   if array_length(_sub_level_query_holder,1)>0 then
   -- generate the final query
    _temp_table_query = 'create temp table phf_modeling as (' || array_to_string(_sub_level_query_holder, ' union all ') || ')';
    raise notice 'Running the create temp table query : %', _temp_table_query;
    execute _temp_table_query;
    _query_holder = '
        insert into "ada_configurator".' || _hierarchy_codes_for_modelling || '
         ('|| array_to_string(_all_levels, ' , ')|| ', level, active)' ||
        '(select '|| array_to_string(_all_levels, ' , ')|| ', level, active ' || 'from phf_modeling)' ||
        ' on conflict (COALESCE(' || array_to_string(_all_levels, ', ''''),COALESCE(') || ', ''''))'||
        ' do NOTHING;
    ';
    
    raise notice 'Running the upsert query : %', _query_holder;
    execute _query_holder;
    else
     
    raise notice 'all the levels are already present';
    end if;
   
end $procedure$
;

