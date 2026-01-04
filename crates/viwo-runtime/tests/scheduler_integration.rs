//! Scheduler integration tests.

use serde_json::json;
use viwo_core::WorldStorage;
use viwo_ir::SExpr;
use viwo_runtime::ViwoRuntime;

#[tokio::test]
async fn test_schedule_and_process_task() {
    let storage = WorldStorage::in_memory().unwrap();
    let runtime = ViwoRuntime::new(storage);

    // Create entity
    let entity_id = {
        let storage = runtime.storage().lock().await;
        storage
            .create_entity(json!({"name": "Test", "count": 0}), None)
            .unwrap()
    };

    // Add a verb that returns a value
    {
        let storage = runtime.storage().lock().await;
        storage
            .add_verb(entity_id, "task", &SExpr::number(42))
            .unwrap();
    }

    // Schedule task
    runtime
        .scheduler()
        .schedule(entity_id, "task", json!([]), 0)
        .await
        .unwrap();

    // Process should find and delete the task
    let tasks = runtime.scheduler().process().await.unwrap();

    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0].entity_id, entity_id);
    assert_eq!(tasks[0].verb, "task");

    // Second process should find nothing
    let tasks = runtime.scheduler().process().await.unwrap();
    assert_eq!(tasks.len(), 0);
}

#[tokio::test]
async fn test_future_task_not_processed() {
    let storage = WorldStorage::in_memory().unwrap();
    let runtime = ViwoRuntime::new(storage);

    let entity_id = {
        let storage = runtime.storage().lock().await;
        storage.create_entity(json!({"name": "Test"}), None).unwrap()
    };

    {
        let storage = runtime.storage().lock().await;
        storage
            .add_verb(entity_id, "future", &SExpr::null())
            .unwrap();
    }

    // Schedule far in future (1 hour from now)
    runtime
        .scheduler()
        .schedule(entity_id, "future", json!([]), 3600000)
        .await
        .unwrap();

    // Should not be processed yet
    let tasks = runtime.scheduler().process().await.unwrap();
    assert_eq!(tasks.len(), 0);
}

#[tokio::test]
async fn test_multiple_tasks() {
    let storage = WorldStorage::in_memory().unwrap();
    let runtime = ViwoRuntime::new(storage);

    let entity_id = {
        let storage = runtime.storage().lock().await;
        let id = storage.create_entity(json!({"name": "Test"}), None).unwrap();
        storage.add_verb(id, "task1", &SExpr::number(1)).unwrap();
        storage.add_verb(id, "task2", &SExpr::number(2)).unwrap();
        id
    };

    // Schedule multiple tasks
    runtime
        .scheduler()
        .schedule(entity_id, "task1", json!([]), 0)
        .await
        .unwrap();
    runtime
        .scheduler()
        .schedule(entity_id, "task2", json!([]), 0)
        .await
        .unwrap();

    // Process should get both
    let tasks = runtime.scheduler().process().await.unwrap();
    assert_eq!(tasks.len(), 2);

    // Verify different verbs
    let verbs: Vec<&str> = tasks.iter().map(|t| t.verb.as_str()).collect();
    assert!(verbs.contains(&"task1"));
    assert!(verbs.contains(&"task2"));
}
