-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:special_characters_mapping stripComments:false splitStatements:false context:MTP-83463 labels:MTP-83463 
-- comment: initial changeset for special_characters_mapping

CREATE TABLE global.special_characters_mapping (
    special_character varchar(50) NOT NULL PRIMARY KEY,
    replace_character varchar(20) NULL
);