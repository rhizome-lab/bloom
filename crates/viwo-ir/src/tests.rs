//! Tests for viwo-ir.

use crate::SExpr;

#[test]
fn test_sexpr_constructors() {
    assert_eq!(SExpr::null(), SExpr::Null);
    assert_eq!(SExpr::bool(true), SExpr::Bool(true));
    assert_eq!(SExpr::number(42), SExpr::Number(42.0));
    assert_eq!(SExpr::string("hello"), SExpr::String("hello".into()));
}

#[test]
fn test_sexpr_call() {
    let expr = SExpr::call("std.let", vec![
        SExpr::string("x"),
        SExpr::number(10),
    ]);

    assert!(expr.is_call());
    assert_eq!(expr.opcode(), Some("std.let"));

    let args = expr.args().unwrap();
    assert_eq!(args.len(), 2);
    assert_eq!(args[0].as_str(), Some("x"));
    assert_eq!(args[1].as_number(), Some(10.0));
}

#[test]
fn test_sexpr_accessors() {
    assert_eq!(SExpr::Bool(true).as_bool(), Some(true));
    assert_eq!(SExpr::Number(3.14).as_number(), Some(3.14));
    assert_eq!(SExpr::String("test".into()).as_str(), Some("test"));

    // Wrong type returns None
    assert_eq!(SExpr::Bool(true).as_number(), None);
    assert_eq!(SExpr::Number(42.0).as_str(), None);
}

#[test]
fn test_sexpr_from_impls() {
    let _: SExpr = true.into();
    let _: SExpr = 42i32.into();
    let _: SExpr = 42i64.into();
    let _: SExpr = 3.14f64.into();
    let _: SExpr = "hello".into();
    let _: SExpr = String::from("world").into();
}

#[test]
fn test_sexpr_json_roundtrip() {
    let expr = SExpr::call("std.seq", vec![
        SExpr::call("std.let", vec![SExpr::string("x"), SExpr::number(10)]),
        SExpr::call("math.add", vec![
            SExpr::call("std.var", vec![SExpr::string("x")]),
            SExpr::number(5),
        ]),
    ]);

    let json = serde_json::to_string(&expr).unwrap();
    let parsed: SExpr = serde_json::from_str(&json).unwrap();

    assert_eq!(expr, parsed);
}

#[test]
fn test_sexpr_parse_from_json() {
    let json = r#"["std.if", true, ["std.let", "x", 1], ["std.let", "x", 2]]"#;
    let expr: SExpr = serde_json::from_str(json).unwrap();

    assert_eq!(expr.opcode(), Some("std.if"));
    let args = expr.args().unwrap();
    assert_eq!(args.len(), 3);
    assert_eq!(args[0].as_bool(), Some(true));
}

#[test]
fn test_sexpr_parse_object() {
    let json = r#"{"name": "test", "value": 42}"#;
    let expr: SExpr = serde_json::from_str(json).unwrap();

    let obj = expr.as_object().unwrap();
    assert_eq!(obj.get("name").and_then(|v| v.as_str()), Some("test"));
    assert_eq!(obj.get("value").and_then(|v| v.as_number()), Some(42.0));
}

#[test]
fn test_sexpr_null_handling() {
    let json = "null";
    let expr: SExpr = serde_json::from_str(json).unwrap();
    assert!(expr.is_null());

    // Null in array
    let json = r#"["std.let", "x", null]"#;
    let expr: SExpr = serde_json::from_str(json).unwrap();
    let args = expr.args().unwrap();
    assert!(args[1].is_null());
}
