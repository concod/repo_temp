--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_copy_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_copy_event

DROP FUNCTION if exists price_promo.fn_copy_event;

CREATE OR REPLACE FUNCTION price_promo.fn_copy_event(
    p_event_id integer,
    p_new_event_name text,
    p_new_start_date date,
    p_new_end_date date,
    p_submit_offers_by_date date,
    p_user_id integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    _event_id INTEGER;
    _em_cols  TEXT;
    _em_vals  TEXT;
    _em_sql   TEXT;
    _query    TEXT;
    table_name TEXT;
    columns_data   TEXT;
    columns_full TEXT;
    select_stmt TEXT;
    sql_stmt TEXT;

    -- All simple tables to be copied
    table_list TEXT[] := ARRAY[
        'event_attribute_mapping',
        'event_date_restrictions',
        'included_event_product_hierarchy',
        'included_event_product_groups',
        'excluded_event_product_groups',
        'event_product_hierarchy',
        'included_event_store_hierarchy',
        'included_event_store_groups',
        'event_store_sg_hierarchy',
        'tb_event_customer_hierarchy',
        'tb_event_customers',
        'event_store_hierarchy' 
    ];

    -- All partitioned tables to be created/copied
    partitioned_event_tables TEXT[] := ARRAY[
        'included_event_stores',
        'included_event_products',
        'event_product',
        'event_stores'
    ];
BEGIN
    -- Insert into event_master and get the new event_id
    SELECT price_promo.fn_get_table_columns(
        'price_promo','event_master', ARRAY['event_id']
    ) INTO _em_cols;

    _em_vals := price_promo.fn_replace_values(
        _em_cols,
        jsonb_build_object(
            'name',       quote_literal(p_new_event_name),
            'start_date', quote_literal(p_new_start_date::text),
            'end_date',   quote_literal(p_new_end_date::text),
            'submit_by',  quote_literal(p_submit_offers_by_date::text),
            'created_by', p_user_id::text,
            'created_at', 'NOW() AS created_at',
            'is_locked', 'false',
            'status', '1'
        )
    );

    _em_sql := format($SQL$
        INSERT INTO price_promo.event_master(%1$s)
        SELECT %2$s
        FROM price_promo.event_master
        WHERE event_id = %3$L
        RETURNING event_id
    $SQL$, _em_cols, _em_vals, p_event_id);

    EXECUTE _em_sql INTO _event_id;
    RAISE NOTICE 'inserted event id: %', _event_id;

    -- Loop through simple tables and clone rows 
    FOREACH table_name IN ARRAY table_list LOOP
        SELECT price_promo.fn_get_table_columns('price_promo', table_name, NULL)
        INTO columns_data;

        columns_full := columns_data;
        select_stmt := regexp_replace(columns_data, 'event_id', format('%1$L AS event_id', _event_id), '');


        sql_stmt := format(
            'INSERT INTO price_promo.%1$I (%2$s) SELECT %3$s FROM price_promo.%1$I WHERE event_id = %4$L ON CONFLICT DO NOTHING',
            table_name, columns_full, select_stmt, p_event_id
        );


        RAISE NOTICE '%', sql_stmt;
        EXECUTE sql_stmt;
    END LOOP;

    -- First: create all partitions
    FOREACH table_name IN ARRAY partitioned_event_tables LOOP
        _query := format(
            'CREATE TABLE IF NOT EXISTS price_promo.%1$I_%2$s PARTITION OF price_promo.%1$I FOR VALUES IN (%2$s)',
            table_name,
            _event_id
        );
        RAISE NOTICE 'Creating partition: %', _query;
        EXECUTE _query;
    END LOOP;

    -- Then: insert data into all partitions
    FOREACH table_name IN ARRAY partitioned_event_tables LOOP
        SELECT price_promo.fn_get_table_columns(
            'price_promo',
            table_name || '_' || p_event_id,
            ARRAY['event_id']
        ) INTO columns_data;

        IF to_regclass(format('price_promo.%1$I_%2$s', table_name, p_event_id)) IS NOT NULL THEN
            sql_stmt := format(
                'INSERT INTO price_promo.%1$I_%2$s (event_id, %3$s)
                 SELECT %2$s, %3$s
                   FROM price_promo.%1$I_%4$s
                  WHERE event_id = %4$s',
                table_name,
                _event_id,
                columns_data,
                p_event_id
            );
            RAISE NOTICE 'Inserting into partition: %', sql_stmt;
            EXECUTE sql_stmt;
        END IF;
    END LOOP;

    perform price_promo.fn_save_event_final_hierarchy(_event_id,p_user_id);
    perform price_promo.fn_save_event_final_products(_event_id,p_user_id);
    perform price_promo.fn_save_event_final_store_hierarchy(_event_id, p_user_id);
    perform price_promo.fn_save_event_final_stores(_event_id, p_user_id);

    RETURN _event_id;

END;
$function$;