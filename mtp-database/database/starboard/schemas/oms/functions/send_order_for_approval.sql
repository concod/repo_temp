--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:starboard_send_order_for_approval_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:starboard_oms_approval
--comment: Match BE kwargs only (no primary_vendor_name/product_type); dates + product_filter as text for psycopg2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.send_order_for_approval(
    text[], text[], text[], text[], text[], text[], text[],
    text, text, text, text, int, text[]
);
DROP FUNCTION IF EXISTS oms.send_order_for_approval(
    text[], text[], text[], text[], text[],
    text, text, text, int, text, text[]
);
DROP FUNCTION IF EXISTS oms.send_order_for_approval(
    text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], date, date, text, jsonb, int, text[]
);
DROP FUNCTION IF EXISTS oms.send_order_for_approval(
    text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], date, date, text, jsonb, int
);
DROP FUNCTION IF EXISTS oms.send_order_for_approval(
    text[], text[], text[], text[], text[], text[], text[], text[], date, date, text, jsonb, int, text[]
);
DROP FUNCTION IF EXISTS oms.send_order_for_approval(
    _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, text, jsonb, int
);
DROP FUNCTION IF EXISTS oms.send_order_for_approval(
    _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, text, jsonb, int, _text
);


CREATE OR REPLACE FUNCTION oms.send_order_for_approval(
    l1_name text[],
    l2_name text[],
    l3_name text[],
    order_type text[],
    article text[],
    start_order_placement_date text,
    end_order_placement_date text,
    order_batch_name text,
    user_id int,
    product_filter text,
    order_group_ids text[]
)
RETURNS TABLE(order_id int)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_l1_name text := '';
    v_l2_name text := '';
    v_l3_name text := '';
    v_order_type text := '';
    v_article text := '';
    v_order_placement_date text := '';
    v_user_id int := user_id;
    v_order_group_ids text := '';
    v_recommended_orders_sql text := '';
    v_sd date;
    v_ed date;
    v_trim_start text;
    v_trim_end text;
BEGIN
    v_trim_start := NULLIF(TRIM(COALESCE(start_order_placement_date, '')), '');
    v_trim_end := NULLIF(TRIM(COALESCE(end_order_placement_date, '')), '');

    IF v_trim_start IS NOT NULL THEN
        BEGIN
            v_sd := v_trim_start::date;
        EXCEPTION
            WHEN OTHERS THEN
                BEGIN
                    v_sd := to_date(v_trim_start, 'MM-DD-YYYY');
                EXCEPTION
                    WHEN OTHERS THEN
                        v_sd := to_date(v_trim_start, 'DD-MM-YYYY');
                END;
        END;
    END IF;

    IF v_trim_end IS NOT NULL THEN
        BEGIN
            v_ed := v_trim_end::date;
        EXCEPTION
            WHEN OTHERS THEN
                BEGIN
                    v_ed := to_date(v_trim_end, 'MM-DD-YYYY');
                EXCEPTION
                    WHEN OTHERS THEN
                        v_ed := to_date(v_trim_end, 'DD-MM-YYYY');
                END;
        END;
    END IF;

    IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
        v_l1_name := 'and paf.l1_name = ANY(' || quote_literal(l1_name) || ')';
    END IF;

    IF l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
        v_l2_name := 'and paf.l2_name = ANY(' || quote_literal(l2_name) || ')';
    END IF;

    IF l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
        v_l3_name := 'and paf.l3_name = ANY(' || quote_literal(l3_name) || ')';
    END IF;

    IF article IS NOT NULL AND array_length(article, 1) > 0 THEN
        v_article := 'and oor.article = ANY(' || quote_literal(article) || ')';
    END IF;

    IF v_ed IS NOT NULL AND v_sd IS NOT NULL THEN
        v_order_placement_date := 'and oor.order_placement_date between ''' || v_sd || ''' and ''' || v_ed || '''';
    END IF;

    IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
        v_order_type := 'and oor.order_type = ANY(' || quote_literal(order_type) || ')';
    END IF;

    IF order_group_ids IS NOT NULL AND array_length(order_group_ids, 1) > 0 THEN
        v_order_group_ids := 'and oor.order_group_id = ANY(' || quote_literal(order_group_ids) || ')';
    END IF;

    v_recommended_orders_sql := 'update oms.oms_orders_recommended oor
                              set order_status_id = 1, order_batch_name= ' || quote_literal(order_batch_name) || ', order_placement_date = now(), updated_by = ' || quote_nullable(v_user_id) || ', updated_at = now()
                              from "global".product_attributes_filter paf
                                where
                                paf.product_code = oor.product_code
                                and oor.order_status_id = 0
                                and COALESCE(oor.order_quantity_eaches, oor.order_quantity, 0) > 0
                                ' || v_order_placement_date || '
                                ' || v_l1_name || '
                                ' || v_l2_name || '
                                ' || v_l3_name || '
                                ' || v_order_type || '
                                ' || v_article || '
                                ' || v_order_group_ids || '
                                RETURNING oor.id';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;

    RETURN QUERY EXECUTE v_recommended_orders_sql;
END
$function$;
