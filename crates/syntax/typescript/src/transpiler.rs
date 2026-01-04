//! Tree-sitter based TypeScript transpiler.

use thiserror::Error;
use tree_sitter::{Node, Parser, Tree};
use viwo_ir::SExpr;

#[derive(Debug, Error)]
pub enum TranspileError {
    #[error("parse error: {0}")]
    Parse(String),

    #[error("unsupported syntax: {0}")]
    Unsupported(String),

    #[error("expected {expected}, got {got}")]
    UnexpectedNode { expected: String, got: String },
}

/// Transpile TypeScript source to S-expressions.
pub fn transpile(source: &str) -> Result<SExpr, TranspileError> {
    let mut parser = Parser::new();
    let language = tree_sitter_typescript::LANGUAGE_TYPESCRIPT;
    parser
        .set_language(&language.into())
        .map_err(|err| TranspileError::Parse(err.to_string()))?;

    let tree = parser
        .parse(source, None)
        .ok_or_else(|| TranspileError::Parse("failed to parse".into()))?;

    let ctx = TranspileContext::new(source);
    ctx.transpile_program(&tree)
}

struct TranspileContext<'a> {
    source: &'a str,
}

impl<'a> TranspileContext<'a> {
    fn new(source: &'a str) -> Self {
        Self { source }
    }

    fn node_text(&self, node: Node) -> &str {
        node.utf8_text(self.source.as_bytes()).unwrap_or("")
    }

    fn transpile_program(&self, tree: &Tree) -> Result<SExpr, TranspileError> {
        let root = tree.root_node();

        if root.has_error() {
            return Err(TranspileError::Parse("syntax error in source".into()));
        }

        let mut statements = Vec::new();
        let mut cursor = root.walk();

        for child in root.children(&mut cursor) {
            if child.is_named() {
                statements.push(self.transpile_node(child)?);
            }
        }

        // If single statement, return it directly
        if statements.len() == 1 {
            Ok(statements.remove(0))
        } else {
            // Wrap multiple statements in std.seq
            Ok(SExpr::call("std.seq", statements))
        }
    }

    fn transpile_node(&self, node: Node) -> Result<SExpr, TranspileError> {
        match node.kind() {
            // Literals
            "number" => self.transpile_number(node),
            "string" => self.transpile_string(node),
            "true" => Ok(SExpr::Bool(true)),
            "false" => Ok(SExpr::Bool(false)),
            "null" => Ok(SExpr::Null),
            "undefined" => Ok(SExpr::Null),

            // Expressions
            "identifier" => Ok(SExpr::call("std.var", vec![SExpr::string(self.node_text(node))])),
            "binary_expression" => self.transpile_binary_expr(node),
            "unary_expression" => self.transpile_unary_expr(node),
            "parenthesized_expression" => self.transpile_parenthesized(node),
            "call_expression" => self.transpile_call_expr(node),
            "member_expression" => self.transpile_member_expr(node),
            "subscript_expression" => self.transpile_subscript_expr(node),
            "array" => self.transpile_array(node),
            "object" => self.transpile_object(node),
            "arrow_function" => self.transpile_arrow_function(node),
            "ternary_expression" => self.transpile_ternary(node),

            // Statements
            "expression_statement" => self.transpile_expression_statement(node),
            "lexical_declaration" => self.transpile_lexical_declaration(node),
            "variable_declaration" => self.transpile_variable_declaration(node),
            "if_statement" => self.transpile_if_statement(node),
            "return_statement" => self.transpile_return_statement(node),
            "statement_block" => self.transpile_block(node),

            // Comments (skip)
            "comment" => Ok(SExpr::Null),

            // else_clause: extract the body
            "else_clause" => self.transpile_else_clause(node),

            kind => Err(TranspileError::Unsupported(format!(
                "node type '{}': {}",
                kind,
                self.node_text(node)
            ))),
        }
    }

    fn transpile_number(&self, node: Node) -> Result<SExpr, TranspileError> {
        let text = self.node_text(node);
        let value: f64 = text
            .parse()
            .map_err(|_| TranspileError::Parse(format!("invalid number: {}", text)))?;
        Ok(SExpr::Number(value))
    }

    fn transpile_string(&self, node: Node) -> Result<SExpr, TranspileError> {
        let text = self.node_text(node);
        // Remove quotes and handle escapes
        let inner = if text.starts_with('"') || text.starts_with('\'') {
            &text[1..text.len() - 1]
        } else if text.starts_with('`') {
            // Template literal - basic support
            &text[1..text.len() - 1]
        } else {
            text
        };
        // TODO: proper escape handling
        let unescaped = inner
            .replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace("\\r", "\r")
            .replace("\\\"", "\"")
            .replace("\\'", "'")
            .replace("\\\\", "\\");
        Ok(SExpr::String(unescaped))
    }

    fn transpile_binary_expr(&self, node: Node) -> Result<SExpr, TranspileError> {
        let left = node
            .child_by_field_name("left")
            .ok_or_else(|| TranspileError::Parse("binary_expression missing left".into()))?;
        let right = node
            .child_by_field_name("right")
            .ok_or_else(|| TranspileError::Parse("binary_expression missing right".into()))?;
        let operator = node
            .child_by_field_name("operator")
            .ok_or_else(|| TranspileError::Parse("binary_expression missing operator".into()))?;

        let left_expr = self.transpile_node(left)?;
        let right_expr = self.transpile_node(right)?;
        let op_text = self.node_text(operator);

        let opcode = match op_text {
            // Arithmetic
            "+" => "math.add",
            "-" => "math.sub",
            "*" => "math.mul",
            "/" => "math.div",
            "%" => "math.mod",
            "**" => "math.pow",

            // Comparison
            "==" | "===" => "bool.eq",
            "!=" | "!==" => "bool.neq",
            "<" => "bool.lt",
            ">" => "bool.gt",
            "<=" => "bool.lte",
            ">=" => "bool.gte",

            // Logical
            "&&" => "bool.and",
            "||" => "bool.or",

            // String
            // + is handled above, but for explicit string concat we could check types

            _ => {
                return Err(TranspileError::Unsupported(format!(
                    "operator '{}'",
                    op_text
                )))
            }
        };

        Ok(SExpr::call(opcode, vec![left_expr, right_expr]))
    }

    fn transpile_unary_expr(&self, node: Node) -> Result<SExpr, TranspileError> {
        let operator = node
            .child_by_field_name("operator")
            .ok_or_else(|| TranspileError::Parse("unary_expression missing operator".into()))?;
        let argument = node
            .child_by_field_name("argument")
            .ok_or_else(|| TranspileError::Parse("unary_expression missing argument".into()))?;

        let arg_expr = self.transpile_node(argument)?;
        let op_text = self.node_text(operator);

        let opcode = match op_text {
            "!" => "bool.not",
            "-" => "math.neg",
            "+" => return Ok(arg_expr), // Unary + is a no-op
            _ => {
                return Err(TranspileError::Unsupported(format!(
                    "unary operator '{}'",
                    op_text
                )))
            }
        };

        Ok(SExpr::call(opcode, vec![arg_expr]))
    }

    fn transpile_parenthesized(&self, node: Node) -> Result<SExpr, TranspileError> {
        // Find the inner expression
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.is_named() {
                return self.transpile_node(child);
            }
        }
        Err(TranspileError::Parse(
            "empty parenthesized expression".into(),
        ))
    }

    fn transpile_call_expr(&self, node: Node) -> Result<SExpr, TranspileError> {
        let function = node
            .child_by_field_name("function")
            .ok_or_else(|| TranspileError::Parse("call_expression missing function".into()))?;
        let arguments = node
            .child_by_field_name("arguments")
            .ok_or_else(|| TranspileError::Parse("call_expression missing arguments".into()))?;

        // Get the function name/expression
        let func_name = self.get_call_name(function)?;

        // Parse arguments
        let mut args = Vec::new();
        let mut cursor = arguments.walk();
        for child in arguments.children(&mut cursor) {
            if child.is_named() {
                args.push(self.transpile_node(child)?);
            }
        }

        Ok(SExpr::call(func_name, args))
    }

    fn get_call_name(&self, node: Node) -> Result<String, TranspileError> {
        match node.kind() {
            "identifier" => Ok(self.node_text(node).to_string()),
            "member_expression" => {
                let object = node
                    .child_by_field_name("object")
                    .ok_or_else(|| TranspileError::Parse("member_expression missing object".into()))?;
                let property = node
                    .child_by_field_name("property")
                    .ok_or_else(|| {
                        TranspileError::Parse("member_expression missing property".into())
                    })?;

                let obj_name = self.get_call_name(object)?;
                let prop_name = self.node_text(property);

                Ok(format!("{}.{}", obj_name, prop_name))
            }
            _ => Err(TranspileError::Unsupported(format!(
                "call target type '{}'",
                node.kind()
            ))),
        }
    }

    fn transpile_member_expr(&self, node: Node) -> Result<SExpr, TranspileError> {
        let object = node
            .child_by_field_name("object")
            .ok_or_else(|| TranspileError::Parse("member_expression missing object".into()))?;
        let property = node
            .child_by_field_name("property")
            .ok_or_else(|| TranspileError::Parse("member_expression missing property".into()))?;

        let obj_expr = self.transpile_node(object)?;
        let prop_name = self.node_text(property);

        Ok(SExpr::call(
            "obj.get",
            vec![obj_expr, SExpr::string(prop_name)],
        ))
    }

    fn transpile_subscript_expr(&self, node: Node) -> Result<SExpr, TranspileError> {
        let object = node
            .child_by_field_name("object")
            .ok_or_else(|| TranspileError::Parse("subscript_expression missing object".into()))?;
        let index = node
            .child_by_field_name("index")
            .ok_or_else(|| TranspileError::Parse("subscript_expression missing index".into()))?;

        let obj_expr = self.transpile_node(object)?;
        let idx_expr = self.transpile_node(index)?;

        // Use list.get for arrays, obj.get for objects (we can't know at transpile time)
        Ok(SExpr::call("list.get", vec![obj_expr, idx_expr]))
    }

    fn transpile_array(&self, node: Node) -> Result<SExpr, TranspileError> {
        let mut elements = Vec::new();
        let mut cursor = node.walk();

        for child in node.children(&mut cursor) {
            if child.is_named() {
                elements.push(self.transpile_node(child)?);
            }
        }

        Ok(SExpr::call("list.new", elements))
    }

    fn transpile_object(&self, node: Node) -> Result<SExpr, TranspileError> {
        let mut pairs = Vec::new();
        let mut cursor = node.walk();

        for child in node.children(&mut cursor) {
            if child.kind() == "pair" {
                let key = child
                    .child_by_field_name("key")
                    .ok_or_else(|| TranspileError::Parse("pair missing key".into()))?;
                let value = child
                    .child_by_field_name("value")
                    .ok_or_else(|| TranspileError::Parse("pair missing value".into()))?;

                let key_str = match key.kind() {
                    "property_identifier" | "identifier" => self.node_text(key).to_string(),
                    "string" => {
                        let text = self.node_text(key);
                        text[1..text.len() - 1].to_string()
                    }
                    _ => {
                        return Err(TranspileError::Unsupported(format!(
                            "object key type '{}'",
                            key.kind()
                        )))
                    }
                };

                pairs.push(SExpr::string(key_str));
                pairs.push(self.transpile_node(value)?);
            } else if child.kind() == "shorthand_property_identifier" {
                // { foo } is shorthand for { foo: foo }
                let name = self.node_text(child);
                pairs.push(SExpr::string(name));
                pairs.push(SExpr::call("std.var", vec![SExpr::string(name)]));
            }
        }

        Ok(SExpr::call("obj.new", pairs))
    }

    fn transpile_arrow_function(&self, node: Node) -> Result<SExpr, TranspileError> {
        let mut param_names = Vec::new();

        // Try "parameters" field first (for parenthesized params)
        if let Some(params) = node.child_by_field_name("parameters") {
            self.collect_params(params, &mut param_names);
        }
        // Try "parameter" field (for single unparenthesized param: x => ...)
        if let Some(param) = node.child_by_field_name("parameter") {
            if param.kind() == "identifier" {
                param_names.push(SExpr::string(self.node_text(param)));
            }
        }

        // Get body
        let body = node
            .child_by_field_name("body")
            .ok_or_else(|| TranspileError::Parse("arrow_function missing body".into()))?;

        let body_expr = self.transpile_node(body)?;

        // Create std.fn: ["std.fn", [...params], body]
        Ok(SExpr::call(
            "std.fn",
            vec![SExpr::List(param_names), body_expr],
        ))
    }

    fn collect_params(&self, params: Node, param_names: &mut Vec<SExpr>) {
        match params.kind() {
            "identifier" => {
                param_names.push(SExpr::string(self.node_text(params)));
            }
            "formal_parameters" => {
                let mut cursor = params.walk();
                for child in params.children(&mut cursor) {
                    if child.kind() == "identifier" {
                        param_names.push(SExpr::string(self.node_text(child)));
                    } else if child.kind() == "required_parameter" {
                        if let Some(pattern) = child.child_by_field_name("pattern") {
                            param_names.push(SExpr::string(self.node_text(pattern)));
                        }
                    }
                }
            }
            _ => {}
        }
    }

    fn transpile_ternary(&self, node: Node) -> Result<SExpr, TranspileError> {
        let condition = node
            .child_by_field_name("condition")
            .ok_or_else(|| TranspileError::Parse("ternary missing condition".into()))?;
        let consequence = node
            .child_by_field_name("consequence")
            .ok_or_else(|| TranspileError::Parse("ternary missing consequence".into()))?;
        let alternative = node
            .child_by_field_name("alternative")
            .ok_or_else(|| TranspileError::Parse("ternary missing alternative".into()))?;

        Ok(SExpr::call(
            "std.if",
            vec![
                self.transpile_node(condition)?,
                self.transpile_node(consequence)?,
                self.transpile_node(alternative)?,
            ],
        ))
    }

    fn transpile_expression_statement(&self, node: Node) -> Result<SExpr, TranspileError> {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.is_named() {
                return self.transpile_node(child);
            }
        }
        Ok(SExpr::Null)
    }

    fn transpile_lexical_declaration(&self, node: Node) -> Result<SExpr, TranspileError> {
        // let x = 1, y = 2; -> ["std.seq", ["std.let", "x", 1], ["std.let", "y", 2]]
        let mut declarations = Vec::new();
        let mut cursor = node.walk();

        for child in node.children(&mut cursor) {
            if child.kind() == "variable_declarator" {
                declarations.push(self.transpile_variable_declarator(child)?);
            }
        }

        if declarations.len() == 1 {
            Ok(declarations.remove(0))
        } else {
            Ok(SExpr::call("std.seq", declarations))
        }
    }

    fn transpile_variable_declaration(&self, node: Node) -> Result<SExpr, TranspileError> {
        // var x = 1; (same as let for our purposes)
        self.transpile_lexical_declaration(node)
    }

    fn transpile_variable_declarator(&self, node: Node) -> Result<SExpr, TranspileError> {
        let name = node
            .child_by_field_name("name")
            .ok_or_else(|| TranspileError::Parse("variable_declarator missing name".into()))?;
        let value = node.child_by_field_name("value");

        let name_str = self.node_text(name);
        let value_expr = if let Some(val) = value {
            self.transpile_node(val)?
        } else {
            SExpr::Null
        };

        Ok(SExpr::call(
            "std.let",
            vec![SExpr::string(name_str), value_expr],
        ))
    }

    fn transpile_if_statement(&self, node: Node) -> Result<SExpr, TranspileError> {
        let condition = node
            .child_by_field_name("condition")
            .ok_or_else(|| TranspileError::Parse("if_statement missing condition".into()))?;
        let consequence = node
            .child_by_field_name("consequence")
            .ok_or_else(|| TranspileError::Parse("if_statement missing consequence".into()))?;
        let alternative = node.child_by_field_name("alternative");

        // Condition is a parenthesized_expression, get the inner expression
        let cond_expr = self.transpile_node(condition)?;
        let then_expr = self.transpile_node(consequence)?;

        if let Some(alt) = alternative {
            let else_expr = self.transpile_else_clause(alt)?;
            Ok(SExpr::call("std.if", vec![cond_expr, then_expr, else_expr]))
        } else {
            Ok(SExpr::call("std.if", vec![cond_expr, then_expr]))
        }
    }

    fn transpile_else_clause(&self, node: Node) -> Result<SExpr, TranspileError> {
        // else_clause contains: "else" keyword + body (statement_block or if_statement for else-if)
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.is_named() {
                return self.transpile_node(child);
            }
        }
        Ok(SExpr::Null)
    }

    fn transpile_return_statement(&self, node: Node) -> Result<SExpr, TranspileError> {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.is_named() && child.kind() != "return" {
                return self.transpile_node(child);
            }
        }
        // Return with no value
        Ok(SExpr::Null)
    }

    fn transpile_block(&self, node: Node) -> Result<SExpr, TranspileError> {
        let mut statements = Vec::new();
        let mut cursor = node.walk();

        for child in node.children(&mut cursor) {
            if child.is_named() {
                let stmt = self.transpile_node(child)?;
                // Skip null statements (comments, empty statements)
                if !stmt.is_null() {
                    statements.push(stmt);
                }
            }
        }

        if statements.is_empty() {
            Ok(SExpr::Null)
        } else if statements.len() == 1 {
            Ok(statements.remove(0))
        } else {
            Ok(SExpr::call("std.seq", statements))
        }
    }
}
