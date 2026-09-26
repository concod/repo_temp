--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_prev_week_promo_new_v2308 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_prev_week_promo_new

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_prev_week_promo_new;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_prev_week_promo_new(IN _prev_prom_new text, IN _prev_prom text, IN _opt_bin_mapping text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_create_prev_week_promo_query text;
BEGIN
    _create_prev_week_promo_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE %1$s AS
        SELECT
            new_opt_level_bins AS opt_level_bins,
            event,
            offer_identifier,
            effective_opt_discount
        FROM
            %2$s
        JOIN
            %3$s
        USING (opt_level_bins)
        GROUP BY
            new_opt_level_bins, event, offer_identifier, effective_opt_discount;
    ', _prev_prom_new, _prev_prom, _opt_bin_mapping);
   raise notice 'create previous pcd new : %', _create_prev_week_promo_query;
  execute _create_prev_week_promo_query;
END $procedure$
;
