//! Node.js bindings for Ruvector via NAPI-RS

#![deny(clippy::all)]

use napi_derive::napi;

#[napi]
pub fn hello() -> String {
  "Hello from Ruvector Node.js bindings!".to_string()
}
