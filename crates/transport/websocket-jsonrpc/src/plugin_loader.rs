//! Dynamic plugin loading.

use std::path::Path;

use libloading::Library;
use thiserror::Error;

/// Errors that can occur during plugin loading.
#[derive(Debug, Error)]
pub enum PluginError {
    #[error("failed to load library: {0}")]
    LoadError(#[from] libloading::Error),

    #[error("plugin initialization failed: {0}")]
    InitError(String),

    #[error("plugin not found: {0}")]
    NotFound(String),
}

/// A loaded plugin.
pub struct LoadedPlugin {
    /// The plugin name.
    pub name: String,
    /// The dynamic library handle (kept alive to prevent unloading).
    #[allow(dead_code)]
    library: Library,
}

/// Plugin loader for dynamic libraries.
pub struct PluginLoader {
    /// Loaded plugins.
    plugins: Vec<LoadedPlugin>,
}

impl PluginLoader {
    /// Create a new plugin loader.
    pub fn new() -> Self {
        Self {
            plugins: Vec::new(),
        }
    }

    /// Load a plugin from a dynamic library path.
    ///
    /// # Safety
    /// Loading plugins from dynamic libraries is inherently unsafe.
    /// Only load plugins from trusted sources.
    pub unsafe fn load(&mut self, path: impl AsRef<Path>) -> Result<(), PluginError> {
        let path = path.as_ref();
        // SAFETY: Caller guarantees the library is trusted and safe to load.
        let library = unsafe { Library::new(path)? };

        // TODO: Get plugin metadata via abi_stable interface
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        self.plugins.push(LoadedPlugin { name, library });

        Ok(())
    }

    /// Get the list of loaded plugin names.
    pub fn plugin_names(&self) -> Vec<&str> {
        self.plugins.iter().map(|p| p.name.as_str()).collect()
    }

    /// Get the number of loaded plugins.
    pub fn count(&self) -> usize {
        self.plugins.len()
    }
}

impl Default for PluginLoader {
    fn default() -> Self {
        Self::new()
    }
}
