export const INPUT_VALIDATION_REGEX = /^(?!\s*$)[a-zA-Z0-9 @ _-]+$/;
export const INPUT_VALIDATION_WARNING = "Only alphanumeric, underscores (_), and dashes (-) are allowed."
export const INPUT_WITH_SPECIAL_CHARACTERS_REGEX = /^(?!\s*$)[a-zA-Z0-9 @_\-.,()%$#!"/\\~*&{}+\`;:'?=]+$/;
export const INPUT_WITH_SPECIAL_CHARACTERS_WARNING = `The following special characters are not allowed: [[ ]] ^ | \\ < >`
