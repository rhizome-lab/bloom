//! Network plugin for Viwo with capability-based security.

use std::collections::HashMap;

/// Validate that a capability grants access to a URL
fn validate_capability(
    capability: &serde_json::Value,
    current_entity_id: i64,
    requested_url: &str,
) -> Result<(), String> {
    // Check ownership
    let owner_id = capability["owner_id"]
        .as_i64()
        .ok_or("net: capability missing owner_id")?;
    if owner_id != current_entity_id {
        return Err("net: capability does not belong to current entity".to_string());
    }

    // Check domain/URL pattern
    let allowed_pattern = capability["params"]["url"]
        .as_str()
        .ok_or("net: capability missing url parameter")?;

    // Wildcard support: "*" allows all URLs
    if allowed_pattern == "*" {
        return Ok(());
    }

    // Check if URL starts with allowed pattern
    if !requested_url.starts_with(allowed_pattern) {
        return Err(format!(
            "net: URL '{}' not allowed by capability (pattern: '{}')",
            requested_url, allowed_pattern
        ));
    }

    Ok(())
}

/// HTTP GET request
pub async fn net_get(
    capability: &serde_json::Value,
    entity_id: i64,
    url: &str,
    headers: HashMap<String, String>,
) -> Result<serde_json::Value, String> {
    validate_capability(capability, entity_id, url)?;

    let client = reqwest::Client::new();
    let mut request = client.get(url);

    for (key, value) in headers {
        request = request.header(key, value);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("net.get request failed: {}", e))?;

    let status = response.status().as_u16();
    let headers_map: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let body = response
        .text()
        .await
        .map_err(|e| format!("net.get failed to read response body: {}", e))?;

    Ok(serde_json::json!({
        "status": status,
        "headers": headers_map,
        "body": body,
    }))
}

/// HTTP POST request
pub async fn net_post(
    capability: &serde_json::Value,
    entity_id: i64,
    url: &str,
    headers: HashMap<String, String>,
    body: &str,
) -> Result<serde_json::Value, String> {
    validate_capability(capability, entity_id, url)?;

    let client = reqwest::Client::new();
    let mut request = client.post(url).body(body.to_string());

    for (key, value) in headers {
        request = request.header(key, value);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("net.post request failed: {}", e))?;

    let status = response.status().as_u16();
    let headers_map: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let response_body = response
        .text()
        .await
        .map_err(|e| format!("net.post failed to read response body: {}", e))?;

    Ok(serde_json::json!({
        "status": status,
        "headers": headers_map,
        "body": response_body,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_capability(owner_id: i64, url_pattern: &str) -> serde_json::Value {
        serde_json::json!({
            "owner_id": owner_id,
            "params": {
                "url": url_pattern
            }
        })
    }

    #[tokio::test]
    async fn test_net_get_httpbin() {
        let cap = create_test_capability(1, "https://httpbin.org");

        let result = net_get(&cap, 1, "https://httpbin.org/get", HashMap::new()).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response["status"], 200);
        assert!(response["body"].as_str().unwrap().contains("httpbin"));
    }

    #[tokio::test]
    async fn test_net_post_httpbin() {
        let cap = create_test_capability(1, "https://httpbin.org");

        let result = net_post(
            &cap,
            1,
            "https://httpbin.org/post",
            HashMap::new(),
            "test data",
        )
        .await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response["status"], 200);
    }

    #[tokio::test]
    async fn test_net_capability_validation() {
        let cap = create_test_capability(1, "https://allowed.com");

        // Try different domain
        let result = net_get(&cap, 1, "https://forbidden.com/path", HashMap::new()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not allowed"));

        // Try wrong entity ID
        let result = net_get(&cap, 2, "https://allowed.com/path", HashMap::new()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not belong"));
    }

    #[tokio::test]
    async fn test_net_wildcard_capability() {
        let cap = create_test_capability(1, "*");

        // Should allow any URL
        let result = net_get(&cap, 1, "https://httpbin.org/get", HashMap::new()).await;
        assert!(result.is_ok());
    }
}
