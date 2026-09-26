--liquibase formatted sql
    --changeset rohankumar.sinha:tb_applicable_mkd_price_points_base_version stripComments:false splitStatements:false context:tb_applicable_mkd_price_points_base_version
    --comment: initial changeset for tb_applicable_mkd_price_points_base_version  


CREATE TABLE price_markdown.tb_applicable_mkd_price_points_base_version (
	version_code int4 NOT NULL,
	stat_id int4 NOT NULL,
	currency_id int4 NOT NULL,
	country_id int4 NOT NULL,
	currency_value float4 NULL,
	CONSTRAINT tb_tb_applicable_mkd_price_points_base_pk PRIMARY KEY (version_code, stat_id, currency_id, country_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX marksmart_currency_country_mapping_id_idx ON price_markdown.tb_applicable_mkd_price_points_base_version USING btree (version_code, stat_id, currency_id, country_id);