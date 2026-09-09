module.exports = grammar({
    name: "amber",

    extras: $ => [$.comment, /\s/],

    conflicts: $ => [
        [$.array, $.subscript],
    ],

    rules: {
        source_file: $ => repeat($._global_statement),

        _global_statement: $ => seq(choice(
            $.import_statement,
            $.function_definition,
            $.main_block,
            $.test_block,
            $._statement
        ), optional(";")),

        _statement: $ => prec.left(seq(choice(
            $.function_control_flow,
            $.if_cond,
            $.if_chain,
            $.loop_infinite,
            $.for_loop,
            $.while_loop,
            $.loop_control_flow,
            $.variable_init,
            $.variable_assignment,
            $.shebang,
            $.builtin_stmt,
            $.mv_stmt,
            $._expression
        ), optional(";"))),

        _brace_block: $ => seq("{", repeat($._statement), "}"),
        block: $ => choice(
            $._brace_block,
            seq(":", choice($._statement, $._brace_block))
        ),

        main_block: $ => seq(
            "main",
            optional(seq("(", $.variable, ")")),
            $.block
        ),

        test_block: $ => seq("test", optional($.string), $.block),

        builtin_stmt: $ => choice(
            prec.right(seq("cd", $._expression, optional($.handler))),
            seq(choice("echo", "exit"), $._expression)
        ),

        mv_stmt: $ => prec.right(seq(
            "mv",
            choice($.parameter_list, seq($._expression, optional(","), $._expression)),
            optional($.handler)
        )),

        reference: $ => "ref",
        function_parameter_list_item: $ => prec.left(seq(
            optional($.reference),
            $.variable,
            optional(seq(
                ":",
                $.type_name
            )),
            optional(seq(
                "=",
                $._expression
            ))
        )),

        function_parameter_list: $ => seq(
            "(",
            optional(
                seq(
                    $.function_parameter_list_item,
                    repeat(
                        seq(
                            ",",
                            $.function_parameter_list_item
                        )
                    ),
                    optional(",")
                )
            ),
            ")"
        ),

        preprocessor_directive: $ => /\#\[[^]\s]+]/,
        shebang: $ => /\#\!.*/,

        function_definition: $ => seq(
            optional($.preprocessor_directive),
            optional("pub"),
            "fun",
            field("name", $.variable),
            field("parameters", $.function_parameter_list),
            optional(seq(":", $.type_name)),
            field("body", $.block),
        ),

        function_control_flow: $ => seq(choice("return", "fail"), $._expression),

        import_item: $ => seq($.variable, optional(seq("as", $.variable))),
        import_statement: $ => seq(
            optional("pub"),
            "import",
            choice(
                seq(
                    "{",
                    optional(seq($.import_item, repeat(seq(",", $.import_item)), optional(","))),
                    "}",
                    "from",
                    $.string,
                ),
                seq("*", "from", $.string),
            ),
        ),

        parameter_list: $ => seq(
            "(",
            optional(seq($._expression, repeat(seq(",", $._expression)), optional(","))),
            ")",
        ),

        range: $ => prec.left(4, seq($._expression, choice("..", "..="), $._expression)),
        subscript: $ => seq("[", $._expression, "]"),
        subscript_expression: $ => prec(5, seq($._expression, $.subscript)),

        variable_init: $ => seq(optional("pub"), choice("const", "let"), $.variable_assignment),
        variable_assignment: $ => prec(3, seq(
            $.variable, optional($.subscript),
            choice("=", "+=", "-=", "*=", "/=", "%="),
            $._expression
        )),
        parentheses: $ => prec.left(1, seq("(", $._expression, ")")),

        if_cond: $ => prec.left(seq("if", $._expression, $.block, optional(seq("else", $.block)))),
        if_chain: $ => seq("if", "{", optional(repeat(seq($._expression, $.block))), optional(seq("else", $.block)), "}"),
        if_ternary: $ => prec.left(1, seq($._expression, "then", $._expression, "else", $._expression)),

        loop_infinite: $ => seq("loop", $.block),
        for_loop: $ => seq("for", $.variable, optional(seq(",", $.variable)), "in", $._expression, $.block),
        while_loop: $ => seq("while", $._expression, $.block),
        loop_control_flow: $ => choice("break", "continue"),

        boolean: $ => token(choice("true", "false")),
        null: $ => token("null"),
        number: $ => token(seq(optional(/[-+]/), /\d+(\.\d+)?/)),
        type_name_symbol: $ => choice("Text", "Num", "Int", "Bool", "Null"),
        type_name: $ => prec.left(seq(choice(
            $.type_name_symbol,
            seq("[", $.type_name_symbol, "]")
        ), optional("?"))),
        status: $ => prec.right(seq(token("status"), optional(seq("(", ")")))),
        array: $ => seq("[", optional(seq($._expression, repeat(seq(",", $._expression)), optional(","))), "]"),

        function_call: $ => prec.right(2, seq(
            field("name", $.variable),
            seq($.parameter_list, optional($.handler)),
        )),

        builtin_expr: $ => prec(3, seq(choice('len', 'lines'), $.parameter_list)),

        unop: $ => prec(3, choice(
            seq('-', $._expression),
            seq('not', $._expression),
            seq('unsafe', $._expression),
            seq('trust', $._expression),
            seq('silent', $._expression),
            seq('sudo', $._expression),
            seq('nameof', $._expression),
            seq('len', $._expression),
            seq('lines', $._expression),
        )),

        binop: $ => choice(
            prec.left(2, seq($._expression, '*', $._expression)),
            prec.left(2, seq($._expression, '/', $._expression)),
            prec.left(1, seq($._expression, '+', $._expression)),
            prec.left(1, seq($._expression, '-', $._expression)),
            prec.left(1, seq($._expression, '%', $._expression)),
            prec.left(1, seq($._expression, '>', $._expression)),
            prec.left(1, seq($._expression, '<', $._expression)),
            prec.left(1, seq($._expression, '>=', $._expression)),
            prec.left(1, seq($._expression, '<=', $._expression)),
            prec.left(1, seq($._expression, '==', $._expression)),
            prec.left(1, seq($._expression, '!=', $._expression)),
        ),

        keyword_binop: $ => choice(
            prec.left(2, seq($._expression, 'and', $._expression)),
            prec.left(2, seq($._expression, 'or', $._expression)),
            prec.left(1, seq($._expression, 'is', $.type_name)),
            prec.left(1, seq($._expression, 'as', $.type_name)),
        ),

        variable: $ => /\w+/,

        string_content: $ => token.immediate(prec(2, /[^\\"{]+/)),
        string: $ => seq(
            '"',
            repeat(
                choice(
                    $.escape_sequence,
                    $.interpolation,
                    $.string_content
                ),
            ),
            '"',
        ),

        handler_failed: $ => seq("failed", optional($.parameter_list), $.block),
        handler_succeeded: $ => seq("succeeded", $.block),
        handler_exited: $ => seq("exited", $.parameter_list, $.block),
        handler_propagation: $ => token("?"),
        handler: $ => choice(
            $.handler_failed,
            $.handler_succeeded,
            $.handler_exited,
            $.handler_propagation
        ),

        escape_sequence: $ => token(seq("\\", optional(/./))),
        interpolation: $ => prec(2, seq("{", $._expression, "}")),
        command_content: $ => token.immediate(prec(2, /[^\\${-]+/)),
        command: $ => prec.right(seq(
            "$",
            repeat(
                choice(
                    $.escape_sequence,
                    $.command_option,
                    $.interpolation,
                    $.command_content,
                ),
            ),
            "$",
            optional($.handler)
        )),
        command_modifier_block: $ => seq(
            repeat1(
                choice(
                    "silent",
                    "trust",
                    "sudo",
                )
            ),
            $.block
        ),

        command_option: $ => token(seq(/-{1,2}/, optional(/[A-Za-z0-9-_]+/))),
        comment: $ => token(seq("//", /.*/)),
        _expression: $ => choice(
            $.boolean,
            $.null,
            $.number,
            $.function_call,
            $.if_ternary,
            $.status,
            $.parentheses,
            $.builtin_expr,
            $.unop,
            $.binop,
            $.keyword_binop,
            $.subscript_expression,
            $.range,
            $.command,
            $.command_modifier_block,
            $.array,
            $.string,
            $.variable,
        ),
    },
});
