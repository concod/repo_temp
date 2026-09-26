--liquibase formatted sql
--changeset dishaa:special_character_formatting stripComments:false splitStatements:false context:Release_1_0 labels:MTP-130065
--comment: Create mapping table for special character encoding/decoding (__ia_char_XX patterns)
CREATE TABLE IF NOT EXISTS global.special_character_formatting (
    char_id serial NOT NULL,
    encoded_value character varying NOT NULL,
    decoded_value character varying NOT NULL,
    CONSTRAINT special_character_formatting_pk PRIMARY KEY (char_id),
    CONSTRAINT special_character_formatting_encoded_uk UNIQUE (encoded_value)
);