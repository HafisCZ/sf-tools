//! SFTools simulator engine.

#![allow(static_mut_refs)]

mod fight;
mod fighter;
mod input;
mod log;
mod rng;

mod simulators {
    pub mod dungeons;
    pub mod players;
}

use serde::Deserialize;
use simulators::{dungeons, players};

#[derive(Deserialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
enum Request {
    Dungeons(dungeons::DungeonsRequest),
    Players(Box<players::PlayersRequest>),
}

static mut INPUT: Vec<u8> = Vec::new();
static mut OUTPUT: Vec<u8> = Vec::new();

/// Makes room for a request of `length` bytes and returns where to write it.
#[no_mangle]
pub extern "C" fn alloc(length: u32) -> *mut u8 {
    unsafe {
        INPUT.clear();
        INPUT.resize(length as usize, 0);
        INPUT.as_mut_ptr()
    }
}

/// Runs the request written after `alloc` and returns where the JSON result starts.
#[no_mangle]
pub extern "C" fn run(length: u32) -> *const u8 {
    let request = unsafe { &INPUT[..length as usize] };

    let result = match serde_json::from_slice::<Request>(request) {
        Ok(Request::Dungeons(request)) => dungeons::run(request)
            .and_then(|result| serde_json::to_vec(&result).map_err(|error| error.to_string())),
        Ok(Request::Players(request)) => {
            serde_json::to_vec(&players::run(*request)).map_err(|error| error.to_string())
        }
        Err(error) => Err(format!("Invalid engine request: {error}")),
    };

    // Errors come back as {"error": "..."}
    let output = result.unwrap_or_else(|message| {
        serde_json::to_vec(&serde_json::json!({ "error": message })).unwrap_or_default()
    });

    unsafe {
        OUTPUT = output;
        OUTPUT.as_ptr()
    }
}

/// Length of the last result in bytes.
#[no_mangle]
pub extern "C" fn result_length() -> u32 {
    unsafe { OUTPUT.len() as u32 }
}
