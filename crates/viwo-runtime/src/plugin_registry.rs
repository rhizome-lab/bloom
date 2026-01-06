//! Plugin function registry for dynamic opcode dispatch.
//!
//! This allows plugins to register functions that can be called from Lua scripts.

use std::collections::HashMap;
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::Mutex;

/// Type for plugin functions that take JSON input and return JSON output.
///
/// # Safety
/// - input_json must be a valid null-terminated UTF-8 string
/// - The returned pointer must be freed by the caller using free_json_string
pub type PluginFunction = unsafe extern "C" fn(
    input_json: *const c_char,
    output_json: *mut *mut c_char,
) -> i32;

/// Global registry of plugin functions.
static PLUGIN_REGISTRY: Mutex<Option<HashMap<String, PluginFunction>>> = Mutex::new(None);

/// Initialize the plugin registry.
pub fn init_registry() {
    let mut registry = PLUGIN_REGISTRY.lock().unwrap();
    *registry = Some(HashMap::new());
}

/// Register a plugin function.
///
/// # Safety
/// The function pointer must remain valid for the lifetime of the program.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn register_plugin_function(
    name: *const c_char,
    func: PluginFunction,
) -> i32 {
    let name_str = match unsafe { CStr::from_ptr(name).to_str() } {
        Ok(s) => s,
        Err(_) => return -1,
    };

    let mut registry = PLUGIN_REGISTRY.lock().unwrap();
    if let Some(ref mut map) = *registry {
        map.insert(name_str.to_string(), func);
        0
    } else {
        -1
    }
}

/// Call a registered plugin function.
///
/// Returns the JSON output as a String, or an error.
pub fn call_plugin_function(name: &str, input: &serde_json::Value) -> Result<serde_json::Value, String> {
    let registry = PLUGIN_REGISTRY.lock().unwrap();
    let map = registry.as_ref().ok_or_else(|| "Plugin registry not initialized".to_string())?;

    let func = map.get(name).ok_or_else(|| format!("Plugin function '{}' not registered", name))?;

    // Serialize input to JSON string
    let input_json = serde_json::to_string(input)
        .map_err(|e| format!("Failed to serialize input: {}", e))?;
    let input_cstr = CString::new(input_json)
        .map_err(|e| format!("Failed to create C string: {}", e))?;

    // Call the plugin function
    let mut output_ptr: *mut c_char = std::ptr::null_mut();
    let result = unsafe {
        func(input_cstr.as_ptr(), &mut output_ptr)
    };

    if result != 0 {
        return Err(format!("Plugin function '{}' failed with code {}", name, result));
    }

    if output_ptr.is_null() {
        return Err(format!("Plugin function '{}' returned null output", name));
    }

    // Convert output to Rust string
    let output_str = unsafe {
        let cstr = CStr::from_ptr(output_ptr);
        let result = cstr.to_str()
            .map_err(|e| format!("Invalid UTF-8 in output: {}", e))?
            .to_string();

        // Free the C string
        free_json_string(output_ptr);
        result
    };

    // Parse JSON
    serde_json::from_str(&output_str)
        .map_err(|e| format!("Failed to parse output JSON: {}", e))
}

/// Free a JSON string allocated by a plugin.
///
/// # Safety
/// The pointer must have been allocated by a plugin via malloc/similar.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn free_json_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
}

/// Helper function for plugins to allocate a JSON string to return.
///
/// # Safety
/// The caller must free the returned pointer using free_json_string.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn alloc_json_string(json: *const c_char) -> *mut c_char {
    if json.is_null() {
        return std::ptr::null_mut();
    }

    match unsafe { CStr::from_ptr(json).to_str() } {
        Ok(s) => match CString::new(s) {
            Ok(cstring) => cstring.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}
