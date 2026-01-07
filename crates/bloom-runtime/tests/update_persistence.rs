//! Test that the update opcode persists entity changes correctly.

use bloom_ir::SExpr;
use bloom_runtime::BloomRuntime;
use std::sync::Arc;

#[test]
fn test_update_persists_counter() {
    let test_dir = std::env::temp_dir().join("bloom-test-update-persist");
    let db_path = test_dir.join("test.db");
    let _ = std::fs::remove_dir_all(&test_dir);
    std::fs::create_dir_all(&test_dir).unwrap();

    let runtime = Arc::new(BloomRuntime::open(db_path.to_str().unwrap()).unwrap());

    // Create entity with counter
    let entity_id = {
        let storage = runtime.storage().lock().unwrap();
        storage
            .create_entity(serde_json::json!({"name": "Test", "counter": 0}), None)
            .unwrap()
    };
    println!("Created entity {}", entity_id);

    // Verb that increments counter using update opcode
    let increment_verb = SExpr::call(
        "std.seq",
        vec![
            // Get current counter value
            SExpr::call(
                "std.let",
                vec![
                    SExpr::string("current").erase_type(),
                    SExpr::call(
                        "bool.guard",
                        vec![
                            SExpr::call(
                                "obj.get",
                                vec![
                                    SExpr::call("entity", vec![SExpr::call("std.caller", vec![])]),
                                    SExpr::string("counter").erase_type(),
                                ],
                            ),
                            SExpr::number(0).erase_type(),
                        ],
                    ),
                ],
            ),
            // Increment
            SExpr::call(
                "std.let",
                vec![
                    SExpr::string("new_val").erase_type(),
                    SExpr::call(
                        "math.add",
                        vec![
                            SExpr::call("std.var", vec![SExpr::string("current").erase_type()]),
                            SExpr::number(1).erase_type(),
                        ],
                    ),
                ],
            ),
            // Persist using update opcode
            SExpr::call(
                "update",
                vec![
                    SExpr::call("std.caller", vec![]),
                    SExpr::call(
                        "obj.new",
                        vec![
                            SExpr::list(vec![
                                SExpr::string("counter").erase_type(),
                                SExpr::call("std.var", vec![SExpr::string("new_val").erase_type()]),
                            ])
                            .erase_type(),
                        ],
                    ),
                ],
            ),
            // Return new value
            SExpr::call("std.var", vec![SExpr::string("new_val").erase_type()]),
        ],
    );

    // Add verb to entity
    {
        let storage = runtime.storage().lock().unwrap();
        storage
            .add_verb(entity_id, "increment", &increment_verb)
            .unwrap();
    }

    // Call increment 3 times
    for i in 1..=3 {
        let result = runtime
            .execute_verb(entity_id, "increment", vec![], Some(entity_id))
            .unwrap();
        println!("Call {}: returned {}", i, result);

        // Check persisted value
        let storage = runtime.storage().lock().unwrap();
        let entity = storage.get_entity(entity_id).unwrap().unwrap();
        let counter = entity
            .props
            .get("counter")
            .and_then(|v| v.as_i64())
            .unwrap_or(-1);
        println!("  Persisted counter: {}", counter);

        assert_eq!(counter, i, "Counter should be {} after {} increments", i, i);
    }

    std::fs::remove_dir_all(&test_dir).ok();
}
