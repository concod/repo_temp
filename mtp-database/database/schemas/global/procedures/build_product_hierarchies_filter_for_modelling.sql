--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:build_product_hierarchies_filter_for_modelling runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:build_product_hierarchies_filter_for_modelling
--comment: optimized the sp with reclass fix
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_product_hierarchies_filter_for_modelling(levels text[], run_type varchar);
CREATE OR REPLACE PROCEDURE global.build_product_hierarchies_filter_for_modelling(IN levels text[], IN run_type character varying DEFAULT 'non-periodic'::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_product_hierarchies_filter_for_modelling';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _hier text;
    _levels_in_order text[];
    _query_holder text;
    _temp_table_query text;
    _hier_t text;
    _null_value_holder_for_col text[];
    _actual_value_holder_for_col text[]; 
    _flag_to_switch_to_null bool = false;
    _query_at_each_level text[];
    _level_indicator int2;
    _sub_level_query_holder text[];
    _seperator_holder varchar;
   
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    drop table if exists phf_modeling;
    -- create a array with the hierarchies in order
    if array_length(levels, 1) > 0 then 
    for _hier in 
        select generic_column_name
        from global.product_generic_schema_mapping
        where generic_column_name = any(levels)
        order by hierarchy_level
    loop
        _levels_in_order := array_append(_levels_in_order, _hier) ;
    end loop;
    
    -- If the run is non-periodic type then create the hierarchies table
    if run_type = 'non-periodic' then 
        
        -- drop the table if already exists
        raise notice 'dropping the existing table'; 
        drop table if exists "global".product_hierarchy_codes_for_modelling;
        
        -- create the schema of the table you upsert into
        _query_holder = '
            create table "global".product_hierarchy_codes_for_modelling(
                hierarchy_code serial primary key,'||
                array_to_string(_levels_in_order, ' varchar, ') || ' varchar, ' ||
                'level int2 not null,
                active bool default true,
                created_at timestamp default now(),
                updated_at timestamp default now()
            );  
        ';
        
        raise notice 'Create the table :  %', _query_holder;
        execute _query_holder;
        
        -- Add constraint and index for using upserting
        
        -- --  add the unique level constraint
        _query_holder = '
            ALTER TABLE "global".product_hierarchy_codes_for_modelling
            ADD CONSTRAINT unique_at_level UNIQUE (' || array_to_string(_levels_in_order, ' , ') || ');';
        
        raise notice 'constraint 1 : %', _query_holder;
        execute _query_holder;
        
        -- --  create a unique level index(this is so that nulls are considered equals)
        _query_holder = '
            CREATE UNIQUE INDEX unique_at_level_index
            ON "global".product_hierarchy_codes_for_modelling' ||
            '(COALESCE(' || array_to_string(_levels_in_order, ', ''''),COALESCE(') || ', ''''));';
        raise notice 'constraint 2 : %', _query_holder;
        execute _query_holder;
        
    end if;
    
    -- Run the upsert operation on the table from product_validated table
    -- --  update the active flag to be false initially  
--  _query_holder = '
--      update  "global".product_hierarchy_codes_for_modelling
--      set active= false
--      where 1=1;  
--  ';
    --raise notice 'Updating the active flag to false before upserting : %', _query_holder;
    --execute _query_holder;
    
    -- -- perform upsert operations
    _level_indicator = 1;
    foreach _hier in array _levels_in_order
    loop
        
        foreach _hier_t in array _levels_in_order
        loop
            
            if _flag_to_switch_to_null = false then
                _actual_value_holder_for_col := array_append(_actual_value_holder_for_col, _hier_t);
            end if;
            if _flag_to_switch_to_null = true then
                _null_value_holder_for_col := array_append(_null_value_holder_for_col, 'null' || ' as ' || _hier_t);
            end if;
            -- switch the flag to make the following columns as null(as those column are not accounted for in this level)
            if _hier_t = _hier then
                _flag_to_switch_to_null = true;
            end if;
                
            
        end loop;
         
        if array_length(_null_value_holder_for_col,1) is NULL then
            _seperator_holder = '';
        else
            _seperator_holder = ' , ';
        end if;
            
        _query_holder = '
            select *,' ||
                array_to_string(_null_value_holder_for_col, ', ') || _seperator_holder ||
                _level_indicator::varchar || ' as level, ' ||
                'true as active
            from 
                (
                select '||
                    array_to_string(_actual_value_holder_for_col, ' ,') ||
                ' from 
                    public.product_validated_table a
				left join  
					(select '|| _actual_value_holder_for_col[array_length(_actual_value_holder_for_col,1)] ||' as p_key
						from "global".product_hierarchy_codes_for_modelling where level ='|| _level_indicator::varchar || ' group by 1 ) b
						on '|| _actual_value_holder_for_col[array_length(_actual_value_holder_for_col,1)] ||' = p_key
				where p_key is null
                group by ' ||
                    array_to_string(_actual_value_holder_for_col, ' , ')||
                ' ) as l' || _level_indicator::varchar;
        _sub_level_query_holder = array_append(_sub_level_query_holder, _query_holder);
        
        _flag_to_switch_to_null = false;
        _actual_value_holder_for_col = '{}';
        _null_value_holder_for_col = '{}';
        _level_indicator = _level_indicator+1;
        
    end loop;
    
    -- generate the final query
    _temp_table_query = 'create temp table phf_modeling as (' || array_to_string(_sub_level_query_holder, ' union all ') || ')';
    raise notice 'Running the create temp table query : %', _temp_table_query;
    execute _temp_table_query;
    _query_holder = '
        insert into "global".product_hierarchy_codes_for_modelling
        ('|| array_to_string(_levels_in_order, ' , ')|| ', level, active)' ||
        '(select '|| array_to_string(_levels_in_order, ' , ')|| ', level, active ' || 'from phf_modeling)' ||
        ' on conflict (COALESCE(' || array_to_string(_levels_in_order, ', ''''),COALESCE(') || ', ''''))'||
        ' do NOTHING;
    ';
    
    raise notice 'Running the upsert query : %', _query_holder;
    execute _query_holder;
    
else 
for _hier in 
        select generic_column_name
        from global.product_generic_schema_mapping
        where hierarchy_level is not null
        order by hierarchy_level
    loop
        _levels_in_order := array_append(_levels_in_order, _hier) ;
    end loop;
    
    -- If the run is non-periodic type then create the hierarchies table
    if run_type = 'non-periodic' then 
        
        -- drop the table if already exists
        raise notice 'dropping the existing table'; 
        drop table if exists "global".product_hierarchy_codes_for_modelling;
        
        -- create the schema of the table you upsert into
        _query_holder = '
            create table "global".product_hierarchy_codes_for_modelling(
                hierarchy_code serial primary key,'||
                array_to_string(_levels_in_order, ' varchar, ') || ' varchar, ' ||
                'level int2 not null,
                active bool default true,
                created_at timestamp default now(),
                updated_at timestamp default now()
            );  
        ';
        
        raise notice 'Create the table :  %', _query_holder;
        execute _query_holder;
        
        -- Add constraint and index for using upserting
        
        -- --  add the unique level constraint
        _query_holder = '
            ALTER TABLE "global".product_hierarchy_codes_for_modelling
            ADD CONSTRAINT unique_at_level UNIQUE (' || array_to_string(_levels_in_order, ' , ') || ');';
        
        raise notice 'constraint 1 : %', _query_holder;
        execute _query_holder;
        
        -- --  create a unique level index(this is so that nulls are considered equals)
        _query_holder = '
            CREATE UNIQUE INDEX unique_at_level_index
            ON "global".product_hierarchy_codes_for_modelling' ||
            '(COALESCE(' || array_to_string(_levels_in_order, ', ''''),COALESCE(') || ', ''''));';
        raise notice 'constraint 2 : %', _query_holder;
        execute _query_holder;
        
    end if;
    
    -- Run the upsert operation on the table from product_validated table
    -- --  update the active flag to be false initially  
--  _query_holder = '
--      update  "global".product_hierarchy_codes_for_modelling
--      set active= false
--      where 1=1;  
--  ';
    --raise notice 'Updating the active flag to false before upserting : %', _query_holder;
    --execute _query_holder;
    
    -- -- perform upsert operations
    _level_indicator = 1;
    foreach _hier in array _levels_in_order
    loop
        
        foreach _hier_t in array _levels_in_order
        loop
            
            if _flag_to_switch_to_null = false then
                _actual_value_holder_for_col := array_append(_actual_value_holder_for_col, _hier_t);
            end if;
            if _flag_to_switch_to_null = true then
                _null_value_holder_for_col := array_append(_null_value_holder_for_col, 'null' || ' as ' || _hier_t);
            end if;
            -- switch the flag to make the following columns as null(as those column are not accounted for in this level)
            if _hier_t = _hier then
                _flag_to_switch_to_null = true;
            end if;
                
            
        end loop;
         
        if array_length(_null_value_holder_for_col,1) is NULL then
            _seperator_holder = '';
        else
            _seperator_holder = ' , ';
        end if;
            
        _query_holder = '
            select *,' ||
                array_to_string(_null_value_holder_for_col, ', ') || _seperator_holder ||
                _level_indicator::varchar || ' as level, ' ||
                'true as active
            from 
                (
                select '||
                    array_to_string(_actual_value_holder_for_col, ' ,') ||
                ' from 
                    public.product_validated_table a
				left join  
					(select '|| _actual_value_holder_for_col[array_length(_actual_value_holder_for_col,1)] ||' as p_key
						from "global".product_hierarchy_codes_for_modelling where level ='|| _level_indicator::varchar || ' group by 1 ) b
						on '|| _actual_value_holder_for_col[array_length(_actual_value_holder_for_col,1)] ||' = p_key
						where p_key is null
                group by ' ||
                    array_to_string(_actual_value_holder_for_col, ' , ')||
                ' ) as l' || _level_indicator::varchar;
        _sub_level_query_holder = array_append(_sub_level_query_holder, _query_holder);
        
        _flag_to_switch_to_null = false;
        _actual_value_holder_for_col = '{}';
        _null_value_holder_for_col = '{}';
        _level_indicator = _level_indicator+1;
        
    end loop;
    
    -- generate the final query
    _temp_table_query = 'create temp table phf_modeling as (' || array_to_string(_sub_level_query_holder, ' union all ') || ')';
    raise notice 'Running the create temp table query : %', _temp_table_query;
    execute _temp_table_query;
    _query_holder = '
        insert into "global".product_hierarchy_codes_for_modelling
        ('|| array_to_string(_levels_in_order, ' , ')|| ', level, active)' ||
        '(select '|| array_to_string(_levels_in_order, ' , ')|| ', level, active ' || 'from phf_modeling)' ||
        ' on conflict (COALESCE(' || array_to_string(_levels_in_order, ', ''''),COALESCE(') || ', ''''))'||
        ' do NOTHING;
    ';
    
    raise notice 'Running the upsert query : %', _query_holder;
    execute _query_holder;
end if ;
    
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;
