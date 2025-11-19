//! WASM bindings for Ruvector

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn hello() -> String {
    "Hello from Ruvector WASM!".to_string()
}
