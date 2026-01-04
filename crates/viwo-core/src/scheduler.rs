//! Task scheduler for deferred verb execution.

use std::sync::Arc;
use tokio::sync::Mutex;

use crate::{EntityId, WorldStorage};

/// Task scheduler manages delayed verb executions.
pub struct Scheduler {
    storage: Arc<Mutex<WorldStorage>>,
}

impl Scheduler {
    /// Create a new scheduler.
    pub fn new(storage: Arc<Mutex<WorldStorage>>) -> Self {
        Self { storage }
    }

    /// Schedule a task for future execution.
    pub async fn schedule(
        &self,
        entity_id: EntityId,
        verb: &str,
        args: serde_json::Value,
        delay_ms: i64,
    ) -> Result<i64, crate::StorageError> {
        let execute_at = Self::now_ms() + delay_ms;
        let storage = self.storage.lock().await;
        storage.schedule_task(entity_id, verb, args, execute_at)
    }

    /// Process all due tasks.
    pub async fn process(&self) -> Result<Vec<crate::ScheduledTask>, crate::StorageError> {
        let now = Self::now_ms();
        let storage = self.storage.lock().await;
        let tasks = storage.get_due_tasks(now)?;

        // Delete processed tasks
        for task in &tasks {
            storage.delete_task(task.id)?;
        }

        Ok(tasks)
    }

    /// Get current time in milliseconds.
    fn now_ms() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_schedule_and_process() {
        let storage = Arc::new(Mutex::new(WorldStorage::in_memory().unwrap()));
        let scheduler = Scheduler::new(storage.clone());

        // Create a test entity
        let entity_id = {
            let storage = storage.lock().await;
            storage
                .create_entity(serde_json::json!({"name": "Test"}), None)
                .unwrap()
        };

        // Schedule a task
        scheduler
            .schedule(
                entity_id,
                "test_verb",
                serde_json::json!([1, 2, 3]),
                0, // Execute immediately
            )
            .await
            .unwrap();

        // Process tasks
        let tasks = scheduler.process().await.unwrap();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].entity_id, entity_id);
        assert_eq!(tasks[0].verb, "test_verb");

        // Tasks should be deleted after processing
        let tasks = scheduler.process().await.unwrap();
        assert_eq!(tasks.len(), 0);
    }
}
