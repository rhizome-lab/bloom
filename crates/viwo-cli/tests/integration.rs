//! Integration tests for the full TypeScript → S-expr → Lua pipeline.

use viwo_runtime_luajit::execute;
use viwo_syntax_typescript::transpile;

/// Helper to run TypeScript through the full pipeline and return the result.
fn eval_ts(source: &str) -> serde_json::Value {
    let sexpr = transpile(source).expect("transpile failed");
    execute(&sexpr).expect("execute failed")
}

/// Assert numeric equality (handles LuaJIT returning integers).
fn assert_num(actual: serde_json::Value, expected: f64) {
    let n = actual.as_f64().expect("expected number");
    assert!((n - expected).abs() < f64::EPSILON, "expected {}, got {}", expected, n);
}

#[test]
fn test_arithmetic() {
    assert_num(eval_ts("1 + 2"), 3.0);
    assert_num(eval_ts("10 - 3"), 7.0);
    assert_num(eval_ts("4 * 5"), 20.0);
    assert_num(eval_ts("15 / 3"), 5.0);
    assert_num(eval_ts("17 % 5"), 2.0);
}

#[test]
fn test_nested_arithmetic() {
    assert_num(eval_ts("(1 + 2) * 3"), 9.0);
    assert_num(eval_ts("10 / (2 + 3)"), 2.0);
}

#[test]
fn test_variables() {
    assert_num(eval_ts("let x = 10; x"), 10.0);
    assert_num(eval_ts("let x = 5; let y = 3; x + y"), 8.0);
}

#[test]
fn test_comparison() {
    assert_eq!(eval_ts("5 > 3"), serde_json::json!(true));
    assert_eq!(eval_ts("2 < 1"), serde_json::json!(false));
    assert_eq!(eval_ts("5 >= 5"), serde_json::json!(true));
    assert_eq!(eval_ts("5 == 5"), serde_json::json!(true));
}

#[test]
fn test_logical_operators() {
    assert_eq!(eval_ts("true && true"), serde_json::json!(true));
    assert_eq!(eval_ts("true && false"), serde_json::json!(false));
    assert_eq!(eval_ts("false || true"), serde_json::json!(true));
    assert_eq!(eval_ts("!true"), serde_json::json!(false));
}

#[test]
fn test_string_literals() {
    assert_eq!(eval_ts("\"hello\""), serde_json::json!("hello"));
    assert_eq!(eval_ts("'world'"), serde_json::json!("world"));
}

#[test]
fn test_boolean_literals() {
    assert_eq!(eval_ts("true"), serde_json::json!(true));
    assert_eq!(eval_ts("false"), serde_json::json!(false));
}

#[test]
fn test_null() {
    assert_eq!(eval_ts("null"), serde_json::Value::Null);
}

#[test]
fn test_arrays() {
    let result = eval_ts("[1, 2, 3]");
    let arr = result.as_array().expect("expected array");
    assert_eq!(arr.len(), 3);
    assert_num(arr[0].clone(), 1.0);
    assert_num(arr[1].clone(), 2.0);
    assert_num(arr[2].clone(), 3.0);
}

#[test]
fn test_objects() {
    let result = eval_ts("{ x: 1, y: 2 }");
    let obj = result.as_object().expect("expected object");
    assert_num(obj.get("x").unwrap().clone(), 1.0);
    assert_num(obj.get("y").unwrap().clone(), 2.0);
}
